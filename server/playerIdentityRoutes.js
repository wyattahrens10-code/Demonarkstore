import express from 'express';
import { getPool } from './db.js';

const router = express.Router();
const TIP4SERV_BASE = 'https://api.tip4serv.com/v1';

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
