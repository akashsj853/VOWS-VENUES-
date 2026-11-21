import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePathname, parseRoute, routeToPath } from './router';

test('parseRoute resolves all top-level public and portal routes cleanly', () => {
  assert.deepEqual(parseRoute('/'), { page: 'home' });
  assert.deepEqual(parseRoute('/our-story'), { page: 'our-story' });
  assert.deepEqual(parseRoute('/venues'), { page: 'venues' });
  assert.deepEqual(parseRoute('/venues/'), { page: 'venues' });
  assert.deepEqual(parseRoute('/gallery'), { page: 'gallery' });
  assert.deepEqual(parseRoute('/packages'), { page: 'packages' });
  assert.deepEqual(parseRoute('/contact'), { page: 'contact' });
  assert.deepEqual(parseRoute('/dashboard'), { page: 'dashboard' });
  assert.deepEqual(parseRoute('/admin'), { page: 'admin' });
});

test('parseRoute extracts venue detail hallId and falls back on unknown paths', () => {
  assert.deepEqual(parseRoute('/venues/hall-123'), {
    page: 'venue-detail',
    hallId: 'hall-123',
  });
  assert.deepEqual(parseRoute('/unknown/nested/path'), { page: 'home' });
});

test('routeToPath and normalizePathname round-trip cleanly', () => {
  assert.equal(normalizePathname('/packages/?ref=hero#top'), '/packages');
  assert.equal(routeToPath({ page: 'our-story' }), '/our-story');
  assert.equal(routeToPath({ page: 'venue-detail', hallId: 'abc 123' }), '/venues/abc%20123');
});
