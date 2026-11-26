-- Kids can change their own avatar, but only to one of the cartoon presets.
-- Keep this list in sync with `avatars` in src/lib/presets.ts.
update public.profiles set avatar = 'star'
  where avatar not in ('star','rocket','cat','dog','dragon','robot','unicorn','panda','alien','dino','fox','owl',
                       'lion','frog','penguin','bunny','turtle','octopus','monkey','butterfly','shark','bear','ghost','rainbow');
alter table public.profiles drop constraint if exists profiles_avatar_preset;
alter table public.profiles add constraint profiles_avatar_preset check (
  avatar in ('star','rocket','cat','dog','dragon','robot','unicorn','panda','alien','dino','fox','owl',
             'lion','frog','penguin','bunny','turtle','octopus','monkey','butterfly','shark','bear','ghost','rainbow')
);
