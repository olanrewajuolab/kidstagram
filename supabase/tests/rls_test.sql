-- Safety-rule tests. Run with supabase/tests/run.sh against a throwaway Postgres.
\set ON_ERROR_STOP on
set client_min_messages = notice;

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant usage on schema storage to authenticated;
grant usage on schema auth to authenticated;
grant execute on all functions in schema auth to authenticated;
grant select on auth.users to authenticated;
grant all on storage.objects to authenticated;

-- Expect a statement to fail with a message containing `expected`.
create or replace function pg_temp.expect_error(stmt text, expected text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'EXPECTED FAILURE (%) BUT SUCCEEDED: %', expected, stmt;
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' or position(expected in sqlerrm) = 0 then
    raise exception 'wrong error for %: % (wanted %)', stmt, sqlerrm, expected;
  end if;
end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'CHECK FAILED: %', label; end if;
  raise notice 'ok: %', label;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- Fixture: run as service role (superuser, auth.uid() null).
insert into auth.users values
  ('00000000-0000-0000-0000-0000000000a1'), -- parent A
  ('00000000-0000-0000-0000-0000000000b1'), -- parent B
  ('00000000-0000-0000-0000-0000000000a2'), -- Ada, 7 (little), child of A
  ('00000000-0000-0000-0000-0000000000a3'), -- Ali, 14 (teen), child of A
  ('00000000-0000-0000-0000-0000000000b2'), -- Bo, 10 (middle), child of B
  ('00000000-0000-0000-0000-0000000000c2'); -- Cy, 10, stranger (no parent link to others)
insert into auth.users values ('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (id, role, nickname) values
  ('00000000-0000-0000-0000-0000000000a1', 'parent', 'ParentA'),
  ('00000000-0000-0000-0000-0000000000b1', 'parent', 'ParentB'),
  ('00000000-0000-0000-0000-0000000000c1', 'parent', 'ParentC');
insert into public.profiles (id, role, nickname, parent_id, birth_month, friend_code) values
  ('00000000-0000-0000-0000-0000000000a2', 'child', 'Ada', '00000000-0000-0000-0000-0000000000a1', date_trunc('month', current_date - interval '7 years 2 months'), 'ADA111'),
  ('00000000-0000-0000-0000-0000000000a3', 'child', 'Ali', '00000000-0000-0000-0000-0000000000a1', date_trunc('month', current_date - interval '14 years 2 months'), 'ALI111'),
  ('00000000-0000-0000-0000-0000000000b2', 'child', 'Bo',  '00000000-0000-0000-0000-0000000000b1', date_trunc('month', current_date - interval '10 years 2 months'), 'BOB111'),
  ('00000000-0000-0000-0000-0000000000c2', 'child', 'Cy',  '00000000-0000-0000-0000-0000000000c1', date_trunc('month', current_date - interval '10 years 2 months'), 'CYC111');

select pg_temp.check(public.age_band(birth_month) = 'little', 'age band little') from profiles where nickname = 'Ada';
select pg_temp.check(public.age_band(birth_month) = 'middle', 'age band middle') from profiles where nickname = 'Bo';
select pg_temp.check(public.age_band(birth_month) = 'teen', 'age band teen') from profiles where nickname = 'Ali';

-- ---- Bo (10) creates a project and requests Ada as a friend
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
set role authenticated;
insert into projects (id, owner_id, kind, title, description, visibility)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', 'game', 'Space Jump', 'A jumping game in space', 'friends');
select pg_temp.expect_error($$insert into projects (owner_id, kind, title) values ('00000000-0000-0000-0000-0000000000b2','show','email me at bo@example.com')$$, 'text_blocked:email');
select pg_temp.expect_error($$insert into projects (owner_id, kind, title) values ('00000000-0000-0000-0000-0000000000b2','show','call 0207 123 4567')$$, 'text_blocked:phone');
select pg_temp.expect_error($$insert into projects (owner_id, kind, title) values ('00000000-0000-0000-0000-0000000000b2','show','add me on snapchat')$$, 'text_blocked:social');
select pg_temp.expect_error($$insert into projects (owner_id, kind, title) values ('00000000-0000-0000-0000-0000000000a2','show','not mine')$$, 'row-level security');
select pg_temp.expect_error($$update profiles set role = 'moderator' where id = auth.uid()$$, 'locked_field');
select pg_temp.expect_error($$update profiles set status = 'paused' where id = auth.uid()$$, 'parent_only');
select pg_temp.expect_error($$update projects set moderation = 'removed' where id = '10000000-0000-0000-0000-000000000001'$$, 'moderator_only');
select public.request_friend('ada111');
select pg_temp.expect_error($$update friendships set requester_parent_ok = true$$, 'parent_only');
select pg_temp.check((select count(*) from profiles where nickname = 'Cy') = 0, 'Bo cannot see stranger Cy');
select pg_temp.check((select count(*) from profiles where nickname = 'Ada') = 1, 'Bo sees Ada via pending request');
reset role;

-- ---- Ada (7) cannot see Bo's project yet
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select pg_temp.check((select count(*) from projects) = 0, 'Ada cannot see Bo project before friendship');
update friendships set addressee_accepted = true;
select pg_temp.check((select status from friendships) = 'pending', 'still pending: parents must approve under-13s');
reset role;

-- ---- Parents approve
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
update friendships set requester_parent_ok = true;
select pg_temp.expect_error($$update friendships set addressee_parent_ok = true$$, 'parent_only');
select pg_temp.check((select count(*) from projects) = 1, 'Parent B sees child project');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
update friendships set addressee_parent_ok = true;
select pg_temp.check((select status from friendships) = 'accepted', 'friendship accepted after both parents approve');
select pg_temp.expect_error($$insert into projects (owner_id, kind, title) values ('00000000-0000-0000-0000-0000000000a1','show','parents cannot post')$$, 'row-level security');
reset role;

-- ---- Ada sees project, can only post presets
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select pg_temp.check((select count(*) from projects) = 1, 'Ada sees friend project');
select pg_temp.expect_error($$insert into comments (project_id, author_id, body) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'hi there')$$, 'presets_only');
insert into comments (project_id, author_id, preset_key, body) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'love_it', 'sneaky custom text');
select pg_temp.check((select body from comments limit 1) = 'I love it! ❤️', 'preset body forced from server table');
reset role;

-- ---- Bo adds Ada as helper; Cy (stranger) cannot be added; Cy sees nothing
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
set role authenticated;
insert into project_helpers values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_error($$insert into project_helpers values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2')$$, 'helper_must_be_friend');
insert into comments (project_id, author_id, body) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'Thanks Ada!');
select pg_temp.expect_error($$insert into comments (project_id, author_id, body) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'what school do you go to')$$, 'text_blocked:personal');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
insert into project_steps (project_id, author_id, position, body) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 1, 'Draw the rocket');
insert into reports (reporter_id, target_type, target_id, reason) select auth.uid(), 'comment', id, 'mean' from comments where body = 'Thanks Ada!';
reset role;
select pg_temp.check((select moderation from comments where body = 'Thanks Ada!') = 'flagged', 'reported comment gets flagged');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', false);
set role authenticated;
select pg_temp.check((select count(*) from projects) = 0, 'stranger sees no projects');
select pg_temp.check((select count(*) from comments) = 0, 'stranger sees no comments');
select pg_temp.check((select count(*) from profiles) = 2, 'stranger only sees self and own parent');
select pg_temp.expect_error($$select public.request_friend('NOPE00')$$, 'code_not_found');
reset role;

-- ---- Parent pauses child: child can no longer post
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
update profiles set status = 'paused' where id = '00000000-0000-0000-0000-0000000000b2';
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
set role authenticated;
select pg_temp.expect_error($$insert into projects (owner_id, kind, title) values (auth.uid(),'show','paused')$$, 'row-level security');
reset role;

-- ---- Building games and shows: owner and helpers save content; text inside is filtered
reset role;
select set_config('request.jwt.claim.sub', '', false);
update profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000b2';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
set role authenticated;
select public.save_project_content('10000000-0000-0000-0000-000000000001', '{"type":"game","hero":"cat","winMessage":"You did it!"}');
select pg_temp.check((select content->>'winMessage' from projects where id = '10000000-0000-0000-0000-000000000001') = 'You did it!', 'owner saves game');
select pg_temp.expect_error($$select public.save_project_content('10000000-0000-0000-0000-000000000001', '{"type":"show","scenes":[{"characters":[{"line":"add me on tiktok"}]}]}')$$, 'text_blocked:social');
select pg_temp.expect_error($$update projects set content = '{"x":"call 07700900123"}' where id = '10000000-0000-0000-0000-000000000001'$$, 'text_blocked:phone');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select public.save_project_content('10000000-0000-0000-0000-000000000001', '{"type":"game","hero":"unicorn"}');
select pg_temp.check((select content->>'hero' from projects where id = '10000000-0000-0000-0000-000000000001') = 'unicorn', 'helper saves game');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', false);
set role authenticated;
select pg_temp.expect_error($$select public.save_project_content('10000000-0000-0000-0000-000000000001', '{}')$$, 'not_allowed');
reset role;

-- ---- Parents create child accounts without server code
select set_config('request.jwt.claim.sub', '', false);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'newkid@kids.kidstagram.invalid'),
  ('00000000-0000-0000-0000-0000000000d2', 'grownup@example.com');
insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000000d3', 'oldkid@kids.kidstagram.invalid', now() - interval '1 day');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.expect_error($$select public.claim_child('00000000-0000-0000-0000-0000000000d1', 'Newbie', 'cat', 2017, 1)$$, 'consent_required');
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into parental_consents (parent_id, policy_version, method, signed_name) values ('00000000-0000-0000-0000-0000000000a1', 'test', 'attestation', 'Parent A');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.expect_error($$select public.claim_child('00000000-0000-0000-0000-0000000000d2', 'Newbie', 'cat', 2017, 1)$$, 'child_login_not_found');
select pg_temp.expect_error($$select public.claim_child('00000000-0000-0000-0000-0000000000d3', 'Newbie', 'cat', 2017, 1)$$, 'child_login_not_found');
select pg_temp.expect_error($$select public.claim_child('00000000-0000-0000-0000-0000000000d1', 'Newbie', 'cat', 2024, 1)$$, 'age_out_of_range');
select pg_temp.check(length(public.claim_child('00000000-0000-0000-0000-0000000000d1', 'Newbie', 'cat', extract(year from current_date)::int - 9, 1)) = 6, 'parent claims new child login');
select pg_temp.check((select parent_id from profiles where id = '00000000-0000-0000-0000-0000000000d1') = auth.uid(), 'child linked to parent');
select pg_temp.expect_error($$select public.claim_child('00000000-0000-0000-0000-0000000000d1', 'Again', 'cat', 2017, 1)$$, 'already_claimed');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
select pg_temp.expect_error($$select public.delete_child('00000000-0000-0000-0000-0000000000d1')$$, 'not_your_child');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select public.delete_child('00000000-0000-0000-0000-0000000000d1');
reset role;
select pg_temp.check(not exists (select 1 from profiles where id = '00000000-0000-0000-0000-0000000000d1'), 'deleting child removes profile');
select pg_temp.check(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d1'), 'deleting child removes login');

\echo ALL SAFETY TESTS PASSED
