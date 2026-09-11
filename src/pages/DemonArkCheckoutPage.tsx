import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, CircleAlert, Lock, Loader2, Minus, Plus, Server, ShieldCheck, ShoppingBag, ShoppingCart, Trash2, UserRound, Zap } from 'lucide-react';
import { useCart } from '../lib/cart';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { usePageTitle } from '../lib/usePageTitle';
import { computeExtrasPrice } from '../lib/pricing';
import { createCheckout, getCheckoutIdentifiers } from '../lib/api';
import { formatMoney } from '../lib/utils';
import type { CheckoutBody, CheckoutProduct, CheckoutUser } from '../lib/types';

const LAUNCH_SERVERS = ['DemonArk 10x'];

function identifierLabel(id: string) {
  const labels: Record<string, string> = {
    email: 'Email',
    username: 'EOSID',
    eos_id: 'EOSID',
    ingame_username: 'In-game username',
    discord_id: 'Discord ID',
    steam_id: 'Steam ID',
    epic_id: 'Epic Games ID',
    minecraft_username: 'Username',
    rust_username: 'Username',
    fivem_citizen_id: 'Citizen ID',
  };
  return labels[id] || id.replace(/_/g, ' ');
}

function identifierPlaceholder(id: string) {
  if (id === 'email') return 'you@example.com';
  if (id === 'username' || id === 'eos_id') return 'Paste your EOSID';
  if (id === 'discord_id') return 'Discord user ID';
  return `Enter ${identifierLabel(id).toLowerCase()}`;
}

export default function DemonArkCheckoutPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity } = useCart();
  const { store } = useStore();
  const { addToast } = useToast();
  const currency = store?.currency;
  const [requiredIdentifiers, setRequiredIdentifiers] = useState<string[]>([]);
  const [identifierValues, setIdentifierValues] = useState<Record<string, string>>({});
  const [discordTag, setDiscordTag] = useState('');
  const [selectedServer, setSelectedServer] = useState('DemonArk 10x');
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle('Complete your order');

  const cartTotal = useMemo(() => items.reduce((sum, item) => {
    const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues);
    return sum + (item.product.price + extras) * item.quantity;
  }, 0), [items]);

  useEffect(() => {
    if (!items.length || !store?.id) {
      setLoadingInit(false);
      return;
    }
    const productIds = items.map((item) => Number(item.product.id));
    getCheckoutIdentifiers(store.id, productIds)
      .then((ids) => setRequiredIdentifiers(ids || []))
      .catch(() => setRequiredIdentifiers([]))
      .finally(() => setLoadingInit(false));
  }, [items, store?.id]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('demonark-checkout-profile');
      if (!saved) return;
      const parsed = JSON.parse(saved) as { identifiers?: Record<string, string>; discordTag?: string; server?: string };
      if (parsed.identifiers) setIdentifierValues(parsed.identifiers);
      if (parsed.discordTag) setDiscordTag(parsed.discordTag);
      if (parsed.server && LAUNCH_SERVERS.includes(parsed.server)) setSelectedServer(parsed.server);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('demonark-checkout-profile', JSON.stringify({ identifiers: identifierValues, discordTag, server: selectedServer }));
    } catch { /* ignore */ }
  }, [identifierValues, discordTag, selectedServer]);

  const handleCheckout = useCallback(async () => {
    if (!acceptedTerms) {
      addToast('Please accept the store terms before continuing.', 'warning');
      return;
    }
    if (!store?.id) {
      addToast('The store is unavailable right now. Please try again.', 'error');
      return;
    }
    for (const id of requiredIdentifiers) {
      if (!identifierValues[id]?.trim()) {
        addToast(`${identifierLabel(id)} is required.`, 'warning');
        return;
      }
    }
    if (!discordTag.trim()) {
      addToast('Discord Tag is required.', 'warning');
      return;
    }
    if (!selectedServer) {
      addToast('Please select your DemonArk server.', 'warning');
      return;
    }

    setError(null);
    setLoadingCheckout(true);
    try {
      const products: CheckoutProduct[] = items.map((item) => {
        const cp: CheckoutProduct = {
          product_id: Number(item.product.id),
          product_slug: item.product.slug,
          type: item.purchaseType || 'addtocart',
          quantity: item.quantity,
        };
        if (item.selectedServer !== undefined) cp.server_selection = item.selectedServer;
        if (item.product.custom_fields?.length) {
          const validIds = new Set(item.product.custom_fields.map((field) => String(field.id)));
          const fields: Record<string, string | number> = {};
          Object.entries(item.customFieldValues).forEach(([key, value]) => {
            if (validIds.has(key) && value !== '' && value !== undefined && value !== null) fields[key] = value;
          });
          if (Object.keys(fields).length) cp.custom_fields = fields;
        }
        return cp;
      });

      const user: CheckoutUser = {};
      requiredIdentifiers.forEach((id) => {
        const value = identifierValues[id]?.trim();
        if (value) (user as Record<string, string>)[id] = value;
      });

      const origin = window.location.origin;
      const body: CheckoutBody = {
        products,
        redirect_success_checkout: `${origin}/checkout/success`,
        redirect_canceled_checkout: `${origin}/checkout/canceled`,
      };
      if (Object.keys(user).length) body.user = user;

      const result = await createCheckout(store.id, body);
      setIsRedirecting(true);
      window.location.href = result.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message.split('\n\nDEBUG_PAYLOAD:')[0] : 'Checkout failed. Please try again.';
      setError(msg);
      addToast(msg, 'error', 5000);
      setLoadingCheckout(false);
    }
  }, [acceptedTerms, store, requiredIdentifiers, identifierValues, discordTag, selectedServer, items, addToast]);

  if (isRedirecting) {
    return <div className="pt-36 pb-20 px-4 text-center"><div className="mx-auto max-w-md rounded-3xl border border-red-500/20 bg-[#19191b] p-8"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/15"><Lock className="h-8 w-8 text-red-500" /></div><h1 className="text-2xl font-black text-white">Opening secure payment</h1><p className="mt-3 text-zinc-400">You're being redirected to Tip4Serv to complete your purchase.</p><div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-red-400"><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</div></div></div>;
  }

  if (!items.length && !loadingInit) {
    return <div className="pt-36 pb-20 px-4 text-center"><ShoppingBag className="mx-auto h-12 w-12 text-zinc-600" /><h1 className="mt-5 text-2xl font-black text-white">Your cart is empty</h1><Link to="/products" className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold text-white">Back to shop</Link></div>;
  }

  return (
    <div className="pt-24 lg:pt-28 pb-16 animate-fade-in">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-center gap-2 text-sm text-zinc-500"><button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button><span>/</span><span>Payment</span></div>
        <div className="mb-9"><div className="text-xs font-black uppercase tracking-[.22em] text-red-400">DemonArk checkout</div><h1 className="mt-2 text-3xl font-black text-white lg:text-4xl">Complete your order</h1><p className="mt-2 text-zinc-400">Confirm your items and player information before continuing to secure payment.</p></div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
          <div className="space-y-8 lg:col-span-3">
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><ShoppingCart className="h-5 w-5 text-red-500" /> Order summary</h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues);
                  const lineTotal = (item.product.price + extras) * item.quantity;
                  const image = item.product.image || item.product.gallery?.[0];
                  return <div key={item.id} className="rounded-2xl border border-white/10 bg-[#19191b] p-4 shadow-[0_14px_40px_rgba(0,0,0,.22)]"><div className="flex gap-4">{image ? <Link to={`/product/${item.product.slug}`} className="shrink-0"><img src={image} alt={item.product.name} className="h-20 w-20 rounded-xl object-cover" /></Link> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#222225]"><ShoppingBag className="h-7 w-7 text-zinc-600" /></div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><Link to={`/product/${item.product.slug}`} className="font-black text-white hover:text-red-300">{item.product.name}</Link><p className="mt-1 text-xs uppercase tracking-[.12em] text-zinc-500">{item.product.category?.name || 'DemonArk'}</p></div><button onClick={() => removeItem(item.id)} className="p-1.5 text-zinc-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 flex items-center justify-between gap-3">{item.product.quantity ? <div className="flex items-center rounded-lg border border-white/10 bg-[#222225]"><button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="flex h-8 w-8 items-center justify-center text-zinc-400"><Minus className="h-3.5 w-3.5" /></button><span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center text-zinc-400"><Plus className="h-3.5 w-3.5" /></button></div> : <span className="text-xs text-zinc-500">Qty: {item.quantity}</span>}<span className="text-xl font-black text-white">{formatMoney(lineTotal, currency)}</span></div></div></div></div>;
                })}
              </div>
            </section>

            <section id="delivery-info">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><UserRound className="h-5 w-5 text-red-500" /> Player information</h2>
              <div className="rounded-2xl border border-white/10 bg-[#19191b] p-5 sm:p-6">
                {loadingInit ? <div className="flex items-center justify-center py-6 text-sm text-zinc-400"><Loader2 className="mr-2 h-4 w-4 animate-spin text-red-500" /> Loading checkout requirements…</div> : <div className="grid gap-5 sm:grid-cols-2">
                  {requiredIdentifiers.map((id) => <label key={id} className={id === 'email' ? 'sm:col-span-2' : ''}><span className="mb-2 block text-sm font-bold text-zinc-300">{identifierLabel(id)} <span className="text-red-400">*</span>{(id === 'username' || id === 'eos_id') && <span className="ml-2 text-[10px] font-black uppercase tracking-[.14em] text-red-400">Player ID</span>}</span><input type={id === 'email' ? 'email' : 'text'} value={identifierValues[id] || ''} onChange={(e) => setIdentifierValues((prev) => ({ ...prev, [id]: e.target.value }))} placeholder={identifierPlaceholder(id)} className="input-field !bg-[#222225]" /></label>)}

                  <label><span className="mb-2 block text-sm font-bold text-zinc-300">Discord Tag <span className="text-red-400">*</span></span><input value={discordTag} onChange={(e) => setDiscordTag(e.target.value)} placeholder="yourname or yourname#0000" className="input-field !bg-[#222225]" /><span className="mt-1.5 block text-[11px] text-zinc-500">Used by DemonArk staff if we need to contact you about this order.</span></label>

                  <label><span className="mb-2 block text-sm font-bold text-zinc-300">Server <span className="text-red-400">*</span></span><div className="relative"><Server className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" /><select value={selectedServer} onChange={(e) => setSelectedServer(e.target.value)} className="input-field !bg-[#222225] pl-10 pr-10 appearance-none cursor-pointer">{LAUNCH_SERVERS.map((server) => <option key={server} value={server}>{server}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /></div><span className="mt-1.5 block text-[11px] text-zinc-500">Launch server: DemonArk 10x</span></label>
                </div>}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-2">
            <div className="space-y-5 lg:sticky lg:top-28">
              <div className="rounded-2xl border border-red-500/15 bg-[#19191b] p-6 shadow-[0_20px_60px_rgba(0,0,0,.3)]">
                <div className="text-xs font-black uppercase tracking-[.2em] text-red-400">Secure checkout</div><h2 className="mt-2 text-xl font-black text-white">Order total</h2>
                <div className="mt-5 space-y-3 border-b border-white/10 pb-5 text-sm">{items.map((item) => { const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues); const total = (item.product.price + extras) * item.quantity; return <div key={item.id} className="flex justify-between gap-3"><span className="truncate text-zinc-400">{item.product.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span><span className="font-bold text-white">{formatMoney(total, currency)}</span></div>; })}</div>
                <div className="flex items-end justify-between pt-5"><span className="font-bold text-zinc-300">Total</span><span className="text-3xl font-black text-white">{formatMoney(cartTotal, currency)}</span></div>

                {error && <div className="mt-5 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

                <label className="mt-6 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 accent-red-600" /><span className="text-xs leading-relaxed text-zinc-400">I confirm the player information above is correct and agree to the DemonArk store terms. Digital purchases are fulfilled according to the product and store policies. <span className="text-red-400">*</span></span></label>

                <button onClick={handleCheckout} disabled={loadingCheckout || loadingInit || !acceptedTerms} className="da-action-pulse mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-5 py-4 text-base font-black text-white shadow-[0_14px_42px_rgba(220,38,38,.35)] transition hover:from-red-600 hover:via-red-500 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50">{loadingCheckout ? <><Loader2 className="h-5 w-5 animate-spin" /> Preparing payment…</> : <><Lock className="h-5 w-5" /> Continue to secure payment — {formatMoney(cartTotal, currency)}</>}</button>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#222225] p-3 text-zinc-400"><ShieldCheck className="h-4 w-4 shrink-0 text-red-500" /> Tip4Serv secured</div><div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#222225] p-3 text-zinc-400"><Zap className="h-4 w-4 shrink-0 text-red-500" /> Fast fulfillment</div></div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#19191b]/75 p-4 text-xs leading-relaxed text-zinc-500"><div className="mb-2 flex items-center gap-2 font-bold text-zinc-300"><Check className="h-4 w-4 text-red-500" /> Before you continue</div>Double-check your EOSID, Discord Tag, and selected server. Incorrect player information can delay delivery.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
