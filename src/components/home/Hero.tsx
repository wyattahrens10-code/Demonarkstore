import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useStore } from '../../lib/store';
import { getAllProducts, getCategories } from '../../lib/api';
import { formatMoney } from '../../lib/utils';
import type { Category, Product } from '../../lib/types';

export default function Hero() {
  const { store } = useStore();
  const title = store?.title || 'DemonArk';
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeFeature, setActiveFeature] = useState(0);
  const discordUrl = 'https://discord.gg/CgVqbyGr4E';
  const lightweightMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategories(), getAllProducts()])
      .then(([categoryResponse, productResponse]) => {
        if (cancelled) return;
        setCategories(categoryResponse.categories ?? []);
        setProducts(productResponse);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setProducts([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const background = document.querySelector<HTMLElement>('.da-home-bg');
    if (!background) return;

    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const baseScale = mobile ? 1.055 : 1.035;
    const travel = mobile ? -120 : -82;
    const stableViewportHeight = window.innerHeight;
    const scrollRange = Math.max(document.documentElement.scrollHeight - stableViewportHeight, 1);
    let raf = 0;

    // Translation-only parallax. The texture stays at one constant scale so
    // mobile WebKit never has to continually resample/zoom the full-screen image.
    const render = () => {
      raf = 0;
      const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
      const shift = travel * progress;
      background.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0) scale(${baseScale})`;
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(render);
    };

    render();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      background.style.removeProperty('transform');
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    let raf = 0;
    let nextX = 50;
    let nextY = 35;
    const commit = () => {
      raf = 0;
      document.documentElement.style.setProperty('--da-pointer-x', `${nextX.toFixed(2)}%`);
      document.documentElement.style.setProperty('--da-pointer-y', `${nextY.toFixed(2)}%`);
    };
    const onPointerMove = (event: PointerEvent) => {
      nextX = (event.clientX / window.innerWidth) * 100;
      nextY = (event.clientY / window.innerHeight) * 100;
      if (!raf) raf = window.requestAnimationFrame(commit);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (raf) window.cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty('--da-pointer-x');
      document.documentElement.style.removeProperty('--da-pointer-y');
    };
  }, []);

  const categoryHref = (needles: string[]) => {
    const category = categories.find((cat) => {
      const haystack = `${cat.name || ''} ${cat.slug || ''}`.toLowerCase();
      return needles.some((needle) => haystack.includes(needle));
    });
    return category ? `/products?category=${encodeURIComponent(category.slug)}` : '/products';
  };

  const featuredProducts = useMemo(() => {
    const demonVip = products.find((product) => `${product.name || ''} ${product.slug || ''}`.toLowerCase().includes('demon vip'));
    const privateServer = products.find((product) => {
      const value = `${product.name || ''} ${product.slug || ''}`.toLowerCase();
      return value.includes('private server') || value.includes('private-server');
    });
    return [demonVip, privateServer].filter((product, index, list): product is Product => Boolean(product) && list.findIndex((item) => item?.id === product?.id) === index);
  }, [products]);

  const vipCoinProductImage = useMemo(() => products.find((product) => `${product.name || ''} ${product.slug || ''}`.toLowerCase().includes('vip coin'))?.image || null, [products]);
  const demonVipProductImage = useMemo(() => products.find((product) => `${product.name || ''} ${product.slug || ''}`.toLowerCase().includes('demon vip'))?.image || null, [products]);

  useEffect(() => {
    if (featuredProducts.length < 2) return;
    const timer = window.setInterval(() => setActiveFeature((current) => (current + 1) % featuredProducts.length), 5500);
    return () => window.clearInterval(timer);
  }, [featuredProducts.length]);

  useEffect(() => {
    if (activeFeature >= featuredProducts.length) setActiveFeature(0);
  }, [activeFeature, featuredProducts.length]);

  const currentFeature = featuredProducts[activeFeature];
  const nextFeature = () => { if (featuredProducts.length > 1) setActiveFeature((activeFeature + 1) % featuredProducts.length); };
  const previousFeature = () => { if (featuredProducts.length > 1) setActiveFeature((activeFeature - 1 + featuredProducts.length) % featuredProducts.length); };

  return (
    <section className="da-home">
      <div className="da-home-bg-frame" aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: -9, pointerEvents: 'none', contain: 'strict' }}>
        <div className="da-home-bg" style={{ position: 'absolute', inset: lightweightMobile ? '-10%' : '-14%', width: 'auto', height: 'auto', zIndex: 0 }} />
      </div>

      {!lightweightMobile && <div className="da-fire-glow" aria-hidden="true" />}
      {!lightweightMobile && <div className="da-smoke da-smoke-a" aria-hidden="true" />}
      {!lightweightMobile && <div className="da-smoke da-smoke-b" aria-hidden="true" />}
      <div className="da-home-shade" aria-hidden="true" />
      <div className="da-embers da-embers-far" aria-hidden="true" />
      <div className="da-embers da-embers-mid" aria-hidden="true" />
      <div className="da-embers da-embers-near" aria-hidden="true" />
      {!lightweightMobile && <div className="da-red-flare" aria-hidden="true" />}
      {!lightweightMobile && <div className="da-heat-haze" aria-hidden="true" />}
      <div className="da-pointer-glow" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-24 text-center sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
        {store?.logo && (
          <Link to="/" className="da-logo-pulse group block" aria-label="Back to DemonArk home">
            <img src={store.logo} alt={title} className="da-logo-base h-32 w-auto object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,.95)] transition-transform duration-150 ease-out group-hover:scale-[.90] sm:h-40 lg:h-48" />
          </Link>
        )}

        <p className="mt-9 max-w-md text-sm font-medium leading-relaxed text-white/80 drop-shadow-[0_2px_10px_#000] sm:text-base">VIP Coins. Demon VIP. Premium access to the DemonArk experience.</p>

        <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-4 sm:w-auto sm:min-w-[360px]">
          <Link to="/products" className="da-action-pulse group inline-flex items-center justify-center gap-3 rounded-xl border border-red-300/30 bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-8 py-4 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_12px_45px_rgba(220,38,38,.40)] transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:from-red-600 hover:via-red-500 hover:to-red-700 hover:shadow-[0_18px_65px_rgba(239,68,68,.58)]">
            <ShoppingBag className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" /> Shop DemonArk <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </Link>
          <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="da-action-pulse da-discord-button group inline-flex items-center justify-center gap-3 rounded-xl border border-white/12 bg-[#18181b]/90 px-8 py-3.5 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_12px_35px_rgba(0,0,0,.35)] transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-red-400/45 hover:bg-[#202024]">
            <img src="/Demonarkdiscordlgo.png" alt="" className="h-8 w-8 object-contain transition-transform duration-200 group-hover:rotate-[-5deg] group-hover:scale-110" /> Join Discord <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </a>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#151517]/88 px-4 py-2 text-[11px] font-semibold uppercase tracking-[.12em] text-zinc-300"><ShieldCheck className="h-3.5 w-3.5 text-red-400" /> Secure checkout by Tip4Serv</div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-40 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.04fr_.96fr] lg:items-stretch">
          <div className="min-h-[420px] lg:min-h-[560px]">
            {currentFeature ? (
              <Link key={currentFeature.id} to={`/product/${currentFeature.slug}`} className="da-feature-slide group da-panel relative flex h-full min-h-[420px] overflow-hidden rounded-3xl lg:min-h-[560px]" style={lightweightMobile ? { backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(17,17,19,.94)' } : undefined}>
                {currentFeature.image ? <img src={currentFeature.image} alt={currentFeature.name} className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-[1.06]" /> : <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-zinc-900 to-black" />}
                <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-black/25 to-black/5" />
                <div className="absolute left-5 top-5 z-10 rounded-full border border-red-400/25 bg-[#151517]/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-red-300 sm:left-6 sm:top-6">Featured DemonArk</div>
                {featuredProducts.length > 1 && (
                  <div className="absolute right-5 top-5 z-20 flex gap-2 sm:right-6 sm:top-6">
                    <button onClick={(event) => { event.preventDefault(); previousFeature(); }} aria-label="Previous featured item" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#171719]/92 text-zinc-200 transition hover:border-red-500/50 hover:bg-[#202023] hover:text-white"><ArrowLeft className="h-4 w-4" /></button>
                    <button onClick={(event) => { event.preventDefault(); nextFeature(); }} aria-label="Next featured item" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#171719]/92 text-zinc-200 transition hover:border-red-500/50 hover:bg-[#202023] hover:text-white"><ArrowRight className="h-4 w-4" /></button>
                  </div>
                )}
                <div className="relative z-10 mt-auto w-full p-7 text-left sm:p-9 lg:p-10">
                  <h2 className="max-w-xl text-3xl font-black uppercase leading-tight text-white sm:text-4xl lg:text-5xl">{currentFeature.name}</h2>
                  <div className="mt-4 text-3xl font-black text-white">{formatMoney(currentFeature.price, store?.currency)}</div>
                  <div className="mt-6 inline-flex w-fit items-center gap-3 rounded-xl bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_12px_35px_rgba(185,28,28,.35)] transition group-hover:-translate-y-1 group-hover:bg-red-600 group-hover:shadow-[0_18px_45px_rgba(220,38,38,.5)]">View item <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
                  {featuredProducts.length > 1 && <div className="mt-5 flex gap-2">{featuredProducts.map((product, index) => <button key={product.id} onClick={(event) => { event.preventDefault(); setActiveFeature(index); }} aria-label={`Show ${product.name}`} className={`h-2.5 rounded-full transition-all ${index === activeFeature ? 'w-9 bg-red-500' : 'w-2.5 bg-white/30 hover:bg-white/50'}`} />)}</div>}
                </div>
              </Link>
            ) : <div className="da-panel flex h-full min-h-[420px] items-center justify-center rounded-3xl px-6 text-center text-zinc-400 lg:min-h-[560px]">Featured DemonArk items will appear here as soon as they are available.</div>}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-rows-2">
            <PortalCard image="/vipcoinpile.png?v=20260911" fallbackImage={vipCoinProductImage || '/VIPCOINLOGO.png?v=20260911'} title="VIP COINS" subtitle="Premium currency" href={categoryHref(['vip coin'])} />
            <PortalCard image="/demonarkvipbanner.png?v=20260911" fallbackImage={demonVipProductImage || undefined} title="DEMON VIP" subtitle="30 day membership" href={categoryHref(['demon vip'])} />
            <PortalCard image="/misccatagorylogo.png?v=20260911" title="MISC" subtitle="Extras and special items" href={categoryHref(['misc'])} />
            <PortalCard image="/privateservercatagorylogo.png?v=20260911" title="PRIVATE SERVERS" subtitle="Your own DemonArk experience" href={categoryHref(['private'])} />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-40 pt-8 sm:px-6 lg:px-8">
        <div className="da-panel rounded-3xl border-red-500/20 p-7 sm:p-10 lg:p-12" style={lightweightMobile ? { backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(17,17,19,.94)' } : undefined}>
          <div className="text-center"><div className="text-xs font-black uppercase tracking-[.24em] text-red-400">DemonArk Store Policy</div><h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Terms of Service</h2></div>
          <div className="mt-9 space-y-4 text-sm leading-7 text-zinc-300 sm:text-base">
            <p>• All products sold through the DemonArk store are digital or in-game products for ARK: Survival Ascended.</p><p>• Purchases are final and non-refundable except where a refund is required by applicable law or a verified technical issue is approved by DemonArk administration.</p><p>• Items lost through normal gameplay, PvP, player mistakes, wipes, or other expected in-game events are not automatically replaced. Verified losses caused by a DemonArk server error, crash, or confirmed technical issue may be reviewed for replacement at staff discretion.</p><p>• A ban or removal from DemonArk does not automatically qualify a purchase for a refund or compensation.</p><p>• Players are responsible for entering the correct account, character, server, and other requested delivery information when purchasing. Changing maps, servers, or characters before fulfillment may interrupt delivery.</p><p>• Subscription benefits, private-server services, and store offerings may be updated, replaced, or discontinued. Any material change will be handled according to the terms attached to that purchase and applicable law.</p><p>• Abuse of chargebacks, fraudulent payments, exploits, or attempts to manipulate store delivery may result in store restrictions or account action.</p><p className="pt-3 text-zinc-400">Personal information used for checkout or fulfillment is handled only for operating the DemonArk store and delivering purchases through the services involved in the transaction.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PortalCard({ image, fallbackImage, title, subtitle, href }: { image: string; fallbackImage?: string; title: string; subtitle: string; href: string }) {
  const [src, setSrc] = useState(image);
  useEffect(() => setSrc(image), [image]);

  return (
    <Link to={href} className="da-portal group relative h-[175px] overflow-hidden rounded-2xl border border-white/10 bg-[#131315]/85 transition duration-500 hover:-translate-y-1.5 hover:border-red-400/60 hover:shadow-[0_24px_60px_rgba(127,29,29,.30)] sm:h-[230px] lg:h-full lg:min-h-[270px]">
      <img src={src} alt={title} loading="eager" fetchPriority="high" decoding="async" onError={() => { if (fallbackImage && src !== fallbackImage) setSrc(fallbackImage); }} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:saturate-[1.14]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5"><div className="min-w-0"><div className="text-base font-black leading-tight text-white drop-shadow-lg sm:text-xl">{title}</div><div className="mt-1 hidden text-[10px] font-bold uppercase tracking-[.14em] text-red-300 sm:block">{subtitle}</div></div><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-400/40 bg-red-700/90 text-white shadow-[0_0_20px_rgba(239,68,68,.24)] transition duration-300 group-hover:scale-110 group-hover:bg-red-500"><ArrowRight className="h-4 w-4" /></div></div>
    </Link>
  );
}
