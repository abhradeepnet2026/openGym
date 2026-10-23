import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseStore, SupabaseStoreError } from '../supabase-store.js';

function response(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; }
  };
}

test('requires server credentials and a fetch implementation', () => {
  assert.throws(() => new SupabaseStore({ url: 'https://example.supabase.co' }), /secret key/);
  assert.throws(() => new SupabaseStore({ url: 'https://example.supabase.co', secretKey: 'x', fetchImpl: null }), /Fetch-compatible/);
});

test('loads an empty instance with safe defaults', async () => {
  const store = new SupabaseStore({
    url: 'https://example.supabase.co',
    secretKey: 'server-secret',
    fetchImpl: async (url, options) => {
      assert.equal(new URL(url).pathname, '/rest/v1/gym_instance_store');
      assert.equal(options.headers.apikey, 'server-secret');
      return response(200, []);
    }
  });
  const row = await store.getInstance();
  assert.equal(row.revision, 0);
  assert.deepEqual(row.payload, { users: [], creds: [], subs: [], invites: [], deviceLinks: [] });
});

test('uses revision filters for compare-and-swap updates', async () => {
  const calls = [];
  const store = new SupabaseStore({
    url: 'https://example.supabase.co',
    secretKey: 'server-secret',
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options });
      return response(200, [{ revision: 3 }]);
    }
  });
  assert.equal(await store.compareAndSwapInstance(2, { users: [] }), true);
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(calls[0].url.searchParams.get('revision'), 'eq.2');
  assert.equal(JSON.parse(calls[0].options.body).revision, 3);
});

test('reports a concurrent update when the revision filter matches no rows', async () => {
  const store = new SupabaseStore({
    url: 'https://example.supabase.co',
    secretKey: 'server-secret',
    fetchImpl: async () => response(200, [])
  });
  assert.equal(await store.compareAndSwapUserState('user-a', 4, { workouts: [] }), false);
});

test('rejects malformed state and user identifiers', async () => {
  const store = new SupabaseStore({
    url: 'https://example.supabase.co',
    secretKey: 'server-secret',
    fetchImpl: async () => response(200, [])
  });
  await assert.rejects(() => store.getUserState(''), /Invalid user ID/);
  await assert.rejects(() => store.compareAndSwapUserState('a', -1, {}), /expected revision/);
  await assert.rejects(() => store.compareAndSwapUserState('a', 0, []), /State must be an object/);
});

test('does not leak database error bodies', async () => {
  const store = new SupabaseStore({
    url: 'https://example.supabase.co',
    secretKey: 'server-secret',
    fetchImpl: async () => ({ ok: false, status: 401, async text() { return 'secret detail'; } })
  });
  await assert.rejects(() => store.getInstance(), error => {
    assert.ok(error instanceof SupabaseStoreError);
    assert.equal(error.status, 401);
    assert.equal(error.message.includes('secret detail'), false);
    return true;
  });
});

test('treats concurrent first writes as a clean conflict', async () => {
  const store = new SupabaseStore({
    url: 'https://example.supabase.co',
    secretKey: 'server-secret',
    fetchImpl: async () => response(409, { message: 'duplicate key' })
  });
  assert.equal(await store.compareAndSwapInstance(0, { users: [] }), false);
  assert.equal(await store.compareAndSwapUserState('user-a', 0, { workouts: [] }), false);
});
