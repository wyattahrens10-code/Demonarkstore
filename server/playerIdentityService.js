const EOSID_RE = /^[a-f0-9]{32}$/i;
const TOKEN_RE = /^[a-f0-9]{64}$/i;

function enabled(name) {
  return process.env[name] === 'true';
}

function configuration() {
  const baseUrl = String(process.env.PLAYER_IDENTITY_API_BASE_URL || '').trim().replace(/\/$/, '');
  const token = String(process.env.INTERNAL_PLAYER_SERVICE_TOKEN || '').trim();
  const configured = /^https:\/\//i.test(baseUrl) && TOKEN_RE.test(token);
  return {
    baseUrl,
    token,
    readEnabled: enabled('PLAYER_IDENTITY_READ_ENABLED'),
    syncEnabled: enabled('PLAYER_IDENTITY_SYNC_ENABLED'),
    configured,
  };
}

export class PlayerIdentityServiceError extends Error {
  constructor(code, status = 503) {
    super(code);
    this.name = 'PlayerIdentityServiceError';
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  const config = configuration();
  if (!config.configured) throw new PlayerIdentityServiceError('PLAYER_IDENTITY_SERVICE_UNCONFIGURED');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new PlayerIdentityServiceError(
        typeof data?.error === 'string' ? data.error : 'PLAYER_IDENTITY_SERVICE_ERROR',
        response.status,
      );
    }
    return data;
  } catch (error) {
    if (error instanceof PlayerIdentityServiceError) throw error;
    throw new PlayerIdentityServiceError(error?.name === 'AbortError' ? 'PLAYER_IDENTITY_SERVICE_TIMEOUT' : 'PLAYER_IDENTITY_SERVICE_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}

export function playerIdentityFlags() {
  const config = configuration();
  return {
    readEnabled: config.readEnabled && config.configured,
    syncEnabled: config.syncEnabled && config.configured,
  };
}

export async function loadCanonicalIdentity(tip4servUserId) {
  const id = String(tip4servUserId || '');
  if (!/^[1-9][0-9]{0,19}$/.test(id)) throw new PlayerIdentityServiceError('INVALID_TIP4SERV_USER_ID', 400);
  return request(`/api/internal/player/by-tip4serv/${encodeURIComponent(id)}`);
}

export async function syncAcknowledgedIdentity(profile) {
  const eosid = String(profile?.eos_id || '').trim().toLowerCase();
  const tip4servUserId = String(profile?.tip4serv_user_id || '');
  if (!EOSID_RE.test(eosid)) throw new PlayerIdentityServiceError('INVALID_EOSID', 400);
  if (!profile?.eos_acknowledged_at) throw new PlayerIdentityServiceError('EOSID_NOT_ACKNOWLEDGED', 409);

  const body = {
    eosid,
    tip4serv_user_id: tip4servUserId,
    // EOSID is the durable game identity. This is only an admin-facing label
    // until the game later reports the character's current name.
    player_name: String(profile.tip4serv_username || `Tip4Serv ${tip4servUserId}`).slice(0, 191),
    email: profile.email || null,
  };
  if (profile.discord_id) {
    body.discord_id = String(profile.discord_id);
    body.discord_username = profile.discord_username || null;
    body.discord_global_name = profile.discord_global_name || null;
  }
  return request('/api/internal/player/sync', { method: 'POST', body: JSON.stringify(body) });
}

export function canonicalProfile(player) {
  return {
    tip4serv_user_id: player.tip4serv_user_id,
    tip4serv_username: null,
    email: player.email,
    discord_id: player.discord_id,
    discord_username: player.discord_username,
    discord_global_name: player.discord_global_name,
    eos_id: player.eosid,
    server_key: null,
    eos_acknowledged_at: player.tip4serv_user_id ? player.updated_at : null,
    discord_verified_at: player.discord_id ? player.updated_at : null,
    discord_verification_method: player.discord_id ? 'canonical' : null,
    created_at: player.created_at,
    updated_at: player.updated_at,
  };
}
