import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, Crown, Lock, Loader2, Minus, Plus, Server, ShieldCheck, ShoppingBag, ShoppingCart, Trash2, UserRound, Zap } from 'lucide-react';
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
  subscription?: {
    unsubscribed?: boolean;
  } | null;
};

type VipCoupon = {
  code: string;
  discount_percent: number;
  expires_at?: string;
};

function identifierLabel(id: string) {
  const labels: Record<string, string> = { email:'Email', username:'EOSID', eos_id:'EOSID', ingame_username:'In-game username', discord_id:'Discord ID', steam_id:'Steam ID', epic_id:'Epic Games ID', minecraft_username:'Username', rust_username:'Username', fivem_citizen_id:'Citizen ID' };
  return labels[id] || id.replace(/_/g, ' ');
}
function identifierPlaceholder(id: string) {
  if (id === 'email') return 'you@example.com';
  if (id === 'username' || id === 'eos_id') return 'Enter your EOSID';
  if (id === 'discord_id') return 'Discord user ID';
  return `Enter ${identifierLabel(id).toLowerCase()}`;
}

export default function DemonArkCheckoutPage() {
  const navigate=useNavigate(); const {items,removeItem,updateQuantity}=useCart(); const {store}=useStore(); const {addToast}=useToast(); const {token,user,connect,ready:authReady,loading:authLoading}=useTip4ServAuth(); const currency=store?.currency;
  const apiBaseUrl=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
  const [requiredIdentifiers,setRequiredIdentifiers]=useState<string[]>([]); const [identifierValues,setIdentifierValues]=useState<Record<string,string>>({}); const [discordTag,setDiscordTag]=useState(''); const [selectedServer,setSelectedServer]=useState('DemonArk 10x'); const [loadingInit,setLoadingInit]=useState(true); const [loadingCheckout,setLoadingCheckout]=useState(false); const [isRedirecting,setIsRedirecting]=useState(false); const [acceptedTerms,setAcceptedTerms]=useState(false); const [error,setError]=useState<string|null>(null);
  const [vipStatus,setVipStatus]=useState<VipStatus|null>(null); const [vipLoading,setVipLoading]=useState(false); const [vipCoupon,setVipCoupon]=useState<VipCoupon|null>(null); const [pendingPaymentUrl,setPendingPaymentUrl]=useState<string|null>(null); const [vipProductSlug,setVipProductSlug]=useState<string|null>(null);
  usePageTitle('Complete your order');
  const cartTotal=useMemo(()=>items.reduce((sum,item)=>sum+(item.product.price+computeExtrasPrice(item.product.custom_fields,item.customFieldValues))*item.quantity,0),[items]);
  const vipDiscountPercent=vipStatus?.active?Number(vipStatus.discount_percent||20):0;
  const vipPreviewTotal=cartTotal*(1-vipDiscountPercent/100);
  const cartHasDemonVip=useMemo(()=>items.some(item=>String(item.product.name||'').toUpperCase().includes('DEMON VIP')),[items]);
  const cartHasDemonVipSubscription=useMemo(()=>items.some(item=>item.purchaseType==='subscribe'&&String(item.product.name||'').toUpperCase().includes('DEMON VIP')),[items]);
  const alreadySubscribedToDemonVip=Boolean(vipStatus?.active&&(vipStatus.membership_type==='owner'||(vipStatus.membership_type==='recurring'&&!vipStatus.subscription?.unsubscribed)));
  const duplicateDemonVipSubscription=cartHasDemonVipSubscription&&alreadySubscribedToDemonVip;

  useEffect(()=>{ if(!items.length||!store?.id){setLoadingInit(false);return;} getCheckoutIdentifiers(store.id,items.map(i=>Number(i.product.id))).then(ids=>setRequiredIdentifiers(ids||[])).catch(()=>setRequiredIdentifiers([])).finally(()=>setLoadingInit(false)); },[items,store?.id]);
  useEffect(()=>{try{const saved=localStorage.getItem('demonark-checkout-profile');if(!saved)return;const p=JSON.parse(saved);if(p.identifiers)setIdentifierValues(p.identifiers);if(p.discordTag)setDiscordTag(p.discordTag);if(p.server&&LAUNCH_SERVERS.includes(p.server))setSelectedServer(p.server);}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem('demonark-checkout-profile',JSON.stringify({identifiers:identifierValues,discordTag,server:selectedServer}));}catch{}},[identifierValues,discordTag,selectedServer]);
  useEffect(()=>{if(!user?.email||!requiredIdentifiers.includes('email'))return;setIdentifierValues(prev=>prev.email?prev:{...prev,email:String(user.email)});},[user?.email,requiredIdentifiers]);
  useEffect(()=>{let cancelled=false;getAllProducts().then(products=>{const vip=products.find(p=>String(p.name||'').toUpperCase().includes('DEMON VIP'));if(!cancelled&&vip?.slug)setVipProductSlug(vip.slug);}).catch(()=>{});return()=>{cancelled=true;};},[]);

  useEffect(()=>{
    if(!token){setVipStatus(null);setVipCoupon(null);setPendingPaymentUrl(null);return;}
    let cancelled=false; setVipLoading(true);
    fetch(`${apiBaseUrl}/api/account/vip-status`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}})
      .then(async res=>{if(!res.ok)throw new Error('Unable to verify Demon VIP.');return res.json();})
      .then(data=>{if(!cancelled)setVipStatus({active:Boolean(data?.active),discount_percent:Number(data?.discount_percent||0),membership_type:data?.membership_type??null,subscription:data?.subscription??null});})
      .catch(()=>{if(!cancelled)setVipStatus(null);})
      .finally(()=>{if(!cancelled)setVipLoading(false);});
    return()=>{cancelled=true;};
  },[token,apiBaseUrl]);

  useEffect(()=>{
    if(!token||!requiredIdentifiers.length)return;
    let cancelled=false;
    fetch(`${apiBaseUrl}/api/account/identity`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}})
      .then(async res=>{if(!res.ok)throw new Error('Unable to load saved DemonArk identity.');return res.json();})
      .then(data=>{
        if(cancelled)return;
        const profile=data?.profile;
        if(!profile)return;
        if(profile.eos_id){
          const eosKey=requiredIdentifiers.find(id=>id==='username'||id==='eos_id');
          if(eosKey)setIdentifierValues(prev=>prev[eosKey]?prev:{...prev,[eosKey]:String(profile.eos_id)});
        }
        if(profile.discord_global_name||profile.discord_username)setDiscordTag(prev=>prev||String(profile.discord_global_name||profile.discord_username));
        if(profile.server_key&&LAUNCH_SERVERS.includes(String(profile.server_key)))setSelectedServer(String(profile.server_key));
      })
      .catch(()=>{});
    return()=>{cancelled=true;};
  },[token,requiredIdentifiers,apiBaseUrl]);

  const handleCheckout=useCallback(async()=>{
    if(!token){addToast('Connect your Tip4Serv account to continue checkout.','warning',4500);if(authReady)connect();return;}
    if(duplicateDemonVipSubscription){const msg='You already have an active DEMON VIP subscription. Remove the subscription from your cart to continue.';setError(msg);addToast(msg,'warning',5000);return;}
    if(!acceptedTerms){addToast('Please accept the store terms before continuing.','warning');return;} if(!store?.id){addToast('The store is unavailable right now. Please try again.','error');return;}
    for(const id of requiredIdentifiers){if(!identifierValues[id]?.trim()){addToast(`${identifierLabel(id)} is required.`,'warning');return;}} if(!discordTag.trim()){addToast('Discord Tag is required.','warning');return;} if(!selectedServer){addToast('Please select your DemonArk server.','warning');return;}
    setError(null);setLoadingCheckout(true);
    try{
      const eosKey=requiredIdentifiers.find(id=>id==='username'||id==='eos_id');
      const eosId=eosKey?identifierValues[eosKey]?.trim():'';
      const identityRes=await fetch(`${apiBaseUrl}/api/account/identity`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({eos_id:eosId||null,server_key:selectedServer})});
      const identityData=await identityRes.json().catch(()=>({}));
      if(!identityRes.ok)throw new Error(identityData?.error||'Unable to save your DemonArk player identity.');

      const products:CheckoutProduct[]=items.map(item=>{const cp:CheckoutProduct={product_id:Number(item.product.id),product_slug:item.product.slug,type:item.purchaseType||'addtocart',quantity:item.quantity};if(item.selectedServer!==undefined)cp.server_selection=item.selectedServer;if(item.product.custom_fields?.length){const validIds=new Set(item.product.custom_fields.map(f=>String(f.id)));const fields:Record<string,string|number>={};Object.entries(item.customFieldValues).forEach(([k,v])=>{if(validIds.has(k)&&v!==''&&v!==undefined&&v!==null)fields[k]=v;});if(Object.keys(fields).length)cp.custom_fields=fields;}return cp;});
      const checkoutUser:CheckoutUser={};requiredIdentifiers.forEach(id=>{const v=identifierValues[id]?.trim();if(v)(checkoutUser as Record<string,string>)[id]=v;});const origin=location.origin;const body:CheckoutBody={products,redirect_success_checkout:`${origin}/checkout/success`,redirect_canceled_checkout:`${origin}/checkout/canceled`};if(Object.keys(checkoutUser).length)body.user=checkoutUser;
      const result=await createCheckout(store.id,body);

      if(vipStatus?.active){
        const couponRes=await fetch(`${apiBaseUrl}/api/account/vip-checkout-coupon`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({product_ids:items.map(item=>Number(item.product.id))})});
        const couponData=await couponRes.json().catch(()=>({}));
        if(!couponRes.ok||!couponData?.code)throw new Error(couponData?.error||'Unable to prepare your Demon VIP discount.');
        setVipCoupon({code:String(couponData.code),discount_percent:Number(couponData.discount_percent||20),expires_at:couponData.expires_at});
        setPendingPaymentUrl(result.url);
        setLoadingCheckout(false);
        return;
      }

      setIsRedirecting(true);location.href=result.url;
    }catch(err){const msg=err instanceof Error?err.message.split('\n\nDEBUG_PAYLOAD:')[0]:'Checkout failed. Please try again.';setError(msg);addToast(msg,'error',5000);setLoadingCheckout(false);}
  },[token,authReady,connect,duplicateDemonVipSubscription,acceptedTerms,store,requiredIdentifiers,identifierValues,discordTag,selectedServer,items,addToast,apiBaseUrl,vipStatus]);

  const continueWithVipCoupon=useCallback(async()=>{
    if(!vipCoupon?.code||!pendingPaymentUrl)return;
    try{await navigator.clipboard.writeText(vipCoupon.code);addToast('VIP code copied. Paste it into the coupon field on Tip4Serv.','success',3500);}catch{addToast(`VIP code: ${vipCoupon.code}`,'info',6000);}
    setIsRedirecting(true);
    location.href=pendingPaymentUrl;
  },[vipCoupon,pendingPaymentUrl,addToast]);

  if(isRedirecting)return <div className="pt-36 pb-20 px-4 text-center"><div className="mx-auto max-w-md rounded-3xl border border-red-500/20 bg-[#19191b] p-8"><Lock className="mx-auto h-12 w-12 text-red-500"/><h1 className="mt-5 text-2xl font-black text-white">Opening secure payment</h1><p className="mt-3 text-zinc-400">You're being redirected to Tip4Serv to complete your purchase.</p><div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-red-400"><Loader2 className="h-4 w-4 animate-spin"/> Redirecting…</div></div></div>;
  if(!items.length&&!loadingInit)return <div className="pt-36 pb-20 px-4 text-center"><ShoppingBag className="mx-auto h-12 w-12 text-zinc-600"/><h1 className="mt-5 text-2xl font-black text-white">Your cart is empty</h1><Link to="/products" className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold text-white">Back to shop</Link></div>;
  if(!token)return <div className="pt-28 pb-20 px-4 animate-fade-in"><div className="mx-auto max-w-2xl"><button onClick={()=>navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft className="h-4 w-4"/> Back</button><div className="overflow-hidden rounded-3xl border border-red-500/20 bg-[#171719] shadow-[0_28px_80px_rgba(0,0,0,.45)]"><div className="border-b border-white/10 bg-gradient-to-br from-red-950/60 via-[#19191b] to-[#111113] p-7 text-center sm:p-9"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 shadow-[0_0_35px_rgba(220,38,38,.18)]"><Lock className="h-8 w-8 text-red-400"/></div><div className="mt-5 text-[11px] font-black uppercase tracking-[.22em] text-red-400">DemonArk secure checkout</div><h1 className="mt-2 text-3xl font-black text-white">Connect Tip4Serv to continue</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">A Tip4Serv account is required for every DemonArk purchase so we can securely attach your order, EOSID, VIP benefits, and purchase history to the correct player.</p></div><div className="p-6 sm:p-8"><div className="rounded-2xl border border-white/10 bg-[#202023] p-4"><div className="flex items-center justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.16em] text-zinc-500">Your cart is saved</div><div className="mt-1 font-bold text-white">{items.length} {items.length===1?'item':'items'} ready for checkout</div></div><div className="text-2xl font-black text-white">{formatMoney(cartTotal,currency)}</div></div></div><button type="button" onClick={connect} disabled={!authReady||authLoading} className="da-action-pulse mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-5 py-4 font-black text-white disabled:opacity-50">{authLoading?<><Loader2 className="h-5 w-5 animate-spin"/> Connecting…</>:<><UserRound className="h-5 w-5"/> Sign in / Create Tip4Serv account</>}</button><div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500"><ShieldCheck className="h-4 w-4 text-red-500"/> Your cart will still be here after sign-in.</div></div></div></div></div>;

  return <>
    {vipCoupon&&pendingPaymentUrl&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-red-500/25 bg-[#19191b] p-6 shadow-2xl"><div className="text-[11px] font-black uppercase tracking-[.2em] text-red-400">Demon VIP benefit</div><h2 className="mt-2 text-2xl font-black text-white">20% VIP discount ready</h2><p className="mt-3 text-sm leading-relaxed text-zinc-400">Tip4Serv currently requires the coupon to be entered on its secure checkout. Your private one-use VIP code is ready and expires shortly.</p><div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-400">Your VIP code</div><div className="mt-2 break-all text-xl font-black tracking-wider text-white">{vipCoupon.code}</div></div><div className="mt-4 rounded-xl bg-[#222225] p-3 text-xs leading-relaxed text-zinc-400">Tap below and we'll copy the code, then open Tip4Serv. Paste it into the <strong className="text-white">coupon</strong> field before paying.</div><button onClick={continueWithVipCoupon} className="da-action-pulse mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-5 py-4 font-black text-white"><Check className="h-5 w-5"/> Copy VIP code & open payment</button><button onClick={()=>{setVipCoupon(null);setPendingPaymentUrl(null);}} className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 hover:text-white">Back to checkout</button></div></div>}
    <div className="pt-24 lg:pt-28 pb-16 animate-fade-in"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div className="mb-7 flex items-center gap-2 text-sm text-zinc-500"><button onClick={()=>navigate(-1)} className="inline-flex items-center gap-2 hover:text-white"><ArrowLeft className="h-4 w-4"/> Back</button><span>/</span><span>Payment</span></div>
    <div className="mb-9"><div className="text-xs font-black uppercase tracking-[.22em] text-red-400">DemonArk checkout</div><h1 className="mt-2 text-3xl font-black text-white lg:text-4xl">Complete your order</h1><p className="mt-2 text-zinc-400">Confirm your items and player information before continuing to secure payment.</p></div>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12"><div className="space-y-8 lg:col-span-3">
      <section><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><ShoppingCart className="h-5 w-5 text-red-500"/> Order summary</h2><div className="space-y-3">{items.map(item=>{const total=(item.product.price+computeExtrasPrice(item.product.custom_fields,item.customFieldValues))*item.quantity;const image=item.product.image||item.product.gallery?.[0];return <div key={item.id} className="rounded-2xl border border-white/10 bg-[#19191b] p-4"><div className="flex gap-4">{image?<Link to={`/product/${item.product.slug}`}><img src={image} alt={item.product.name} className="h-20 w-20 rounded-xl object-cover"/></Link>:<div className="h-20 w-20 rounded-xl bg-[#222225]"/>}<div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><Link to={`/product/${item.product.slug}`} className="font-black text-white">{item.product.name}</Link><p className="mt-1 text-xs uppercase tracking-[.12em] text-zinc-500">{item.product.category?.name||'DemonArk'}</p></div><button onClick={()=>removeItem(item.id)} className="p-1.5 text-zinc-600 hover:text-red-400"><Trash2 className="h-4 w-4"/></button></div><div className="mt-4 flex items-center justify-between">{item.product.quantity?<div className="flex items-center rounded-lg border border-white/10 bg-[#222225]"><button onClick={()=>updateQuantity(item.id,Math.max(1,item.quantity-1))} className="h-8 w-8"><Minus className="mx-auto h-3.5 w-3.5"/></button><span className="w-8 text-center font-bold">{item.quantity}</span><button onClick={()=>updateQuantity(item.id,item.quantity+1)} className="h-8 w-8"><Plus className="mx-auto h-3.5 w-3.5"/></button></div>:<span className="text-xs text-zinc-500">Qty: {item.quantity}</span>}<span className="text-xl font-black text-white">{formatMoney(total,currency)}</span></div></div></div></div>})}</div></section>
      <section><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><UserRound className="h-5 w-5 text-red-500"/> Player information</h2><div className="rounded-2xl border border-white/10 bg-[#19191b] p-5 sm:p-6">{loadingInit?<div className="py-6 text-center text-zinc-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/> Loading checkout requirements…</div>:<div className="space-y-5"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300"><div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400"/><span><strong className="text-white">Tip4Serv account connected.</strong>{user?.email?` Email auto-filled as ${user.email}.`:' Your account details will stay synced.'}</span></div></div><div className={`rounded-xl border p-3 text-sm ${vipStatus?.active?'border-amber-400/25 bg-amber-400/5':'border-red-500/20 bg-gradient-to-br from-red-950/35 via-[#222225] to-[#19191b]'}`}>{vipLoading?<div className="flex items-center gap-2 text-zinc-400"><Loader2 className="h-4 w-4 animate-spin"/> Checking DEMON VIP…</div>:vipStatus?.active?<div className="flex items-center gap-2 text-amber-300"><Check className="h-4 w-4"/><span><strong className="text-white">DEMON VIP ACTIVE</strong> — 20% off this order is unlocked.</span></div>:cartHasDemonVip?<div className="flex items-center gap-2 text-zinc-300"><Crown className="h-4 w-4 text-amber-400"/><span><strong className="text-white">DEMON VIP is in your cart.</strong> Complete this purchase to unlock membership benefits.</span></div>:<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10"><Crown className="h-5 w-5 text-amber-300"/></div><div><div className="font-black text-white">Make every future order hit harder.</div><div className="mt-1 text-xs leading-relaxed text-zinc-400">Get DEMON VIP for <strong className="text-amber-300">20% off all future DemonArk Store orders</strong>, plus VIP access and member-only perks.</div></div></div><Link to={vipProductSlug?`/product/${vipProductSlug}`:'/products?category=demon-vip'} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-black text-black transition hover:bg-amber-300">Get DEMON VIP <ArrowRight className="h-3.5 w-3.5"/></Link></div>}</div><div className="grid gap-5 sm:grid-cols-2">{requiredIdentifiers.map(id=><label key={id} className={id==='email'?'sm:col-span-2':''}><span className="mb-2 block text-sm font-bold text-zinc-300">{identifierLabel(id)} <span className="text-red-400">*</span>{(id==='username'||id==='eos_id')&&<span className="ml-2 text-[10px] font-black uppercase tracking-[.14em] text-red-400">Player ID</span>}</span><input type={id==='email'?'email':'text'} value={identifierValues[id]||''} onChange={e=>setIdentifierValues(p=>({...p,[id]:e.target.value}))} placeholder={identifierPlaceholder(id)} className="input-field !bg-[#222225]"/>{id==='email'&&user?.email&&<span className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400"><Check className="h-3 w-3"/> Filled from your Tip4Serv account</span>}</label>)}<label><span className="mb-2 block text-sm font-bold text-zinc-300">Discord Tag <span className="text-red-400">*</span></span><input value={discordTag} onChange={e=>setDiscordTag(e.target.value)} placeholder="yourname or yourname#0000" className="input-field !bg-[#222225]"/><span className="mt-1.5 block text-[11px] text-zinc-500">Used by DemonArk staff if we need to contact you about this order.</span></label><label><span className="mb-2 block text-sm font-bold text-zinc-300">Server <span className="text-red-400">*</span></span><div className="relative"><Server className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400"/><select value={selectedServer} onChange={e=>setSelectedServer(e.target.value)} className="input-field !bg-[#222225] pl-10 pr-10 appearance-none cursor-pointer">{LAUNCH_SERVERS.map(s=><option key={s} value={s}>{s}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"/></div><span className="mt-1.5 block text-[11px] text-zinc-500">Player server: DemonArk 10x</span></label></div></div>}</div></section>
    </div><aside className="lg:col-span-2"><div className="lg:sticky lg:top-28"><div className="rounded-2xl border border-red-500/15 bg-[#19191b] p-6"><div className="text-xs font-black uppercase tracking-[.2em] text-red-400">Secure checkout</div><h2 className="mt-2 text-xl font-black text-white">Order total</h2><div className="mt-5 space-y-3 border-b border-white/10 pb-5">{items.map(item=>{const total=(item.product.price+computeExtrasPrice(item.product.custom_fields,item.customFieldValues))*item.quantity;return <div key={item.id} className="flex justify-between text-sm"><span className="truncate text-zinc-400">{item.product.name}{item.quantity>1?` ×${item.quantity}`:''}</span><span className="font-bold text-white">{formatMoney(total,currency)}</span></div>})}</div>{vipStatus?.active?<div className="pt-5"><div className="flex items-center justify-between text-sm"><span className="text-zinc-500">Regular total</span><span className="text-zinc-500 line-through">{formatMoney(cartTotal,currency)}</span></div><div className="mt-2 flex items-end justify-between"><span><span className="block font-bold text-amber-300">DEMON VIP −20%</span><span className="text-[11px] text-zinc-500">After applying your VIP coupon on Tip4Serv</span></span><span className="text-3xl font-black text-white">{formatMoney(vipPreviewTotal,currency)}</span></div></div>:<div className="flex items-end justify-between pt-5"><span className="font-bold text-zinc-300">Total</span><span className="text-3xl font-black text-white">{formatMoney(cartTotal,currency)}</span></div>}{duplicateDemonVipSubscription&&<div className="mt-5 flex gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-200"><CircleAlert className="h-4 w-4 shrink-0"/>You already have an active DEMON VIP subscription. Remove the subscription item from your cart to continue.</div>}{error&&<div className="mt-5 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><CircleAlert className="h-4 w-4 shrink-0"/>{error}</div>}<label className="mt-6 flex cursor-pointer gap-3"><input type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 accent-red-600"/><span className="text-xs leading-relaxed text-zinc-400">I confirm the player information above is correct and agree to the DemonArk store terms. Digital purchases are fulfilled according to the product and store policies. <span className="text-red-400">*</span></span></label><button onClick={handleCheckout} disabled={loadingCheckout||loadingInit||!acceptedTerms||vipLoading||duplicateDemonVipSubscription} className="da-action-pulse mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-5 py-4 font-black text-white disabled:opacity-50">{loadingCheckout?<><Loader2 className="h-5 w-5 animate-spin"/> Preparing payment…</>:<><Lock className="h-5 w-5"/> {duplicateDemonVipSubscription?'Already subscribed':vipStatus?.active?'Continue with VIP discount':'Continue to secure payment'}{!duplicateDemonVipSubscription&&<> — {formatMoney(vipStatus?.active?vipPreviewTotal:cartTotal,currency)}</>}</>}</button><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="flex items-center gap-2 rounded-xl bg-[#222225] p-3 text-zinc-400"><ShieldCheck className="h-4 w-4 text-red-500"/>Tip4Serv secured</div><div className="flex items-center gap-2 rounded-xl bg-[#222225] p-3 text-zinc-400"><Zap className="h-4 w-4 text-red-500"/>Fast fulfillment</div></div></div><div className="mt-5 rounded-2xl bg-[#19191b] p-4 text-xs text-zinc-500"><div className="mb-2 flex items-center gap-2 font-bold text-zinc-300"><Check className="h-4 w-4 text-red-500"/>Before you continue</div>Double-check your EOSID, Discord Tag, and selected server.</div></div></aside></div>
  </div></div>
  </>;
}
