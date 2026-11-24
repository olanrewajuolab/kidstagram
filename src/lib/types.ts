export type Role = 'parent' | 'child' | 'moderator';

export type Profile = {
  id: string;
  role: Role;
  nickname: string;
  avatar: string;
  parent_id: string | null;
  birth_month: string | null;
  friend_code: string | null;
  status: 'active' | 'paused';
};

export type Project = {
  id: string;
  owner_id: string;
  kind: 'game' | 'show';
  title: string;
  description: string;
  visibility: 'private' | 'friends';
  moderation: 'ok' | 'flagged' | 'removed';
  created_at: string;
  owner?: Pick<Profile, 'id' | 'nickname' | 'avatar'>;
};

export type Step = { id: string; project_id: string; author_id: string; position: number; body: string; created_at: string };

export type Comment = {
  id: string;
  project_id: string;
  author_id: string;
  body: string;
  preset_key: string | null;
  moderation: 'ok' | 'flagged' | 'removed';
  created_at: string;
  author?: Pick<Profile, 'id' | 'nickname' | 'avatar'>;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  addressee_accepted: boolean;
  requester_parent_ok: boolean;
  addressee_parent_ok: boolean;
  status: 'pending' | 'accepted' | 'declined';
  requester?: Pick<Profile, 'id' | 'nickname' | 'avatar' | 'parent_id' | 'birth_month'>;
  addressee?: Pick<Profile, 'id' | 'nickname' | 'avatar' | 'parent_id' | 'birth_month'>;
};
