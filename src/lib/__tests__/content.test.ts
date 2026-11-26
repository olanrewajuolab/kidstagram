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
  assert.equal(g.type === 'game' && g.goal, 10);
});

test('contentText collects every speech line', () => {
  const text = contentText({ type: 'show', scenes: [{ id: '1', background: 'meadow', characters: [{ emoji: '🐱', line: 'Hi' }, { emoji: '🐶', line: 'Bye' }] }] });
  assert.equal(text, 'Hi Bye');
});

test('older games become runners; each game type has its own starting setup', () => {
  const old = readContent('game', { type: 'game', hero: '🐸' });
  assert.equal(old.type === 'game' && old.mode, 'runner');
  const bad = readContent('game', { type: 'game', mode: 'hacked' });
  assert.equal(bad.type === 'game' && bad.mode, 'runner');
  for (const mode of ['runner', 'football', 'basketball', 'catch'] as const) {
    const g = defaultContent('game', mode);
    assert.equal(g.type === 'game' && g.mode, mode);
  }
});
