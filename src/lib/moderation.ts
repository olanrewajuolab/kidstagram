// Client-side text check. Mirrors public.text_problem() in the database, which is
// the real gate; this one just gives kids friendly feedback before they hit Send.
// Replace both with a proper moderation service before launch.

export type TextProblem = 'email' | 'phone' | 'link' | 'social' | 'address' | 'personal' | 'unkind';

const checks: [TextProblem, (t: string) => boolean][] = [
  ['email', (t) => /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t)],
  ['phone', (t) => /[0-9]{7,}/.test(t.replace(/[^0-9]/g, ''))],
  ['link', (t) => /(https?:\/\/|www\.|\.(com|net|org|io|co|uk|gg|tv|me|app|xyz)\b)/.test(t)],
  ['social', (t) => /\b(snap|snapchat|insta|instagram|tiktok|discord|whatsapp|telegram|kik)\b/.test(t)],
  ['address', (t) => /\b[0-9]+\s+[a-z]+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|way)\b/.test(t)],
  ['personal', (t) => /\b(where do you live|what school|meet up|send (a )?pic|your address)\b/.test(t)],
  ['unkind', (t) => /\b(stupid|idiot|dumb|hate you|shut up|loser|ugly|kill)\b/.test(t)],
];

export function findTextProblem(text: string): TextProblem | null {
  const t = text.toLowerCase();
  for (const [problem, test] of checks) {
    if (test(t)) return problem;
  }
  return null;
}

export const problemMessages: Record<TextProblem, string> = {
  email: "Let's keep email addresses private. Please take it out.",
  phone: 'Phone numbers stay private on Kidstagram. Please take it out.',
  link: "Links aren't allowed here. Describe it in words instead!",
  social: "Let's keep chatting here on Kidstagram, not other apps.",
  address: 'Addresses stay private. Please take it out.',
  personal: "That's a personal question. Let's talk about projects instead!",
  unkind: "That might hurt someone's feelings. Can you say it in a kinder way?",
};

/** Turns a database error like "text_blocked:phone" into a kid-friendly message. */
export function friendlyError(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  const blocked = message.match(/text_blocked:(\w+)/);
  if (blocked && blocked[1] in problemMessages) return problemMessages[blocked[1] as TextProblem];
  const known: Record<string, string> = {
    presets_only: 'Pick one of the ready-made messages.',
    code_not_found: "We couldn't find that friend code. Check it with a grown-up.",
    that_is_you: "That's your own code!",
    helper_must_be_friend: 'Only friends can help with your project.',
    confirm_email_on: 'Almost there: in Supabase, go to Authentication, then Sign In / Providers, and turn off "Confirm email". Then try again.',
    already_claimed: 'That account is already set up.',
    not_allowed: "You can't change this one.",
    profiles_avatar_preset: 'Pick one of the avatars on the list.',
    consent_required: 'Please give parental consent first.',
    username_taken: 'That username is taken. Try another one.',
    bad_username: 'Usernames use 3 to 20 letters, numbers or _.',
    weak_password: 'Passwords need at least 8 characters.',
    age_out_of_range: 'Kidstagram is for ages 5 to 16.',
    'Invalid login credentials': "That username or password doesn't match.",
  };
  for (const [key, text] of Object.entries(known)) {
    if (message.includes(key)) return text;
  }
  return message;
}
