// What a kid builds inside a project. Stored in projects.content (jsonb).

export type GameTheme = 'space' | 'jungle' | 'ocean' | 'city' | 'candy';

export type GameMode = 'runner' | 'football' | 'basketball' | 'catch';

export type GameContent = {
  type: 'game';
  /** Which kind of game. Older games have no mode and are runners. */
  mode: GameMode;
  hero: string;
  theme: GameTheme;
  obstacle: string;
  collectible: string;
  speed: 1 | 2 | 3;
  goal: number;
  winMessage: string;
};

export type ShowBackground = 'meadow' | 'night' | 'castle' | 'beach' | 'space' | 'stage';

export type ShowCharacter = { emoji: string; line: string };
export type ShowScene = { id: string; background: ShowBackground; characters: ShowCharacter[] };
export type ShowContent = { type: 'show'; scenes: ShowScene[] };

export type ProjectContent = GameContent | ShowContent;

export const heroes = ['🐱', '🐶', '🦊', '🐸', '🐵', '🦄', '🐉', '🤖', '👽', '🐧', '🦖', '🚀'];
export const obstacles = ['🪨', '🌵', '🔥', '🧱', '👾', '🦀', '💣', '🌪️'];
export const collectibles = ['⭐', '💎', '🍎', '🍩', '🪙', '❤️', '🍭', '🎈'];
export const characters = ['🐱', '🐶', '🦊', '🐻', '🐰', '🦁', '🐸', '🦄', '🐉', '🧙', '👸', '🤴', '🧚', '🤖', '👻', '🦖'];

export const gameModes: Record<GameMode, { label: string; blurb: string }> = {
  runner: { label: '🏃 Runner', blurb: 'Run, jump over things and collect treasure.' },
  football: { label: '⚽ Football', blurb: 'Take penalties and score past the goalkeeper.' },
  basketball: { label: '🏀 Basketball', blurb: 'Shoot the ball into the moving hoop.' },
  catch: { label: '🧺 Catch', blurb: 'Catch the good things falling from the sky. Dodge the rest!' },
};
export const isGameMode = (m: unknown): m is GameMode => typeof m === 'string' && m in gameModes;

export const gameThemes: Record<GameTheme, { label: string; sky: string; ground: string; decor: string }> = {
  space: { label: '🌌 Space', sky: '#1B1F4B', ground: '#5B4B8A', decor: '✨' },
  jungle: { label: '🌴 Jungle', sky: '#BFEBD2', ground: '#3E8E41', decor: '🌿' },
  ocean: { label: '🌊 Ocean', sky: '#9AD9F5', ground: '#E8D29A', decor: '🫧' },
  city: { label: '🏙️ City', sky: '#FFD7A8', ground: '#6B6B7B', decor: '☁️' },
  candy: { label: '🍬 Candy', sky: '#FFD1EA', ground: '#F38BB8', decor: '🍬' },
};

export const showBackgrounds: Record<ShowBackground, { label: string; color: string; decor: string }> = {
  meadow: { label: '🌼 Meadow', color: '#C9F0B7', decor: '🌼 🌳 🌼' },
  night: { label: '🌙 Night', color: '#24285A', decor: '🌙 ⭐ ✨' },
  castle: { label: '🏰 Castle', color: '#E7DDF7', decor: '🏰' },
  beach: { label: '🏖️ Beach', color: '#FFE9B0', decor: '🌊 ☀️ 🐚' },
  space: { label: '🪐 Space', color: '#151935', decor: '🪐 🌍 ✨' },
  stage: { label: '🎭 Stage', color: '#7A1E2C', decor: '🎭' },
};

export const quickLines = ['Hello!', "Let's go!", 'Oh no!', 'Hooray!', 'Look at that!', 'I can help!', 'The end!', 'Who are you?'];

const id = () => Math.random().toString(36).slice(2, 9);

export function newScene(): ShowScene {
  return { id: id(), background: 'meadow', characters: [{ emoji: '🐱', line: 'Hello!' }] };
}

export function defaultContent(kind: 'game' | 'show', mode: GameMode = 'runner'): ProjectContent {
  if (kind === 'game') {
    const base: GameContent = { type: 'game', mode: 'runner', hero: '🐱', theme: 'space', obstacle: '🪨', collectible: '⭐', speed: 2, goal: 10, winMessage: 'You win!' };
    if (mode === 'football') return { ...base, mode, hero: '🦁', theme: 'jungle', obstacle: '🐻', goal: 5, winMessage: 'Champions!' };
    if (mode === 'basketball') return { ...base, mode, hero: '🐵', theme: 'city', goal: 5, winMessage: 'Slam dunk!' };
    if (mode === 'catch') return { ...base, mode, hero: '🐰', theme: 'candy', obstacle: '💣', collectible: '🍩', winMessage: 'Yum, all caught!' };
    return base;
  }
  return { type: 'show', scenes: [newScene()] };
}

/** Fills in anything missing, so older or empty projects still open in the maker. */
export function readContent(kind: 'game' | 'show', raw: unknown): ProjectContent {
  const base = defaultContent(kind);
  if (!raw || typeof raw !== 'object' || (raw as { type?: string }).type !== kind) return base;
  if (kind === 'show') {
    const scenes = (raw as ShowContent).scenes;
    return { type: 'show', scenes: Array.isArray(scenes) && scenes.length ? scenes : (base as ShowContent).scenes };
  }
  const game = { ...(base as GameContent), ...(raw as GameContent) };
  if (!isGameMode(game.mode)) game.mode = 'runner';
  return game;
}

/** All the words inside the content, for the safety check before saving. */
export function contentText(c: ProjectContent): string {
  if (c.type === 'game') return c.winMessage;
  return c.scenes.flatMap((s) => s.characters.map((ch) => ch.line)).join(' ');
}
