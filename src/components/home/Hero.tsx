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
    let raf = 0;
    const updateBackground = () => {
      raf = 0;
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const runway = Math.max(scrollable * 0.82, 1500);
      const progress = Math.min(window.scrollY / runway, 1);
      document.documentElement.style.setProperty('--da-bg-scale', (1.02 + progress * 0.22).toFixed(4));
      document.documentElement.style.setProperty('--da-bg-shift', `${(-20 * progress).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(updateBackground);
    };
    updateBackground();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty('--da-bg-scale');
      document.documentElement.style.removeProperty('--da-bg-shift');
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
    const demonVip = products.find((product) => {
      const value = `${product.name || ''} ${product.slug || ''}`.toLowerCase();
      return value.includes('demon vip');
    });
    const privateServer = products.find((product) => {
      const value = `${product.name || ''} ${product.slug || ''}`.toLowerCase();
      return value.includes('private server') || value.includes('private-server');
    });
    return [demonVip, privateServer].filter((product, index, list): product is Product =>
      Boolean(product) && list.findIndex((item) => item?.id === product?.id) === index
    );
  }, [products]);

  useEffect(() => {
    if (featuredProducts.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveFeature((current) => (current + 1) % featuredProducts.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [featuredProducts.length]);

  useEffect(() => {
    if (activeFeature >= featuredProducts.length) setActiveFeature(0);
  }, [activeFeature, featuredProducts.length]);

  const currentFeature = featuredProducts[activeFeature];
  const nextFeature = () => {
    if (featuredProducts.length > 1) setActiveFeature((activeFeature + 1) % featuredProducts.length);
  };
  const previousFeature = () => {
    if (featuredProducts.length > 1) setActiveFeature((activeFeature - 1 + featuredProducts.length) % featuredProducts.length);
  };

  return (
    <section className="da-home">
      <div className="da-home-bg" aria-hidden="true" />
      <div className="da-home-shade" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[100vh] max-w-7xl flex-col items-center justify-center px-4 pb-24 pt-28 text-center sm:px-6 lg:px-8">
        {store?.logo && (
          <img
            src={store.logo}
            alt={title}
            className="h-32 w-auto object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,.95)] sm:h-40 lg:h-48"
          />
        )}
        <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-white/75 drop-shadow-[0_2px_10px_#000] sm:text-base">
          VIP Coins. Demon VIP. Premium access to the DemonArk experience.
        </p>
        <Link
          to="/products"
          className="group mt-7 inline-flex items-center gap-3 rounded-xl border border-red-300/30 bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-9 py-4 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_12px_45px_rgba(220,38,38,.40)] transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:from-red-600 hover:via-red-500 hover:to-red-700 hover:shadow-[0_18px_65px_rgba(239,68,68,.58)]"
        >
          <ShoppingBag className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
          Shop DemonArk
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#151517]/78 px-4 py-2 text-[11px] font-semibold uppercase tracking-[.12em] text-zinc-300 backdrop-blur-md">
          <ShieldCheck className="h-3.5 w-3.5 text-red-400" /> Secure checkout by Tip4Serv
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <PortalCard
            image="/vipcoinpile.png"
            fallbackImage="/VIPCOINLOGO.png"
            title="VIP COINS"
            subtitle="Premium currency"
            href={categoryHref(['vip coin'])}
          />
          <PortalCard
            image="/demonarkvipbanner.png"
            title="DEMON VIP"
            subtitle="30 day membership"
            href={categoryHref(['demon vip'])}
          />
          <PortalCard
            image="/misccatagorylogo.png"
            title="MISC"
            subtitle="Extras and special items"
            href={categoryHref(['misc'])}
          />
          <PortalCard
            image="/privateservercatagorylogo.png"
            title="PRIVATE SERVERS"
            subtitle="Your own DemonArk experience"
            href={categoryHref(['private'])}
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[.24em] text-red-400">DemonArk picks</div>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Featured</h2>
          </div>
          {featuredProducts.length > 1 && (
            <div className="flex gap-2">
              <button onClick={previousFeature} aria-label="Previous featured item" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#171719]/85 text-zinc-200 transition hover:-translate-y-0.5 hover:border-red-500/50 hover:bg-[#202023] hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button onClick={nextFeature} aria-label="Next featured item" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#171719]/85 text-zinc-200 transition hover:-translate-y-0.5 hover:border-red-500/50 hover:bg-[#202023] hover:text-white">
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {currentFeature ? (
          <Link
            key={currentFeature.id}
            to={`/product/${currentFeature.slug}`}
            className="da-feature-slide group da-panel grid min-h-[420px] overflow-hidden rounded-3xl lg:grid-cols-[1.18fr_.82fr]"
          >
            <div className="relative min-h-[300px] overflow-hidden lg:min-h-[520px]">
              {currentFeature.image ? (
                <img src={currentFeature.image} alt={currentFeature.name} className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-[1.06]" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-zinc-900 to-black" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-[#111113]/80 lg:bg-gradient-to-r lg:from-transparent lg:via-black/5 lg:to-[#111113]" />
            </div>
            <div className="relative flex flex-col justify-center p-7 sm:p-10 lg:p-12">
              <div className="text-xs font-black uppercase tracking-[.22em] text-red-400">Featured DemonArk</div>
              <h3 className="mt-4 text-3xl font-black uppercase leading-tight text-white sm:text-4xl lg:text-5xl">{currentFeature.name}</h3>
              <div className="mt-5 text-3xl font-black text-white">{formatMoney(currentFeature.price, store?.currency)}</div>
              <div className="mt-7 inline-flex w-fit items-center gap-3 rounded-xl bg-red-700 px-6 py-3.5 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_12px_35px_rgba(185,28,28,.35)] transition group-hover:-translate-y-1 group-hover:bg-red-600 group-hover:shadow-[0_18px_45px_rgba(220,38,38,.5)]">
                View item <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="da-panel flex min-h-[320px] items-center justify-center rounded-3xl px-6 text-center text-zinc-400">
            Featured DemonArk items will appear here as soon as they are available.
          </div>
        )}

        {featuredProducts.length > 1 && (
          <div className="mt-5 flex justify-center gap-2">
            {featuredProducts.map((product, index) => (
              <button
                key={product.id}
                onClick={() => setActiveFeature(index)}
                aria-label={`Show ${product.name}`}
                className={`h-2.5 rounded-full transition-all ${index === activeFeature ? 'w-9 bg-red-500' : 'w-2.5 bg-white/25 hover:bg-white/45'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-32 sm:px-6 lg:px-8">
        <div className="da-panel rounded-3xl border-red-500/20 p-7 sm:p-10 lg:p-12">
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[.24em] text-red-400">DemonArk Store Policy</div>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Terms of Service</h2>
          </div>
          <div className="mt-9 space-y-4 text-sm leading-7 text-zinc-300 sm:text-base">
            <p>• All products sold through the DemonArk store are digital or in-game products for ARK: Survival Ascended.</p>
            <p>• Purchases are final and non-refundable except where a refund is required by applicable law or a verified technical issue is approved by DemonArk administration.</p>
            <p>• Items lost through normal gameplay, PvP, player mistakes, wipes, or other expected in-game events are not automatically replaced. Verified losses caused by a DemonArk server error, crash, or confirmed technical issue may be reviewed for replacement at staff discretion.</p>
            <p>• A ban or removal from DemonArk does not automatically qualify a purchase for a refund or compensation.</p>
            <p>• Players are responsible for entering the correct account, character, server, and other requested delivery information when purchasing. Changing maps, servers, or characters before fulfillment may interrupt delivery.</p>
            <p>• Subscription benefits, private-server services, and store offerings may be updated, replaced, or discontinued. Any material change will be handled according to the terms attached to that purchase and applicable law.</p>
            <p>• Abuse of chargebacks, fraudulent payments, exploits, or attempts to manipulate store delivery may result in store restrictions or account action.</p>
            <p className="pt-3 text-zinc-400">Personal information used for checkout or fulfillment is handled only for operating the DemonArk store and delivering purchases through the services involved in the transaction.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PortalCard({ image, fallbackImage, title, subtitle, href }: { image: string; fallbackImage?: string; title: string; subtitle: string; href: string }) {
  return (
    <Link
      to={href}
      className="da-portal group relative h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#131315]/85 transition duration-500 hover:-translate-y-2 hover:border-red-400/60 hover:shadow-[0_28px_80px_rgba(127,29,29,.34)] sm:h-[340px]"
    >
      <img
        src={image}
        alt={title}
        onError={(event) => {
          if (fallbackImage && event.currentTarget.src !== fallbackImage) event.currentTarget.src = fallbackImage;
        }}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:saturate-[1.14]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
        <div>
          <div className="text-2xl font-black text-white drop-shadow-lg">{title}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-red-300">{subtitle}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-red-400/40 bg-red-700/90 text-white shadow-[0_0_25px_rgba(239,68,68,.28)] transition duration-300 group-hover:scale-115 group-hover:bg-red-500 group-hover:shadow-[0_0_34px_rgba(239,68,68,.55)]">
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
      <div className="absolute inset-0 opacity-0 ring-1 ring-inset ring-red-400/60 transition group-hover:opacity-100" />
    </Link>
  );
}
