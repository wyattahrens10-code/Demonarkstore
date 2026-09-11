import express from 'express';
import { getPool } from './db.js';

const router = express.Router();
const TIP4SERV_BASE = 'https://api.tip4serv.com/v1';
const DEMON_VIP_NAME = 'DEMON VIP';
const DEMON_VIP_DISCOUNT_PERCENT = 20;

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

async function requireTip4ServUser(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return jsonError(res, 401, 'Tip4Serv account authentication required.');

  try {
    const response = await fetch(`${TIP4SERV_BASE}/user/whoami`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) return jsonError(res, 401, 'Invalid or expired Tip4Serv session.');
    const data = await response.json();
    const user = data?.user ?? data;
    if (!user?.id) return jsonError(res, 401, 'Unable to identify Tip4Serv account.');
    req.tip4servUser = user;
    req.tip4servToken = token;
    next();
  } catch {
    return jsonError(res, 502, 'Unable to verify Tip4Serv account right now.');
  }
}

async function ensureProfile(user) {
  await getPool().execute(
    `INSERT INTO player_identity_profiles
      (tip4serv_user_id, tip4serv_username, email)
     VALUES (:id, :username, :email)
     ON DUPLICATE KEY UPDATE
      tip4serv_username = VALUES(tip4serv_username),
      email = VALUES(email)`,
    {
      id: Number(user.id),
      username: user.username ? String(user.username) : null,
      email: user.email ? String(user.email) : null,
    },
  );
}

function normalizedName(value) {
  return String(value || '').trim().toUpperCase();
}

function unixToMs(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1e12 ? n : n * 1000;
}

function isActiveSubscription(subscription) {
  const status = String(subscription?.status || '').trim().toLowerCase();
  const activeStatus = ['active', 'processed', 'complete', 'completed', 'succeeded', 'success'].includes(status);
  if (!activeStatus) return false;

  const expiresAt = unixToMs(subscription?.expire_date);
  if (expiresAt && expiresAt <= Date.now()) return false;

  return true;
}

async function loadUserSubscriptions(token) {
  const params = new URLSearchParams({ page: '1', max_page: '100', only_recurring_subscription: 'false' });
  const response = await fetch(`${TIP4SERV_BASE}/user/subscriptions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error('Unable to verify Demon VIP subscription right now.');
  const data = await response.json();
  return Array.isArray(data) ? data : Array.isArray(data?.subscriptions) ? data.subscriptions : [];
}

function findDemonVip(subscriptions) {
  return subscriptions.find((subscription) => {
    const name = normalizedName(subscription?.name);
    return name === DEMON_VIP_NAME && isActiveSubscription(subscription);
  }) || null;
}

router.get('/vip-status', requireTip4ServUser, async (req, res) => {
  try {
    const subscriptions = await loadUserSubscriptions(req.tip4servToken);
    const vip = findDemonVip(subscriptions);

    res.json({
      active: Boolean(vip),
      name: DEMON_VIP_NAME,
      discount_percent: vip ? DEMON_VIP_DISCOUNT_PERCENT : 0,
      subscription: vip ? {
        id: vip.id ?? null,
        status: vip.status ?? null,
        start_date: vip.start_date ?? null,
        next_payment: vip.next_payment ?? null,
        expire_date: vip.expire_date ?? null,
        unsubscribed: Boolean(vip.unsubscribed),
      } : null,
      verified_at: new Date().toISOString(),
    });
  } catch (err) {
    jsonError(res, 502, err instanceof Error ? err.message : 'Unable to verify Demon VIP subscription.');
  }
});

router.get('/identity', requireTip4ServUser, async (req, res) => {
  try {
    await ensureProfile(req.tip4servUser);
    const [rows] = await getPool().execute(
      `SELECT tip4serv_user_id, tip4serv_username, email,
              discord_id, discord_username, discord_global_name,
              eos_id, server_key, created_at, updated_at
         FROM player_identity_profiles
        WHERE tip4serv_user_id = :id
        LIMIT 1`,
      { id: Number(req.tip4servUser.id) },
    );
    res.json({ profile: rows[0] || null });
  } catch (err) {
    jsonError(res, 500, err instanceof Error ? err.message : 'Unable to load player identity.');
  }
});

router.put('/identity', requireTip4ServUser, async (req, res) => {
  try {
    const user = req.tip4servUser;
    await ensureProfile(user);

    const discordId = req.body?.discord_id === undefined ? undefined : String(req.body.discord_id || '').trim() || null;
    const discordUsername = req.body?.discord_username === undefined ? undefined : String(req.body.discord_username || '').trim() || null;
    const discordGlobalName = req.body?.discord_global_name === undefined ? undefined : String(req.body.discord_global_name || '').trim() || null;
    const eosId = req.body?.eos_id === undefined ? undefined : String(req.body.eos_id || '').trim() || null;
    const serverKey = req.body?.server_key === undefined ? undefined : String(req.body.server_key || '').trim() || null;

    const updates = [];
    const params = { id: Number(user.id) };

    if (discordId !== undefined) { updates.push('discord_id = :discordId'); params.discordId = discordId; }
    if (discordUsername !== undefined) { updates.push('discord_username = :discordUsername'); params.discordUsername = discordUsername; }
    if (discordGlobalName !== undefined) { updates.push('discord_global_name = :discordGlobalName'); params.discordGlobalName = discordGlobalName; }
    if (eosId !== undefined) { updates.push('eos_id = :eosId'); params.eosId = eosId; }
    if (serverKey !== undefined) { updates.push('server_key = :serverKey'); params.serverKey = serverKey; }

    if (updates.length) {
      await getPool().execute(
        `UPDATE player_identity_profiles SET ${updates.join(', ')} WHERE tip4serv_user_id = :id`,
        params,
      );
    }

    const [rows] = await getPool().execute(
      `SELECT tip4serv_user_id, tip4serv_username, email,
              discord_id, discord_username, discord_global_name,
              eos_id, server_key, created_at, updated_at
         FROM player_identity_profiles
        WHERE tip4serv_user_id = :id
        LIMIT 1`,
      { id: Number(user.id) },
    );
    res.json({ profile: rows[0] || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save player identity.';
    if (message.includes('Duplicate entry') && message.includes('discord_id')) {
      return jsonError(res, 409, 'That Discord account is already linked to another DemonArk account.');
    }
    jsonError(res, 500, message);
  }
});

router.delete('/discord', requireTip4ServUser, async (req, res) => {
  try {
    await ensureProfile(req.tip4servUser);
    await getPool().execute(
      `UPDATE player_identity_profiles
          SET discord_id = NULL,
              discord_username = NULL,
              discord_global_name = NULL
        WHERE tip4serv_user_id = :id`,
      { id: Number(req.tip4servUser.id) },
    );
    res.json({ ok: true });
  } catch (err) {
    jsonError(res, 500, err instanceof Error ? err.message : 'Unable to unlink Discord.');
  }
});

export default router;
