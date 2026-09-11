import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { getCategories, getProducts } from '../../lib/api';
import { useStore } from '../../lib/store';
import { useT } from '../../lib/i18n';
import type { Category } from '../../lib/types';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Hero() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCount, setProductCount] = useState<number | null>(null);
  const { store } = useStore();
  const t = useT();

  useEffect(() => {
    getCategories()
      .then((res) => {
        if (res.categories?.length) setCategories(res.categories.filter((c) => !c.hide));
      })
      .catch(() => {});

    getProducts(1)
      .then((res) => setProductCount(res.product_count))
      .catch(() => {});
  }, []);

  const title = store?.title || 'DemonArk';
  const rawDescription = store?.description ? stripHtml(store.description) : '';
  const description = rawDescription || 'Power up your DemonArk experience with VIP Coins, premium bundles, and secure checkout.';

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-16 lg:pt-20">
      <div className="absolute inset-0">
        <img src="/background.png" alt="" className="w-full h-full object-cover scale-105 opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-volcanic-950 via-volcanic-950/95 to-volcanic-950/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-volcanic-950 via-transparent to-volcanic-950/75" />
        <div className="absolute inset-0 demon-grid opacity-60" />
      </div>

      <div className="pointer-events-none absolute -top-24 right-[8%] w-[34rem] h-[34rem] rounded-full bg-ark-600/14 blur-[120px] animate-glow-pulse" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-[18%] w-[28rem] h-[28rem] rounded-full bg-purple-900/16 blur-[120px] animate-glow-pulse" style={{ animationDelay: '1.2s' }} />
      <div className="pointer-events-none absolute top-[42%] right-[35%] w-56 h-56 rounded-full bg-red-900/10 blur-[90px]" />

      <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        <div className="grid lg:grid-cols-[1.08fr_.92fr] gap-12 lg:gap-16 items-center">
          <div className="max-w-3xl space-y-7">
            <div className="demon-kicker animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ark-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-ark-400" />
              </span>
              DemonArk Premium Store
            </div>

            <div className="space-y-4 animate-slide-up">
              <p className="text-sm sm:text-base text-ark-300 font-semibold uppercase tracking-[0.24em]">
                Built for the grind
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-[5.25rem] font-black text-heading leading-[0.96] tracking-[-0.045em] text-balance">
                Enter the <span className="text-gradient">DemonArk</span>
              </h1>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-volcanic-200/90 tracking-tight">
                VIP Coins. Premium access. No clutter.
              </h2>
            </div>

            <p
              className="text-base sm:text-lg text-volcanic-300 leading-relaxed max-w-2xl animate-slide-up"
              style={{ animationDelay: '0.08s', animationFillMode: 'both' }}
            >
              {description}
            </p>

            <div
              className="flex flex-col sm:flex-row gap-3 sm:items-center animate-slide-up"
              style={{ animationDelay: '0.16s', animationFillMode: 'both' }}
            >
              <Link to="/products" className="btn-primary group gap-2.5 px-7 py-4 text-base">
                <ShoppingBag className="w-5 h-5" />
                Shop VIP Coins
                <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <div className="flex items-center gap-2 text-sm text-volcanic-400 px-1 sm:px-3">
                <ShieldCheck className="w-4 h-4 text-ark-400" />
                Secure checkout powered by Tip4Serv
              </div>
            </div>

            <div
              className="grid grid-cols-3 max-w-xl pt-3 animate-slide-up"
              style={{ animationDelay: '0.24s', animationFillMode: 'both' }}
            >
              <StatBlock icon={<Sparkles className="w-4 h-4" />} value={productCount !== null ? String(productCount) : '...'} label="VIP Bundles" />
              <StatBlock icon={<Zap className="w-4 h-4" />} value="24/7" label="Store Access" />
              <StatBlock icon={<ShieldCheck className="w-4 h-4" />} value="100%" label="Secure" />
            </div>
          </div>

          <div className="relative hidden md:block animate-fade-in-up" style={{ animationDelay: '0.12s', animationFillMode: 'both' }}>
            <div className="absolute inset-10 rounded-full bg-ark-600/15 blur-[80px]" />
            <div className="absolute -inset-6 rounded-[2rem] border border-ark-500/5 rotate-3" />
            <div className="absolute -inset-3 rounded-[2rem] border border-ark-500/10 -rotate-2" />

            <div className="demon-logo-shell relative overflow-hidden min-h-[380px] lg:min-h-[470px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-ark-500/10 via-transparent to-red-950/10" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ark-400/60 to-transparent" />
              {store?.logo ? (
                <img
                  src={store.logo}
                  alt={title}
                  className="relative z-10 w-[70%] max-w-[390px] aspect-square object-contain drop-shadow-[0_0_38px_rgba(139,92,246,0.30)] transition-transform duration-700 hover:scale-[1.03]"
                />
              ) : (
                <div className="relative z-10 text-center px-8">
                  <div className="text-6xl lg:text-7xl font-black text-gradient tracking-[-0.06em]">DEMONARK</div>
                  <div className="mt-3 text-sm uppercase tracking-[0.35em] text-volcanic-400">Premium Store</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-volcanic-950 to-transparent" />
    </section>
  );
}

function StatBlock({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="group border-l border-ark-500/15 first:border-l-0 px-3 sm:px-5 first:pl-0">
      <div className="flex items-center gap-2 text-ark-400 mb-1.5">
        {icon}
        <span className="text-xl sm:text-2xl font-extrabold text-heading group-hover:text-ark-300 transition-colors duration-300">{value}</span>
      </div>
      <div className="text-[10px] sm:text-xs text-volcanic-500 uppercase tracking-[0.14em]">{label}</div>
    </div>
  );
}
