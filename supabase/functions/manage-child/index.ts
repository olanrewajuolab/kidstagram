// Supabase Edge Function (Deno): parents create or delete child accounts.
// Children never sign up on their own. The child's login is a username + password
// chosen by the parent; we map it to a synthetic email that is never shown or emailed.
//
// Deploy: supabase functions deploy manage-child
import { createClient } from 'npm:@supabase/supabase-js@2';

const CHILD_EMAIL_DOMAIN = 'kids.kidstagram.invalid';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function ageYears(birthMonth: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - birthMonth.getUTCFullYear();
  if (now.getUTCMonth() < birthMonth.getUTCMonth()) age -= 1;
  return age;
}

function friendCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  // Identify the caller from their JWT.
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: 'not_signed_in' }, 401);
  const parentId = userData.user.id;

  const { data: parent } = await admin.from('profiles').select('role').eq('id', parentId).single();
  if (parent?.role !== 'parent') return json({ error: 'parents_only' }, 403);

  const body = await req.json();

  if (body.action === 'delete') {
    const { data: child } = await admin.from('profiles').select('parent_id').eq('id', body.childId).single();
    if (child?.parent_id !== parentId) return json({ error: 'not_your_child' }, 403);
    // Cascades remove the profile, projects, comments and friendships.
    const { error } = await admin.auth.admin.deleteUser(body.childId);
    if (error) return json({ error: error.message }, 400);
    // Media files live under <childId>/ in the project-media bucket.
    const { data: files } = await admin.storage.from('project-media').list(body.childId);
    if (files?.length) {
      await admin.storage.from('project-media').remove(files.map((f) => `${body.childId}/${f.name}`));
    }
    return json({ ok: true });
  }

  if (body.action === 'create') {
    // Consent must be on file before any child account exists (COPPA).
    const { count } = await admin
      .from('parental_consents')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', parentId);
    if (!count) return json({ error: 'consent_required' }, 403);

    const nickname = String(body.nickname ?? '').trim();
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const avatar = String(body.avatar ?? 'star');
    const birthMonth = new Date(Date.UTC(Number(body.birthYear), Number(body.birthMonth) - 1, 1));

    if (nickname.length < 2 || nickname.length > 24) return json({ error: 'bad_nickname' }, 400);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: 'bad_username' }, 400);
    if (password.length < 8) return json({ error: 'weak_password' }, 400);
    const age = ageYears(birthMonth);
    if (Number.isNaN(age) || age < 5 || age > 16) return json({ error: 'age_out_of_range' }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: `${username}@${CHILD_EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { role: 'child' },
    });
    if (createErr || !created.user) return json({ error: 'username_taken' }, 400);

    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await admin.from('profiles').insert({
        id: created.user.id,
        role: 'child',
        nickname,
        avatar,
        parent_id: parentId,
        birth_month: birthMonth.toISOString().slice(0, 10),
        friend_code: friendCode(),
      });
      if (!error) return json({ ok: true, childId: created.user.id });
      if (error.code !== '23505') {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: error.message }, 400);
      }
    }
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'try_again' }, 500);
  }

  return json({ error: 'unknown_action' }, 400);
});
