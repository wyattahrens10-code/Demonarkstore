import { getPool } from './db.js';
import { playerIdentityFlags, syncAcknowledgedIdentity } from './playerIdentityService.js';

export async function enqueueIdentitySync(tip4servUserId) {
  await getPool().execute(`INSERT INTO player_identity_sync_outbox
    (tip4serv_user_id, status, attempts, next_attempt_at)
    VALUES (:id, 'pending', 0, NOW())
    ON DUPLICATE KEY UPDATE status = 'pending', next_attempt_at = NOW(), updated_at = NOW()`,
  { id: tip4servUserId });
}

export async function attemptIdentitySync(profile) {
  if (!playerIdentityFlags().syncEnabled || !profile?.eos_acknowledged_at) {
    return { attempted: false };
  }
  await enqueueIdentitySync(profile.tip4serv_user_id);
  try {
    const result = await syncAcknowledgedIdentity(profile);
    await getPool().execute(`UPDATE player_identity_sync_outbox
      SET status = 'synced', attempts = attempts + 1, last_error_code = NULL,
          synced_at = NOW(), updated_at = NOW()
      WHERE tip4serv_user_id = :id`, { id: profile.tip4serv_user_id });
    return { attempted: true, synced: true, result };
  } catch (error) {
    const code = String(error?.code || 'PLAYER_IDENTITY_SERVICE_UNAVAILABLE').slice(0, 64);
    await getPool().execute(`UPDATE player_identity_sync_outbox
      SET status = :status, attempts = attempts + 1, last_error_code = :code,
          next_attempt_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE), updated_at = NOW()
      WHERE tip4serv_user_id = :id`,
    { id: profile.tip4serv_user_id, code, status: error?.status === 409 || error?.status === 400 ? 'blocked' : 'pending' });
    return { attempted: true, synced: false, code };
  }
}

export async function drainIdentitySyncOutbox(limit = 10) {
  if (!playerIdentityFlags().syncEnabled) return { processed: 0 };
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const [rows] = await getPool().query(`SELECT p.* FROM player_identity_sync_outbox o
    JOIN player_identity_profiles p ON p.tip4serv_user_id = o.tip4serv_user_id
    WHERE o.status = 'pending' AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= NOW())
      AND p.eos_acknowledged_at IS NOT NULL
    ORDER BY o.next_attempt_at ASC, o.updated_at ASC LIMIT ${safeLimit}`);
  for (const profile of rows) await attemptIdentitySync(profile);
  return { processed: rows.length };
}

export function startIdentitySyncWorker() {
  const run = () => drainIdentitySyncOutbox().catch((error) => {
    console.warn('Identity sync worker failed', { code: error?.code || 'UNKNOWN' });
  });
  const initial = setTimeout(run, 5000);
  const interval = setInterval(run, 60_000);
  initial.unref?.();
  interval.unref?.();
  return () => { clearTimeout(initial); clearInterval(interval); };
}
