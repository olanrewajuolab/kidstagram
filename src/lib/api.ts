import { defaultContent, type ProjectContent } from './content';
import { childEmail, signupClient, supabase } from './supabase';
import type { Comment, Friendship, Profile, Project, Step } from './types';

const ownerCols = 'owner:profiles!projects_owner_id_fkey(id, nickname, avatar)';
const miniProfile = 'id, nickname, avatar, parent_id, birth_month';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- Parents ----------
export async function giveConsent(parentId: string, signedName: string, policyVersion: string) {
  check(
    await supabase
      .from('parental_consents')
      .insert({ parent_id: parentId, signed_name: signedName, policy_version: policyVersion, method: 'attestation' }),
  );
}

export async function myChildren(parentId: string): Promise<Profile[]> {
  return check(await supabase.from('profiles').select('*').eq('parent_id', parentId).order('created_at'));
}

export async function getProfile(id: string): Promise<Profile> {
  return check(await supabase.from('profiles').select('*').eq('id', id).single());
}

/**
 * Makes the child's login (username + password), then links it to this parent.
 * The database checks consent, age and that the login is brand new (claim_child).
 */
export async function createChild(input: {
  nickname: string;
  avatar: string;
  username: string;
  password: string;
  birthYear: number;
  birthMonth: number;
}) {
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error('bad_username');
  if (input.password.length < 8) throw new Error('weak_password');
  const { data, error } = await signupClient().auth.signUp({ email: childEmail(username), password: input.password });
  if (error) throw new Error(/registered|exists/i.test(error.message) ? 'username_taken' : error.message);
  if (!data.user || data.user.identities?.length === 0) throw new Error('username_taken');
  if (!data.session) throw new Error('confirm_email_on');
  check(
    await supabase.rpc('claim_child', {
      p_child: data.user.id,
      p_nickname: input.nickname,
      p_avatar: input.avatar,
      p_birth_year: input.birthYear,
      p_birth_month: input.birthMonth,
    }),
  );
  return { username };
}

export async function deleteChild(childId: string) {
  check(await supabase.rpc('delete_child', { p_child: childId }));
}

export async function setChildPaused(childId: string, paused: boolean) {
  check(await supabase.from('profiles').update({ status: paused ? 'paused' : 'active' }).eq('id', childId));
}

/** Friend requests involving any of this parent's children that still need the parent's OK. */
export async function pendingApprovals(childIds: string[]): Promise<Friendship[]> {
  if (!childIds.length) return [];
  const ids = childIds.join(',');
  const rows: Friendship[] = check(
    await supabase
      .from('friendships')
      .select(`*, requester:profiles!friendships_requester_id_fkey(${miniProfile}), addressee:profiles!friendships_addressee_id_fkey(${miniProfile})`)
      .eq('status', 'pending')
      .or(`requester_id.in.(${ids}),addressee_id.in.(${ids})`),
  );
  return rows.filter(
    (f) =>
      (childIds.includes(f.requester_id) && !f.requester_parent_ok) ||
      (childIds.includes(f.addressee_id) && !f.addressee_parent_ok),
  );
}

export async function parentDecide(f: Friendship, childIds: string[], approve: boolean) {
  if (!approve) {
    check(await supabase.from('friendships').delete().eq('id', f.id));
    return;
  }
  const patch = childIds.includes(f.requester_id) ? { requester_parent_ok: true } : { addressee_parent_ok: true };
  check(await supabase.from('friendships').update(patch).eq('id', f.id));
}

// ---------- Friends ----------
export async function requestFriend(code: string) {
  check(await supabase.rpc('request_friend', { p_code: code }));
}

export async function myFriendships(me: string): Promise<Friendship[]> {
  return check(
    await supabase
      .from('friendships')
      .select(`*, requester:profiles!friendships_requester_id_fkey(${miniProfile}), addressee:profiles!friendships_addressee_id_fkey(${miniProfile})`)
      .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
      .neq('status', 'declined')
      .order('created_at', { ascending: false }),
  );
}

export async function answerFriendRequest(id: string, accept: boolean) {
  const patch = accept ? { addressee_accepted: true } : { status: 'declined' };
  check(await supabase.from('friendships').update(patch).eq('id', id));
}

export async function removeFriend(id: string) {
  check(await supabase.from('friendships').delete().eq('id', id));
}

// ---------- Projects ----------
export async function listProjects(ownerId?: string): Promise<Project[]> {
  let q = supabase.from('projects').select(`*, ${ownerCols}`).neq('moderation', 'removed').order('updated_at', { ascending: false });
  if (ownerId) q = q.eq('owner_id', ownerId);
  return check(await q);
}

export async function getProject(id: string): Promise<Project> {
  return check(await supabase.from('projects').select(`*, ${ownerCols}`).eq('id', id).single());
}

export async function createProject(input: Pick<Project, 'owner_id' | 'kind' | 'title' | 'description' | 'visibility'>) {
  const row: Project = check(
    await supabase.from('projects').insert({ ...input, content: defaultContent(input.kind) }).select('*').single(),
  );
  return row;
}

export async function updateProject(id: string, patch: Partial<Pick<Project, 'title' | 'description' | 'visibility'>>) {
  check(await supabase.from('projects').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id));
}

export async function saveContent(id: string, content: ProjectContent) {
  check(await supabase.rpc('save_project_content', { p_project: id, p_content: content }));
}

export async function deleteProject(id: string) {
  check(await supabase.from('projects').delete().eq('id', id));
}

export async function listSteps(projectId: string): Promise<Step[]> {
  return check(await supabase.from('project_steps').select('*').eq('project_id', projectId).order('position'));
}

export async function addStep(projectId: string, authorId: string, position: number, body: string) {
  check(await supabase.from('project_steps').insert({ project_id: projectId, author_id: authorId, position, body }));
}

export async function listHelpers(projectId: string): Promise<Pick<Profile, 'id' | 'nickname' | 'avatar'>[]> {
  const rows = check(
    await supabase.from('project_helpers').select('helper:profiles!project_helpers_helper_id_fkey(id, nickname, avatar)').eq('project_id', projectId),
  ) as unknown as { helper: Pick<Profile, 'id' | 'nickname' | 'avatar'> }[];
  return rows.map((r) => r.helper);
}

export async function addHelper(projectId: string, helperId: string) {
  check(await supabase.from('project_helpers').insert({ project_id: projectId, helper_id: helperId }));
}

// ---------- Comments & reports ----------
export async function listComments(projectId: string): Promise<Comment[]> {
  return check(
    await supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(id, nickname, avatar)')
      .eq('project_id', projectId)
      .order('created_at'),
  );
}

export async function addComment(projectId: string, authorId: string, body: string, presetKey?: string) {
  check(
    await supabase
      .from('comments')
      .insert({ project_id: projectId, author_id: authorId, body, preset_key: presetKey ?? null }),
  );
}

export async function report(reporterId: string, targetType: 'project' | 'step' | 'comment' | 'profile', targetId: string, reason: string) {
  check(await supabase.from('reports').insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason }));
}
