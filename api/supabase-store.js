/**
 * Server-only Supabase PostgREST persistence adapter.
 *
 * This adapter deliberately uses the server-side secret key and must never be imported into the
 * frontend bundle. The API's current custom WebAuthn/password identity model remains authoritative;
 * Supabase Auth is not assumed. Reads and compare-and-swap writes are revisioned to avoid silently
 * overwriting a newer instance/state document.
 *
 * This module is not wired into server.js until the async persistence migration is completed.
 */
const DEFAULT_INSTANCE = { users: [], creds: [], subs: [], invites: [], deviceLinks: [] };

export class SupabaseStoreError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'SupabaseStoreError';
    this.status = status;
  }
}

export class SupabaseStore {
  constructor({ url, secretKey, fetchImpl = globalThis.fetch }) {
    if (!url || !secretKey) throw new TypeError('Supabase URL and server secret key are required');
    if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required');
    this.baseUrl = String(url).replace(/\/+$/, '');
    this.secretKey = secretKey;
    this.fetch = fetchImpl;
  }

  async request(table, query, { method = 'GET', body, prefer } = {}) {
    const url = new URL('/rest/v1/' + table, this.baseUrl);
    for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, value);
    const headers = {
      apikey: this.secretKey,
      Authorization: 'Bearer ' + this.secretKey,
      Accept: 'application/json'
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    let response;
    try {
      response = await this.fetch(url, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch {
      throw new SupabaseStoreError('Supabase request failed before receiving a response');
    }
    if (!response.ok) {
      // Avoid reflecting the response body: it can contain database details.
      throw new SupabaseStoreError('Supabase persistence request failed', response.status);
    }
    if (response.status === 204) return [];
    try { return await response.json(); }
    catch { throw new SupabaseStoreError('Supabase returned an invalid JSON response', response.status); }
  }

  async getInstance() {
    const rows = await this.request('gym_instance_store', {
      select: 'id,payload,revision,updated_at',
      id: 'eq.1',
      limit: '1'
    });
    return rows.length ? rows[0] : { id: 1, payload: structuredClone(DEFAULT_INSTANCE), revision: 0, updated_at: null };
  }

  async compareAndSwapInstance(expectedRevision, payload) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('Invalid expected revision');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('Instance payload must be an object');
    const row = {
      id: 1,
      payload,
      revision: expectedRevision + 1,
      updated_at: new Date().toISOString()
    };
    try {
      const rows = expectedRevision === 0
        ? await this.request('gym_instance_store', { on_conflict: 'id' }, {
            method: 'POST', body: row, prefer: 'return=representation'
          })
        : await this.request('gym_instance_store', { id: 'eq.1', revision: 'eq.' + expectedRevision }, {
            method: 'PATCH', body: { payload, revision: expectedRevision + 1, updated_at: row.updated_at },
            prefer: 'return=representation'
          });
      return rows.length > 0;
    } catch (error) {
      if (error instanceof SupabaseStoreError && error.status === 409) return false;
      throw error;
    }
  }

  async getUserState(userId) {
    if (typeof userId !== 'string' || !userId || userId.length > 160) throw new TypeError('Invalid user ID');
    const rows = await this.request('gym_user_state', {
      select: 'user_id,state,revision,updated_at',
      user_id: 'eq.' + userId,
      limit: '1'
    });
    return rows.length ? rows[0] : { user_id: userId, state: null, revision: 0, updated_at: null };
  }

  async compareAndSwapUserState(userId, expectedRevision, state) {
    if (typeof userId !== 'string' || !userId || userId.length > 160) throw new TypeError('Invalid user ID');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('Invalid expected revision');
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new TypeError('State must be an object');
    const updatedAt = new Date().toISOString();
    const rows = expectedRevision === 0
      ? await this.request('gym_user_state', { on_conflict: 'user_id' }, {
          method: 'POST',
          body: { user_id: userId, state, revision: 1, updated_at: updatedAt },
          prefer: 'return=representation'
        })
      : await this.request('gym_user_state', { user_id: 'eq.' + userId, revision: 'eq.' + expectedRevision }, {
          method: 'PATCH',
          body: { state, revision: expectedRevision + 1, updated_at: updatedAt },
          prefer: 'return=representation'
        });
    return rows.length > 0;
  }
}
