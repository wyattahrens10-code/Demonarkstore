import express from 'express';
import { randomBytes } from 'node:crypto';
import { getPool, getSetting } from './db.js';

const router = express.Router();
const TIP4SERV_BASE = 'https://api.tip4serv.com/v1';
const DEMON_VIP_NAME = 'DEMON VIP';
const DEMON_VIP_DISCOUNT_PERCENT = 20;
const DEMON_VIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const VIP_COUPON_TTL_MS = 15 * 60 * 1000;

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

async function loadStoreApiKey() {
  if (process.env.TIP4SERV_API_KEY) return process.env.TIP4SERV_API_KEY.trim();
  return (await getSetting('tip4serv_api_key')).trim();
}

function normalizedName(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizedIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function unixToMs(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1e12 ? n : n * 1000;
}

function getMembershipExpiresAt(subscription) {
  const explicitExpiry = unixToMs(subscription?.expire_date);
  if (explicitExpiry) return explicitExpiry;

  if (subscription?.onetime) {
    const startedAt = unixToMs(subscription?.start_date);
    if (startedAt) return startedAt + DEMON_VIP_DURATION_MS;
  }

  return 0;
}

function isActiveSubscription(subscription) {
  const status = String(subscription?.status || '').trim().toLowerCase();
  const paidStatus = [
    'paid',
    'active',
    'processed',
    'complete',
    'completed',
    'succeeded',
    'success',
  ].includes(status);
  if (!paidStatus) return false;

  const expiresAt = getMembershipExpiresAt(subscription);
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
  if (!response.ok) throw new Error('Unable to verify Demon VIP membership right now.');
  const data = await response.json();
  return Array.isArray(data) ? data : Array.isArray(data?.subscriptions) ? data.subscriptions : [];
}

async function loadRecentStorePayments() {
  const apiKey = await loadStoreApiKey();
  if (!apiKey) {
    console.warn('[DEMON_VIP_STORE_PAYMENTS_ERROR]', JSON.stringify({
      reason: 'missing_api_key',
    }));
    return [];
  }

  const params = new URLSearchParams({ page: '1', max_page: '50' });
  const response = await fetch(`${TIP4SERV_BASE}/store/payments?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const safeMessage = data?.error?.message ?? data?.message ?? data?.error ?? (raw ? raw.slice(0, 500) : null);
    console.warn('[DEMON_VIP_STORE_PAYMENTS_ERROR]', JSON.stringify({
      status: response.status,
      status_text: response.statusText || null,
      message: safeMessage ? String(safeMessage).slice(0, 500) : null,
    }));
    return [];
  }

  const payments = Array.isArray(data)
    ? data
    : Array.isArray(data?.payments)
      ? data.payments
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.results)
            ? data.results
            : [];

  console.log('[DEMON_VIP_STORE_PAYMENTS_RESPONSE]', JSON.stringify({
    status: response.status,
    top_level_type: Array.isArray(data) ? 'array' : data && typeof data === 'object' ? 'object' : typeof data,
    top_level_keys: data && !Array.isArray(data) && typeof data === 'object' ? Object.keys(data).slice(0, 20) : [],
    parsed_payment_count: payments.length,
  }));

  return payments;
}

function paymentBelongsToUser(payment, user) {
  const email = normalizedIdentifier(user?.email);
  const username = normalizedIdentifier(user?.username);
  const candidates = [
    payment?.identifier,
    payment?.email,
    payment?.customer_email,
    payment?.user_email,
  ].map(normalizedIdentifier).filter(Boolean);

  if (email && candidates.includes(email)) return true;
  if (username && candidates.includes(username)) return true;
  return false;
}

function findDemonVip(subscriptions) {
  return subscriptions.find((subscription) => {
    const name = normalizedName(subscription?.name);
    return name.includes(DEMON_VIP_NAME) && isActiveSubscription(subscription);
  }) || null;
}

function isPaidStatus(value) {
  return ['paid', 'active', 'processed', 'complete', 'completed', 'succeeded', 'success']
    .includes(String(value || '').trim().toLowerCase());
}

function findTestDemonVipPayment(payments, user) {
  const now = Date.now();

  return payments.find((payment) => {
    if (!paymentBelongsToUser(payment, user)) return false;
    if (String(payment?.mode || '').trim().toLowerCase() !== 'test') return false;
    if (!isPaidStatus(payment?.status)) return false;

    const cartText = normalizedName(
      typeof payment?.cart === 'string'
        ? payment.cart
        : payment?.cart?.name ?? payment?.product_name ?? payment?.name ?? '',
    );
    if (!cartText.includes(DEMON_VIP_NAME)) return false;

    const paidAt = unixToMs(payment?.date ?? payment?.created_at ?? payment?.start_date);
    if (!paidAt) return false;

    return paidAt + DEMON_VIP_DURATION_MS > now;
  }) || null;
}

function logVipDiagnostic(user, subscriptions, storePayments) {
  const safeSubscriptions = subscriptions.slice(0, 10).map((s) => ({
    id: s?.id ?? null,
    name: s?.name ?? null,
    status: s?.status ?? null,
    onetime: Boolean(s?.onetime),
    start_date: s?.start_date ?? null,
    expire_date: s?.expire_date ?? null,
    next_payment: s?.next_payment ?? null,
    unsubscribed: Boolean(s?.unsubscribed),
  }));
  const safePayments = storePayments.slice(0, 10).map((p) => ({
    id: p?.id ?? null,
    mode: p?.mode ?? null,
    status: p?.status ?? null,
    cart: p?.cart ?? null,
    sub_id: p?.sub_id ?? null,
    date: p?.date ?? null,
    amount: p?.amount ?? null,
    currency: p?.currency ?? null,
    gateway: p?.gateway ?? null,
    identifier_kind: p?.identifier ? (String(p.identifier).includes('@') ? 'email_like' : 'other') : null,
    belongs_to_authenticated_user: paymentBelongsToUser(p, user),
  }));

  console.log('[DEMON_VIP_DIAGNOSTIC]', JSON.stringify({
    tip4serv_user_id: Number(user?.id || 0),
    subscription_count: subscriptions.length,
    subscriptions: safeSubscriptions,
    raw_store_payment_count: storePayments.length,
    store_payments: safePayments,
  }));
}

async function getVerifiedVip(token, user) {
  const subscriptions = await loadUserSubscriptions(token);
  const liveVip = findDemonVip(subscriptions);
  if (liveVip) {
    return {
      source: 'subscription',
      vip: liveVip,
      expiresAt: getMembershipExpiresAt(liveVip),
      testMode: false,
    };
  }

  // Test-only fallback. Tip4Serv's customer endpoints omit test purchases, and
  // the store payment identifier filter can omit valid test rows. Fetch only the
  // latest store payment page privately, then match the authenticated customer
  // server-side. Explicit mode="test" is still mandatory, so this cannot grant
  // a production VIP entitlement from an unpaid/live transaction.
  const storePayments = await loadRecentStorePayments();
  logVipDiagnostic(user, subscriptions, storePayments);
  const testPayment = findTestDemonVipPayment(storePayments, user);
  if (!testPayment) return null;

  const paidAt = unixToMs(testPayment?.date ?? testPayment?.created_at ?? testPayment?.start_date);
  return {
    source: 'test_store_payment',
    vip: testPayment,
    expiresAt: paidAt + DEMON_VIP_DURATION_MS,
    testMode: true,
  };
}

router.get('/vip-status', requireTip4ServUser, async (req, res) => {
  try {
    const entitlement = await getVerifiedVip(req.tip4servToken, req.tip4servUser);
    const vip = entitlement?.vip || null;
    const expiresAt = entitlement?.expiresAt || 0;

    res.json({
      active: Boolean(entitlement),
      name: DEMON_VIP_NAME,
      discount_percent: entitlement ? DEMON_VIP_DISCOUNT_PERCENT : 0,
      mode: entitlement?.testMode ? 'test' : entitlement ? 'live' : null,
      membership_type: entitlement
        ? entitlement.testMode
          ? 'test_one_time'
          : vip?.onetime
            ? 'one_time'
            : 'recurring'
        : null,
      active_until: expiresAt ? new Date(expiresAt).toISOString() : null,
      subscription: entitlement && !entitlement.testMode ? {
        id: vip.id ?? null,
        status: vip.status ?? null,
        onetime: Boolean(vip.onetime),
        start_date: vip.start_date ?? null,
        next_payment: vip.next_payment ?? null,
        expire_date: vip.expire_date ?? null,
        unsubscribed: Boolean(vip.unsubscribed),
      } : null,
      test_payment: entitlement?.testMode ? {
        id: vip.id ?? null,
        status: vip.status ?? null,
        mode: vip.mode ?? null,
        date: vip.date ?? vip.created_at ?? null,
      } : null,
      verified_at: new Date().toISOString(),
    });
  } catch (err) {
    jsonError(res, 502, err instanceof Error ? err.message : 'Unable to verify Demon VIP membership.');
  }
});

router.post('/vip-checkout-coupon', requireTip4ServUser, async (req, res) => {
  try {
    const entitlement = await getVerifiedVip(req.tip4servToken, req.tip4servUser);
    if (!entitlement) return jsonError(res, 403, 'An active DEMON VIP membership is required for this discount.');

    const productIds = Array.from(new Set(
      (Array.isArray(req.body?.product_ids) ? req.body.product_ids : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ));
    if (!productIds.length) return jsonError(res, 400, 'At least one valid product is required.');

    const apiKey = await loadStoreApiKey();
    if (!apiKey) return jsonError(res, 500, 'Tip4Serv store API key is not configured.');

    const code = `DAVIP-${randomBytes(8).toString('hex').toUpperCase()}`;
    const expiration = Date.now() + VIP_COUPON_TTL_MS;
    const couponResponse = await fetch(`${TIP4SERV_BASE}/store/discount/coupon`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        type: 'percentage',
        value: DEMON_VIP_DISCOUNT_PERCENT,
        limit: 1,
        expiration,
        accepted_products: productIds,
      }),
    });
    const couponData = await couponResponse.json().catch(() => ({}));
    if (!couponResponse.ok || !couponData?.code) {
      const message = couponData?.error?.message || couponData?.message || couponData?.error || 'Unable to create VIP discount code.';
      return jsonError(res, couponResponse.status >= 400 && couponResponse.status < 500 ? 400 : 502, String(message));
    }

    await getPool().execute(
      `INSERT INTO vip_checkout_coupons
        (tip4serv_user_id, tip4serv_coupon_id, code, discount_percent, product_ids, expires_at)
       VALUES (:userId, :couponId, :code, :discountPercent, :productIds, FROM_UNIXTIME(:expiresSeconds))`,
      {
        userId: Number(req.tip4servUser.id),
        couponId: couponData.id ? Number(couponData.id) : null,
        code: String(couponData.code),
        discountPercent: DEMON_VIP_DISCOUNT_PERCENT,
        productIds: JSON.stringify(productIds),
        expiresSeconds: Math.floor(expiration / 1000),
      },
    );

    res.json({
      active: true,
      mode: entitlement.testMode ? 'test' : 'live',
      discount_percent: DEMON_VIP_DISCOUNT_PERCENT,
      code: String(couponData.code),
      expires_at: new Date(expiration).toISOString(),
      product_ids: productIds,
    });
  } catch (err) {
    jsonError(res, 502, err instanceof Error ? err.message : 'Unable to prepare Demon VIP discount.');
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
