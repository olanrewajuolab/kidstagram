import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTextProblem, friendlyError } from '../moderation.ts';

test('allows normal project talk', () => {
  for (const t of ['My game has 3 levels', 'I love the dragon!', 'Can you add a jump button?', 'Level 12 is hard']) {
    assert.equal(findTextProblem(t), null, t);
  }
});

test('blocks personal info and unkind words', () => {
  assert.equal(findTextProblem('mail me: kid@example.com'), 'email');
  assert.equal(findTextProblem('call 07700 900 123'), 'phone');
  assert.equal(findTextProblem('see www.example.org'), 'link');
  assert.equal(findTextProblem('add me on Discord'), 'social');
  assert.equal(findTextProblem('I live at 12 Oak Road'), 'address');
  assert.equal(findTextProblem('What school do you go to?'), 'personal');
  assert.equal(findTextProblem('you are stupid'), 'unkind');
});

test('maps database errors to friendly text', () => {
  assert.match(friendlyError('text_blocked:phone'), /Phone numbers/);
  assert.match(friendlyError('presets_only'), /ready-made/);
});
