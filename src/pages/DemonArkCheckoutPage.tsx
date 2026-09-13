import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Crown,
  Lock,
  Loader2,
  Server,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react';
import CheckoutDiscordRequirement from '../components/checkout/CheckoutDiscordRequirement';
import { useCart } from '../lib/cart';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { usePageTitle } from '../lib/usePageTitle';
import { useTip4ServAuth } from '../lib/tip4servAuth';
import { computeExtrasPrice } from '../lib/pricing';
import { createCheckout, getAllProducts, getCheckoutIdentifiers } from '../lib/api';
import { formatMoney } from '../lib/utils';
import type { CheckoutBody, CheckoutProduct, CheckoutUser } from '../lib/types';

const LAUNCH_SERVERS = ['DemonArk 10x'];

type VipStatus = {
  active: boolean;
  discount_percent: number;
  membership_type?: 'owner' | 'test_one_time' | 'one_time' | 'recurring' | null;
  subscription?: { unsubscribed?: boolean } | null;
};

type VipCoupon = {
  code: string;
  discount_percent: number;
  expires_at?: string;
};

type DiscordRequirementState = {
  loading: boolean;
  linked: boolean;
  account: { id: string; username: string; globalName?: string } | null;
};

const identifierLabel = (id: string) =>
  ({ email: 'Email', username: 'EOSID', eos_id: 'EOSID', discord_id: 'Discord ID' } as Record<string, string>)[id] || id.replace(/_/g, ' ');

const identifierPlaceholder = (id: string) =>
  id === 'email' ? 'you@example.com' : id === 'username' || id === 'eos_id' ? 'Enter your EOSID' : `Enter ${identifierLabel(id).toLowerCase()}`;

export default function DemonArkCheckoutPage() {
  const navigate = useNavigate();
  const { items, removeItem } = useCart();
  const { store } = useStore();
  const { addToast } = useToast();
  const { token, user, connect, ready: authReady, loading: authLoading } = useTip4ServAuth();
  const currency = store?.currency;
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  const [requiredIdentifiers, setRequiredIdentifiers] = useState<string[]>([]);
  const [identifierValues, setIdentifierValues] = useState<Record<string, string>>({});
  const [selectedServer, setSelectedServer] = useState('DemonArk 10x');
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [vipLoading, setVipLoading] = useState(false);
  const [vipCoupon, setVipCoupon] = useState<VipCoupon | null>(null);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);
  const [vipProductSlug, setVipProductSlug] = useState<string | null>(null);
  const [showVipReminder, setShowVipReminder] = useState(false);
  const [discordState, setDiscordState] = useState<DiscordRequirementState>({ loading: true, linked: false, account: null });

  usePageTitle('Complete your order');

  const cartTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.product.price + computeExtrasPrice(item.product.custom_fields, item.customFieldValues)) * item.quantity, 0),
    [items],
  );
  const vipDiscountPercent = vipStatus?.active ? Number(vipStatus.discount_percent || 20) : 0;
  const vipPreviewTotal = cartTotal * (1 - vipDiscountPercent / 100);
  const vipSavings = Math.max(0, cartTotal - vipPreviewTotal);
  const cartHasDemonVip = useMemo(() => items.some((item) => String(item.product.name || '').toUpperCase().includes('DEMON VIP')), [items]);
  const cartHasDemonVipSubscription = useMemo(
    () => items.some((item) => item.purchaseType === 'subscribe' && String(item.product.name || '').toUpperCase().includes('DEMON VIP')),
    [items],
  );
  const alreadySubscribed = Boolean(
    vipStatus?.active &&
      (vipStatus.membership_type === 'owner' || (vipStatus.membership_type === 'recurring' && !vipStatus.subscription?.unsubscribed)),
  );
  const duplicateDemonVipSubscription = cartHasDemonVipSubscription && alreadySubscribed;

  useEffect(() => {
    if (!items.length || !store?.id) {
      setLoadingInit(false);
      return;
    }
    getCheckoutIdentifiers(store.id, items.map((item) => Number(item.product.id)))
      .then((value) => setRequiredIdentifiers(value || []))
      .catch(() => setRequiredIdentifiers([]))
      .finally(() => setLoadingInit(false));
  }, [items, store?.id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('demonark-checkout-profile');
      if (!saved) return;
      const profile = JSON.parse(saved);
      if (profile.identifiers) setIdentifierValues(profile.identifiers);
      if (profile.server && LAUNCH_SERVERS.includes(profile.server)) setSelectedServer(profile.server);
    } catch {
      // ignore malformed local convenience data
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('demonark-checkout-profile', JSON.stringify({ identifiers: identifierValues, server: selectedServer }));
    } catch {
      // storage is only a convenience cache
    }
  }, [identifierValues, selectedServer]);

  useEffect(() => {
    if (user?.email && requiredIdentifiers.includes('email')) {
      setIdentifierValues((previous) => (previous.email ? previous : { ...previous, email: String(user.email) }));
    }
  }, [user?.email, requiredIdentifiers]);

  useEffect(() => {
    let cancelled = false;
    getAllProducts()
      .then((products) => {
        const vip = products.find((product) => String(product.name || '').toUpperCase().includes('DEMON VIP'));
        if (!cancelled && vip?.slug) setVipProductSlug(vip.slug);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setVipStatus(null);
      return;
    }
    let cancelled = false;
    setVipLoading(true);
    fetch(`${apiBaseUrl}/api/account/vip-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) {
          setVipStatus({
            active: Boolean(data?.active),
            discount_percent: Number(data?.discount_percent || 0),
            membership_type: data?.membership_type ?? null,
            subscription: data?.subscription ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setVipStatus(null);
      })
      .finally(() => {
        if (!cancelled) setVipLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, apiBaseUrl]);

  useEffect(() => {
    if (!token || !requiredIdentifiers.length) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/account/identity`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (cancelled || !data?.profile) return;
        const profile = data.profile;
        const eosKey = requiredIdentifiers.find((id) => id === 'username' || id === 'eos_id');
        if (eosKey && profile.eos_id) {
          setIdentifierValues((values) => (values[eosKey] ? values : { ...values, [eosKey]: String(profile.eos_id) }));
        }
        if (profile.server_key && LAUNCH_SERVERS.includes(String(profile.server_key))) setSelectedServer(String(profile.server_key));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, requiredIdentifiers, apiBaseUrl]);

  const handleDiscordStateChange = useCallback((state: DiscordRequirementState) => {
    setDiscordState(state);
    if (state.account?.id) {
      setIdentifierValues((previous) => ({ ...previous, discord_id: state.account!.id }));
    }
  }, []);

  const goToVip = () => {
    setShowVipReminder(false);
    navigate(vipProductSlug ? `/product/${vipProductSlug}` : '/products?category=demon-vip');
  };

  const performCheckout = useCallback(async () => {
    setError(null);
    setLoadingCheckout(true);
    try {
      const eosKey = requiredIdentifiers.find((id) => id === 'username' || id === 'eos_id');
      const eosId = eosKey ? identifierValues[eosKey]?.trim() : '';
      const identityResponse = await fetch(`${apiBaseUrl}/api/account/identity`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eos_id: eosId || null, server_key: selectedServer }),
      });
      const identityData = await identityResponse.json().catch(() => ({}));
      if (!identityResponse.ok) throw new Error(identityData?.error || 'Unable to save your DemonArk player identity.');
      if (!identityData?.profile?.discord_id) throw new Error('A synced Discord account is required before checkout.');

      const products: CheckoutProduct[] = items.map((item) => ({
        product_id: Number(item.product.id),
        product_slug: item.product.slug,
        type: item.purchaseType || 'addtocart',
        quantity: item.quantity,
        ...(item.selectedServer !== undefined ? { server_selection: item.selectedServer } : {}),
      }));

      const checkoutUser: CheckoutUser = {};
      requiredIdentifiers.forEach((id) => {
        if (id === 'discord_id') {
          if (discordState.account?.id) (checkoutUser as Record<string, string>)[id] = discordState.account.id;
          return;
        }
        const value = identifierValues[id]?.trim();
        if (value) (checkoutUser as Record<string, string>)[id] = value;
      });

      const origin = location.origin;
      const body: CheckoutBody = {
        products,
        redirect_success_checkout: `${origin}/checkout/success`,
        redirect_canceled_checkout: `${origin}/checkout/canceled`,
      };
      if (Object.keys(checkoutUser).length) body.user = checkoutUser;

      const result = await createCheckout(store!.id, body);
      if (vipStatus?.active) {
        const couponResponse = await fetch(`${apiBaseUrl}/api/account/vip-checkout-coupon`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_ids: items.map((item) => Number(item.product.id)) }),
        });
        const couponData = await couponResponse.json().catch(() => ({}));
        if (!couponResponse.ok || !couponData?.code) throw new Error(couponData?.error || 'Unable to prepare your Demon VIP discount.');
        setVipCoupon({
          code: String(couponData.code),
          discount_percent: Number(couponData.discount_percent || 20),
          expires_at: couponData.expires_at,
        });
        setPendingPaymentUrl(result.url);
        setLoadingCheckout(false);
        return;
      }

      setIsRedirecting(true);
      location.href = result.url;
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : 'Checkout failed. Please try again.';
      setError(message);
      addToast(message, 'error', 5000);
      setLoadingCheckout(false);
    }
  }, [requiredIdentifiers, identifierValues, apiBaseUrl, token, selectedServer, items, store, vipStatus, addToast, discordState.account?.id]);

  const handleCheckout = () => {
    if (!token) {
      addToast('Connect your Tip4Serv account to continue checkout.', 'warning');
      if (authReady) connect();
      return;
    }
    if (discordState.loading || !discordState.linked || !discordState.account?.id) {
      addToast('Link and sync your Discord account to continue checkout.', 'warning');
      return;
    }
    if (duplicateDemonVipSubscription) {
      addToast('You already have an active DEMON VIP subscription.', 'warning');
      return;
    }
    if (!acceptedTerms) {
      addToast('Please accept the store terms before continuing.', 'warning');
      return;
    }
    if (!store?.id) return;
    for (const id of requiredIdentifiers) {
      if (id === 'discord_id') continue;
      if (!identifierValues[id]?.trim()) {
        addToast(`${identifierLabel(id)} is required.`, 'warning');
        return;
      }
    }
    if (!vipStatus?.active && !cartHasDemonVip) {
      setShowVipReminder(true);
      return;
    }
    void performCheckout();
  };

  const continueCoupon = async () => {
    if (!vipCoupon || !pendingPaymentUrl) return;
    try {
      await navigator.clipboard.writeText(vipCoupon.code);
    } catch {
      // Clipboard permission is optional; still open payment.
    }
    setIsRedirecting(true);
    location.href = pendingPaymentUrl;
  };

  if (isRedirecting) {
    return (
      <div className="pt-36 px-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-500" />
        <h1 className="mt-4 text-2xl font-black">Opening secure payment</h1>
      </div>
    );
  }

  if (!items.length && !loadingInit) {
    return (
      <div className="pt-36 px-4 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-zinc-600" />
        <h1 className="mt-5 text-2xl font-black">Your cart is empty</h1>
        <Link to="/products" className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold">Back to shop</Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="pt-28 pb-20 px-4">
        <div className="mx-auto max-w-2xl">
          <button onClick={() => navigate(-1)} className="mb-6 flex gap-2 text-zinc-500"><ArrowLeft className="h-4 w-4" />Back</button>
          <div className="overflow-hidden rounded-3xl border border-red-500/20 bg-[#171719]">
            <div className="p-8 text-center bg-gradient-to-br from-red-950/60 to-[#111113]">
              <Lock className="mx-auto h-12 w-12 text-red-400" />
              <div className="mt-5 text-xs font-black uppercase tracking-[.22em] text-red-400">DemonArk secure checkout</div>
              <h1 className="mt-2 text-3xl font-black">Connect Tip4Serv to continue</h1>
              <p className="mt-3 text-zinc-400">A Tip4Serv account is required for every DemonArk purchase so your order, EOSID, VIP benefits, Discord connection, and purchase history stay attached to the correct player.</p>
            </div>
            <div className="p-6">
              <div className="rounded-2xl bg-[#202023] p-4 flex justify-between">
                <div><b>Your cart is saved</b><div className="text-sm text-zinc-400">{items.length} item{items.length === 1 ? '' : 's'} ready</div></div>
                <b className="text-2xl">{formatMoney(cartTotal, currency)}</b>
              </div>
              <button onClick={connect} disabled={!authReady || authLoading} className="da-action-pulse mt-5 w-full rounded-xl bg-red-600 p-4 font-black">{authLoading ? 'Connecting…' : 'Sign in / Create Tip4Serv account'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showVipReminder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/25 bg-[#19191b] shadow-2xl">
            <div className="bg-gradient-to-br from-amber-500/15 via-red-950/20 to-[#19191b] p-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10"><Crown className="h-7 w-7 text-amber-300" /></div>
              <div className="mt-4 text-[11px] font-black uppercase tracking-[.2em] text-amber-300">One last thing</div>
              <h2 className="mt-2 text-2xl font-black">Don't miss your DEMON VIP savings</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">You're about to check out without DEMON VIP. Members get <strong className="text-amber-300">20% off all future DemonArk Store orders</strong>, plus more DEMON VIP perks.</p>
            </div>
            <div className="p-6 pt-0">
              <button onClick={goToVip} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-4 font-black text-black">Get DEMON VIP <ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => { setShowVipReminder(false); void performCheckout(); }} className="mt-3 w-full rounded-xl border border-white/10 bg-[#222225] px-5 py-3.5 text-sm font-bold text-zinc-300">No thanks, continue to payment</button>
              <p className="mt-3 text-center text-[11px] text-zinc-600">You can join DEMON VIP anytime.</p>
            </div>
          </div>
        </div>
      )}

      {vipCoupon && pendingPaymentUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-red-500/25 bg-[#19191b] p-6">
            <h2 className="text-2xl font-black">20% VIP discount ready</h2>
            <p className="mt-3 text-sm text-zinc-400">Your private one-use VIP code is ready. We'll copy it before opening Tip4Serv.</p>
            <div className="mt-5 rounded-xl bg-[#222225] p-4 text-center font-black">{vipCoupon.code}</div>
            <button onClick={continueCoupon} className="mt-5 w-full rounded-xl bg-red-600 p-4 font-black">Copy VIP code & open payment</button>
          </div>
        </div>
      )}

      <div className="pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <button onClick={() => navigate(-1)} className="mb-7 flex gap-2 text-zinc-500"><ArrowLeft className="h-4 w-4" />Back</button>
          <div className="mb-9">
            <div className="text-xs font-black uppercase tracking-[.22em] text-red-400">DemonArk checkout</div>
            <h1 className="mt-2 text-3xl font-black">Complete your order</h1>
            <p className="mt-2 text-zinc-400">Confirm your items and player information before continuing to secure payment.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
              <section>
                <h2 className="mb-4 flex gap-2 text-lg font-black"><ShoppingCart className="text-red-500" />Order summary</h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const image = item.product.image || item.product.gallery?.[0];
                    const total = (item.product.price + computeExtrasPrice(item.product.custom_fields, item.customFieldValues)) * item.quantity;
                    return (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-[#19191b] p-4 flex gap-4">
                        {image && <img src={image} className="h-20 w-20 rounded-xl object-cover" alt="" />}
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div><b>{item.product.name}</b><div className="text-xs text-zinc-500">{item.product.category?.name}</div></div>
                            <button onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4 text-zinc-600" /></button>
                          </div>
                          <div className="mt-5 flex justify-between"><span className="text-zinc-500">Qty: {item.quantity}</span><b className="text-xl">{formatMoney(total, currency)}</b></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="mb-4 flex gap-2 text-lg font-black"><UserRound className="text-red-500" />Player information</h2>
                <div className="rounded-2xl border border-white/10 bg-[#19191b] p-5 space-y-5">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm"><Check className="mr-2 inline h-4 w-4 text-emerald-400" /><b>Tip4Serv account connected.</b>{user?.email && ` Email auto-filled as ${user.email}.`}</div>

                  {vipLoading ? (
                    <div>Checking DEMON VIP…</div>
                  ) : vipStatus?.active ? (
                    <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3"><b>DEMON VIP ACTIVE</b> — {vipDiscountPercent || 20}% off this order.</div>
                  ) : cartHasDemonVip ? (
                    <div className="rounded-xl border border-red-500/20 p-3"><Crown className="mr-2 inline h-4 w-4 text-amber-300" /><b>DEMON VIP is in your cart.</b></div>
                  ) : (
                    <div className="rounded-xl border border-red-500/20 p-4">
                      <div className="flex gap-3"><Crown className="text-amber-300" /><div><b>Make every future order hit harder.</b><p className="mt-1 text-sm text-zinc-400">Get DEMON VIP for <strong className="text-amber-300">20% off all future DemonArk Store orders</strong>, plus VIP perks.</p></div></div>
                      <button onClick={goToVip} className="mt-4 w-full rounded-lg bg-amber-400 p-2.5 font-black text-black">Get DEMON VIP</button>
                    </div>
                  )}

                  {requiredIdentifiers.filter((id) => id !== 'discord_id').map((id) => (
                    <label key={id} className="block">
                      <b className="text-sm">{identifierLabel(id)} *</b>
                      <input type={id === 'email' ? 'email' : 'text'} value={identifierValues[id] || ''} onChange={(event) => setIdentifierValues((previous) => ({ ...previous, [id]: event.target.value }))} placeholder={identifierPlaceholder(id)} className="input-field mt-2 !bg-[#222225]" />
                    </label>
                  ))}

                  <div>
                    <div className="mb-2 text-sm font-bold">Discord account <span className="text-red-400">*</span></div>
                    <CheckoutDiscordRequirement onStateChange={handleDiscordStateChange} />
                  </div>

                  <label className="block">
                    <b>Server *</b>
                    <div className="relative mt-2">
                      <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
                      <select value={selectedServer} onChange={(event) => setSelectedServer(event.target.value)} className="input-field !bg-[#222225] pl-10">
                        {LAUNCH_SERVERS.map((server) => <option key={server}>{server}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    </div>
                  </label>
                </div>
              </section>
            </div>

            <aside className="lg:col-span-2">
              <div className="lg:sticky lg:top-28 rounded-2xl border border-red-500/15 bg-[#19191b] p-6">
                <div className="text-xs font-black uppercase tracking-[.2em] text-red-400">Secure checkout</div>
                <h2 className="mt-2 text-xl font-black">Order total</h2>
                <div className="mt-5 border-b border-white/10 pb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-zinc-400">{item.product.name}</span>
                      <b>{formatMoney((item.product.price + computeExtrasPrice(item.product.custom_fields, item.customFieldValues)) * item.quantity, currency)}</b>
                    </div>
                  ))}
                </div>

                {vipStatus?.active && (
                  <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[.06] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-black text-amber-200"><Crown className="h-4 w-4 text-amber-300" />DEMON VIP DISCOUNT</div>
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-black text-amber-300">{vipDiscountPercent || 20}% OFF</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-400"><span>VIP savings applied</span><b className="text-emerald-400">−{formatMoney(vipSavings, currency)}</b></div>
                  </div>
                )}

                <div className="flex items-end justify-between pt-5">
                  <b>Total</b>
                  <div className="text-right">
                    {vipStatus?.active && <div className="text-sm text-zinc-600 line-through">{formatMoney(cartTotal, currency)}</div>}
                    <span className="text-3xl font-black">{formatMoney(vipStatus?.active ? vipPreviewTotal : cartTotal, currency)}</span>
                  </div>
                </div>

                {error && <div className="mt-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300"><CircleAlert className="mr-2 inline h-4 w-4" />{error}</div>}

                <label className="mt-6 flex gap-3">
                  <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 accent-red-600" />
                  <span className="text-xs text-zinc-400">I confirm the player information above is correct and agree to the DemonArk store terms.</span>
                </label>

                <button
                  onClick={handleCheckout}
                  disabled={loadingCheckout || loadingInit || !acceptedTerms || vipLoading || duplicateDemonVipSubscription || discordState.loading || !discordState.linked}
                  className="da-action-pulse mt-6 w-full rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 p-4 font-black disabled:opacity-50"
                >
                  <Lock className="mr-2 inline h-5 w-5" />
                  {loadingCheckout
                    ? 'Preparing payment…'
                    : vipStatus?.active
                      ? `Continue with ${vipDiscountPercent || 20}% VIP discount — ${formatMoney(vipPreviewTotal, currency)}`
                      : `Continue to secure payment — ${formatMoney(cartTotal, currency)}`}
                </button>

                {!discordState.loading && !discordState.linked && (
                  <p className="mt-3 text-center text-[11px] font-semibold text-[#7289da]">Link Discord above to unlock payment.</p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[#222225] p-3 text-zinc-400"><ShieldCheck className="mr-1 inline h-4 w-4 text-red-500" />Tip4Serv secured</div>
                  <div className="rounded-xl bg-[#222225] p-3 text-zinc-400"><Zap className="mr-1 inline h-4 w-4 text-red-500" />Fast fulfillment</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
