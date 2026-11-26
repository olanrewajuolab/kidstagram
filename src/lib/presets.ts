// Keep in sync with public.comment_presets in supabase/migrations.
export const commentPresets = [
  { key: 'love_it', body: 'I love it! ❤️' },
  { key: 'so_cool', body: 'This is so cool! 😎' },
  { key: 'funny', body: 'That made me laugh! 😂' },
  { key: 'great_idea', body: 'Great idea! 💡' },
  { key: 'keep_going', body: 'Keep going, you can do it! 💪' },
  { key: 'want_to_help', body: 'Can I help with this? 🙋' },
  { key: 'add_more', body: 'Add more please! ➕' },
  { key: 'well_done', body: 'Well done! ⭐' },
] as const;

export const avatars: Record<string, string> = {
  star: '⭐', rocket: '🚀', cat: '🐱', dog: '🐶', dragon: '🐉', robot: '🤖',
  unicorn: '🦄', panda: '🐼', alien: '👽', dino: '🦖', fox: '🦊', owl: '🦉',
  lion: '🦁', frog: '🐸', penguin: '🐧', bunny: '🐰', turtle: '🐢', octopus: '🐙',
  monkey: '🐵', butterfly: '🦋', shark: '🦈', bear: '🐻', ghost: '👻', rainbow: '🌈',
};
// Keep in sync with profiles_avatar_preset in supabase/migrations.
export const avatarKeys = Object.keys(avatars);
