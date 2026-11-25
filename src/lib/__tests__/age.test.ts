import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageBand, ageYears } from '../age.ts';

const today = new Date(Date.UTC(2026, 10, 24));

test('computes age from birth month', () => {
  assert.equal(ageYears('2018-11-01', today), 8);
  assert.equal(ageYears('2018-12-01', today), 7);
});

test('assigns age bands', () => {
  assert.equal(ageBand('2019-01-01', today), 'little');
  assert.equal(ageBand('2017-01-01', today), 'middle');
  assert.equal(ageBand('2013-12-01', today), 'middle');
  assert.equal(ageBand('2013-11-01', today), 'teen');
});
