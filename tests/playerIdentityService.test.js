import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalProfile,
  loadCanonicalIdentity,
  playerIdentityFlags,
  syncAcknowledgedIdentity,
} from '../server/playerIdentityService.js';

const ORIGINAL_ENV = { ...process.env };
const TOKEN = 'a'.repeat(64);

function configured() {
  process.env.PLAYER_IDENTITY_API_BASE_URL = 'https://identity.example';
  process.env.INTERNAL_PLAYER_SERVICE_TOKEN = TOKEN;
}

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete global.fetch;
});

test('feature flags remain off unless configuration and explicit flags are present', () => {
  process.env.PLAYER_IDENTITY_READ_ENABLED = 'true';
  assert.deepEqual(playerIdentityFlags(), { readEnabled: false, syncEnabled: false });
  configured();
  assert.deepEqual(playerIdentityFlags(), { readEnabled: true, syncEnabled: false });
});

test('canonical lookup uses server authentication without exposing it in the URL', async () => {
  configured();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ player: { tip4serv_user_id: '228127' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  const result = await loadCanonicalIdentity('228127');
  assert.equal(result.player.tip4serv_user_id, '228127');
  assert.equal(request.url, 'https://identity.example/api/internal/player/by-tip4serv/228127');
  assert.equal(request.options.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(request.url.includes(TOKEN), false);
});

test('sync requires checkout acknowledgement before forwarding an EOSID', async () => {
  configured();
  const base = {
    tip4serv_user_id: '228127',
    eos_id: '0002a7f4c9f81b3d6f20500000000000',
    email: 'owner@example.invalid',
    discord_id: '998566532570546176',
  };
  await assert.rejects(() => syncAcknowledgedIdentity(base), { code: 'EOSID_NOT_ACKNOWLEDGED' });

  let sent;
  global.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ player: {}, changed: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  await syncAcknowledgedIdentity({ ...base, eos_acknowledged_at: new Date() });
  assert.equal(sent.eosid, base.eos_id);
  assert.equal(sent.tip4serv_user_id, '228127');
  assert.equal(sent.discord_id, base.discord_id);
  assert.equal(sent.player_name, 'Tip4Serv 228127');
});

test('acknowledged identity metadata is forwarded and canonical records map to Store fields', async () => {
  configured();
  let sent;
  global.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ player: {} }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  const profile = {
    tip4serv_user_id: '228127',
    eos_id: '0002a7f4c9f81b3d6f20500000000000',
    eos_acknowledged_at: new Date(),
    discord_id: '998566532570546176',
    discord_username: 'tester',
  };
  await syncAcknowledgedIdentity(profile);
  assert.equal(sent.discord_id, profile.discord_id);

  const mapped = canonicalProfile({
    tip4serv_user_id: '228127', eosid: profile.eos_id, discord_id: profile.discord_id,
    email: null, discord_username: 'tester', discord_global_name: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
  });
  assert.equal(mapped.eos_id, profile.eos_id);
  assert.ok(mapped.eos_acknowledged_at);
});
