// What a kid builds inside a project. Stored in projects.content (jsonb).
import { cleanLevel, emptyLevel, type BuilderProgress, type GameRule, type RuleAction, type RuleEvent } from './builder.ts';

export type GameTheme = 'space' | 'jungle' | 'ocean' | 'city' | 'candy';

export type GameContent = {
  type: 'game';
  hero: string;
  theme: GameTheme;
  obstacle: string;
  collectible: string;
  winMessage: string;
  /** The level the kid drew: ROWS strings of COLS tiles. See builder.ts. */
  level: string[];
  /** The kid's picture-block rules: "When … → …". */
  rules: GameRule[];
  /** Seconds on the clock, 0 for no timer. */
  timer: number;
  lives: number;
  scoreGoal: number;
  enemySpeed: 1 | 2 | 3;
  progress: BuilderProgress;
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

export function defaultContent(kind: 'game' | 'show'): ProjectContent {
  if (kind === 'game') {
    return {
      type: 'game', hero: '🐱', theme: 'jungle', obstacle: '👾', collectible: '⭐', winMessage: 'You win!',
      level: emptyLevel(), rules: [], timer: 0, lives: 1, scoreGoal: 5, enemySpeed: 2, progress: { won: false, done: [] },
    };
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
  // Older games (from before the Game Builder) keep their hero, theme and pictures and get a fresh level.
  const g = { ...(base as GameContent), ...(raw as GameContent) };
  const events: RuleEvent[] = ['touch_flag', 'touch_coin', 'touch_enemy', 'fall', 'time_up', 'score_is'];
  const actions: RuleAction[] = ['win', 'lose', 'add_point', 'lose_life'];
  return {
    ...g,
    level: cleanLevel(g.level),
    rules: Array.isArray(g.rules) ? g.rules.filter((r) => r && events.includes(r.when) && actions.includes(r.then)).slice(0, 20) : [],
    timer: clampInt(g.timer, 0, 300),
    lives: clampInt(g.lives, 1, 5) || 1,
    scoreGoal: clampInt(g.scoreGoal, 1, 99) || 5,
    enemySpeed: ([1, 2, 3] as const).includes(g.enemySpeed) ? g.enemySpeed : 2,
    progress: {
      won: Boolean(g.progress?.won),
      done: Array.isArray(g.progress?.done) ? g.progress.done.filter((d) => typeof d === 'string') : [],
    },
  };
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

/** All the words inside the content, for the safety check before saving. */
export function contentText(c: ProjectContent): string {
  if (c.type === 'game') return c.winMessage;
  return c.scenes.flatMap((s) => s.characters.map((ch) => ch.line)).join(' ');
}
