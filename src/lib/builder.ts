// The Game Builder: kids draw a level, write rules with picture blocks, and complete
// missions that check their game and unlock new tools. Stored inside projects.content.

import type { AgeBand } from './age';

export const COLS = 16;
export const ROWS = 8;

/** Level tiles, one character each. */
export type Tile = '.' | '#' | 'S' | 'F' | '*' | 'x' | 'm';
export const TILE_INFO: Record<Tile, { name: string }> = {
  '.': { name: 'Empty' },
  '#': { name: 'Block' },
  S: { name: 'Start' },
  F: { name: 'Finish flag' },
  '*': { name: 'Treasure' },
  x: { name: 'Enemy' },
  m: { name: 'Moving enemy' },
};

export type RuleEvent = 'touch_flag' | 'touch_coin' | 'touch_enemy' | 'fall' | 'time_up' | 'score_is';
export type RuleAction = 'win' | 'lose' | 'add_point' | 'lose_life';
export type GameRule = { when: RuleEvent; then: RuleAction };

export type BuilderProgress = {
  /** True once the kid has won their own game since their last change. */
  won: boolean;
  /** Missions finished so far. Once finished, a mission stays finished. */
  done: string[];
};

export function emptyLevel(): string[] {
  const rows: string[] = [];
  for (let r = 0; r < ROWS - 1; r++) rows.push('.'.repeat(COLS));
  rows[ROWS - 2] = '.S' + '.'.repeat(COLS - 2);
  rows.push('#'.repeat(COLS));
  return rows;
}

/** Makes any stored level safe to use: right size, only known tiles. */
export function cleanLevel(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length !== ROWS) return emptyLevel();
  const ok = new Set(Object.keys(TILE_INFO));
  return raw.map((row) => {
    const s = typeof row === 'string' ? row : '';
    let out = '';
    for (let c = 0; c < COLS; c++) out += ok.has(s[c]) ? s[c] : '.';
    return out;
  });
}

export function setTile(level: string[], r: number, c: number, t: Tile): string[] {
  // Only one start and one flag: placing a new one moves it.
  const unique = t === 'S' || t === 'F';
  return level.map((row, ri) => {
    let s = unique ? row.split(t).join('.') : row;
    if (ri === r) s = s.slice(0, c) + t + s.slice(c + 1);
    return s;
  });
}

export const count = (level: string[], t: Tile) => level.join('').split(t).length - 1;
export const hasRule = (rules: GameRule[], when: RuleEvent, then: RuleAction | RuleAction[]) =>
  rules.some((r) => r.when === when && (Array.isArray(then) ? then.includes(r.then) : r.then === then));

/** Everything a mission check needs to look at. */
export type BuildState = {
  level: string[];
  rules: GameRule[];
  timer: number;
  lives: number;
  scoreGoal: number;
  progress: BuilderProgress;
};

export type Mission = {
  id: string;
  title: string;
  steps: { text: string; done: (g: BuildState) => boolean }[];
  /** What this mission adds to the toolbox. */
  tiles?: Tile[];
  events?: RuleEvent[];
  actions?: RuleAction[];
  settings?: ('timer' | 'lives' | 'scoreGoal')[];
  bands: AgeBand[];
  tip?: string;
};

const all: AgeBand[] = ['little', 'middle', 'teen'];
const older: AgeBand[] = ['middle', 'teen'];
const won = { text: 'Play your game and win it', done: (g: BuildState) => g.progress.won };

export const MISSIONS: Mission[] = [
  {
    id: 'finish',
    title: 'Make a finish line',
    tiles: ['F'],
    events: ['touch_flag'],
    actions: ['win'],
    bands: all,
    steps: [
      { text: 'Put the 🏁 flag on your level', done: (g) => count(g.level, 'F') > 0 },
      { text: 'Add a rule: When hero touches 🏁 → You win!', done: (g) => hasRule(g.rules, 'touch_flag', 'win') },
    ],
    tip: 'Games need a goal. Rules tell the game what should happen.',
  },
  {
    id: 'test1',
    title: 'Test your game',
    bands: all,
    steps: [won],
    tip: 'Game makers play their games again and again to check they work. Use ◀ ▶ and Jump.',
  },
  {
    id: 'treasure',
    title: 'Add treasure and points',
    tiles: ['*'],
    events: ['touch_coin'],
    actions: ['add_point'],
    bands: all,
    steps: [
      { text: 'Put at least 5 treasures on your level', done: (g) => count(g.level, '*') >= 5 },
      { text: 'Add a rule: When hero touches treasure → +1 point', done: (g) => hasRule(g.rules, 'touch_coin', 'add_point') },
    ],
    tip: 'Try putting some treasure up high, so players have to jump for it.',
  },
  {
    id: 'enemy',
    title: 'Add a danger',
    tiles: ['x'],
    events: ['touch_enemy'],
    actions: ['lose'],
    bands: all,
    steps: [
      { text: 'Put an enemy on your level', done: (g) => count(g.level, 'x') + count(g.level, 'm') > 0 },
      { text: 'Add a rule: When hero touches enemy → Game over', done: (g) => hasRule(g.rules, 'touch_enemy', ['lose', 'lose_life']) },
    ],
    tip: 'A game is more fun when there is something to avoid. Make sure it can still be beaten!',
  },
  {
    id: 'gap',
    title: 'Make a jump challenge',
    events: ['fall'],
    bands: all,
    steps: [
      { text: 'Make a gap in the bottom row with the 🧽 eraser', done: (g) => /#\.+#/.test(g.level[ROWS - 1]) },
      { text: 'Add a rule: When hero falls off → Game over', done: (g) => hasRule(g.rules, 'fall', ['lose', 'lose_life']) },
    ],
    tip: 'Make the gap small enough to jump over. Test it!',
  },
  { id: 'test2', title: 'Test your harder game', bands: all, steps: [won], tip: 'Too hard? Change your level until it feels fair.' },
  {
    id: 'timer',
    title: 'Beat the clock',
    events: ['time_up'],
    settings: ['timer'],
    bands: older,
    steps: [
      { text: 'Set a timer', done: (g) => g.timer > 0 },
      { text: 'Add a rule: When time runs out → Game over', done: (g) => hasRule(g.rules, 'time_up', ['lose', 'lose_life']) },
    ],
    tip: 'A timer makes players hurry. Pick a time that is tricky but possible.',
  },
  {
    id: 'mover',
    title: 'Make an enemy move',
    tiles: ['m'],
    bands: older,
    steps: [{ text: 'Put a moving enemy on your level', done: (g) => count(g.level, 'm') > 0 }],
    tip: 'Moving enemies walk until they bump into a block, then turn around. Use blocks to fence them in.',
  },
  {
    id: 'lives',
    title: 'Give your hero lives',
    actions: ['lose_life'],
    settings: ['lives'],
    bands: ['teen'],
    steps: [
      { text: 'Give your hero 2 or more lives', done: (g) => g.lives >= 2 },
      { text: 'Change the enemy rule to: When hero touches enemy → lose a life', done: (g) => hasRule(g.rules, 'touch_enemy', 'lose_life') },
    ],
    tip: 'Lives let players learn from mistakes without starting over.',
  },
  {
    id: 'score',
    title: 'Win by collecting',
    events: ['score_is'],
    settings: ['scoreGoal'],
    bands: ['teen'],
    steps: [
      { text: 'Add a rule: When score reaches your target → You win!', done: (g) => hasRule(g.rules, 'score_is', 'win') },
      { text: 'Put enough treasure on the level to reach the target', done: (g) => count(g.level, '*') >= g.scoreGoal },
    ],
    tip: 'Now players can win two ways. Which one will they choose?',
  },
  { id: 'final', title: 'Play your finished game', bands: older, steps: [won], tip: 'Finish it yourself, then share it with friends!' },
];

export function missionsFor(band: AgeBand): Mission[] {
  return MISSIONS.filter((m) => m.bands.includes(band));
}

export const missionDone = (m: Mission, g: BuildState) => m.steps.every((s) => s.done(g));

/**
 * Where the kid is up to. Missions are done in order: the current one is the first that isn't finished.
 * The toolbox has everything from earlier missions plus the current one.
 */
export function missionStatus(band: AgeBand, g: BuildState) {
  const list = missionsFor(band);
  let current = list.findIndex((m) => !g.progress.done.includes(m.id));
  const allDone = current === -1;
  if (allDone) current = list.length;
  const open = list.slice(0, Math.min(current + 1, list.length));
  const tiles = new Set<Tile>(['#', 'S', '.']);
  const events = new Set<RuleEvent>();
  const actions = new Set<RuleAction>();
  const settings = new Set<'timer' | 'lives' | 'scoreGoal'>();
  for (const m of open) {
    m.tiles?.forEach((t) => tiles.add(t));
    m.events?.forEach((e) => events.add(e));
    m.actions?.forEach((a) => actions.add(a));
    m.settings?.forEach((s) => settings.add(s));
  }
  return { list, current, allDone, mission: allDone ? null : list[current], tiles, events, actions, settings };
}

/** Marks the current mission (and any after it that are already true) as finished. */
export function advance(band: AgeBand, g: BuildState): BuilderProgress {
  const done = [...g.progress.done];
  for (const m of missionsFor(band)) {
    if (done.includes(m.id)) continue;
    if (!missionDone(m, { ...g, progress: { ...g.progress, done } })) break;
    done.push(m.id);
  }
  return done.length === g.progress.done.length ? g.progress : { ...g.progress, done };
}
