import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentText, defaultContent, readContent } from '../content.ts';

test('new projects start with something to play', () => {
  const game = defaultContent('game');
  assert.equal(game.type, 'game');
  const show = defaultContent('show');
  assert.equal(show.type === 'show' && show.scenes.length, 1);
});

test('readContent repairs empty or mismatched content', () => {
  assert.equal(readContent('game', {}).type, 'game');
  assert.equal(readContent('show', { type: 'game' }).type, 'show');
  const g = readContent('game', { type: 'game', hero: '🦄' });
  assert.equal(g.type === 'game' && g.hero, '🦄');
  assert.equal(g.type === 'game' && g.level.length, 8);
});

test('contentText collects every speech line', () => {
  const text = contentText({ type: 'show', scenes: [{ id: '1', background: 'meadow', characters: [{ emoji: '🐱', line: 'Hi' }, { emoji: '🐶', line: 'Bye' }] }] });
  assert.equal(text, 'Hi Bye');
});

test('game builder: missions tick off in order and unlock tools', async () => {
  const { advance, missionStatus, setTile, count, ROWS } = await import('../builder.ts');
  let g = defaultContent('game');
  assert.ok(g.type === 'game');
  if (g.type !== 'game') return;
  let s = missionStatus('little', g);
  assert.equal(s.mission?.id, 'finish');
  assert.ok(s.tiles.has('F') && !s.tiles.has('*'), 'only the flag is unlocked at first');

  g = { ...g, level: setTile(g.level, ROWS - 2, 14, 'F'), rules: [{ when: 'touch_flag', then: 'win' }] };
  g = { ...g, progress: advance('little', g) };
  s = missionStatus('little', g);
  assert.equal(s.mission?.id, 'test1');

  g = { ...g, progress: advance('little', { ...g, progress: { ...g.progress, won: true } }) };
  assert.equal(missionStatus('little', g).mission?.id, 'treasure');
  assert.ok(missionStatus('little', g).tiles.has('*'));

  // Moving the flag doesn't undo a finished mission; there is only ever one flag.
  g = { ...g, level: setTile(g.level, 2, 3, 'F') };
  assert.equal(count(g.level, 'F'), 1);
  assert.equal(missionStatus('little', g).mission?.id, 'treasure');

  // Younger kids get fewer missions than older ones.
  assert.ok(missionStatus('little', g).list.length < missionStatus('teen', g).list.length);
});

test('readContent cleans up bad levels and rules', () => {
  const g = readContent('game', { type: 'game', level: ['oops'], rules: [{ when: 'hack', then: 'win' }, { when: 'fall', then: 'lose' }], lives: 99 });
  assert.ok(g.type === 'game');
  if (g.type !== 'game') return;
  assert.equal(g.level.length, 8);
  assert.deepEqual(g.rules, [{ when: 'fall', then: 'lose' }]);
  assert.equal(g.lives, 5);
});
