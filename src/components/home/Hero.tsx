import { Link } from 'react-router-dom';
import { ArrowRight, Crown, ShieldCheck, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function Hero() {
  const { store } = useStore();
  const title = store?.title || 'DemonArk';

  return (
    <section className="relative overflow-hidden border-b border-red-500/10 bg-[#070709]">
      <div className="relative min-h-[760px] lg:min-h-[820px]">
        <img src="/background.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,7,.18)_0%,rgba(7,7,9,.76)_62%,#070709_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,9,.82),rgba(7,7,9,.18)_48%,rgba(80,5,8,.18))]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-14">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-red-500/25 bg-black/55 backdrop-blur-xl shadow-[0_30px_100px_rgba(0,0,0,.65)] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <div className="px-6 sm:px-10 lg:px-14 py-10 lg:py-12 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.22em] text-red-300">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" /> Official DemonArk Store
              </div>
              <div className="mt-6 flex justify-center">
                {store?.logo ? <img src={store.logo} alt={title} className="h-28 sm:h-36 lg:h-40 w-auto object-contain drop-shadow-[0_0_30px_rgba(239,68,68,.35)]" /> : <Sparkles className="h-24 w-24 text-red-500" />}
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-.045em] text-white">WELCOME TO <span className="text-red-500">DEMONARK</span></h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base lg:text-lg leading-relaxed text-slate-300">Premium upgrades, VIP access, and DemonArk currency in one clean storefront. Pick what you need and get back to the Ark.</p>
              <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
                <Link to="/products" className="btn-primary px-8 py-4 group"><ShoppingBag className="h-5 w-5" /> Browse the Store <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-slate-300"><ShieldCheck className="h-4 w-4 text-red-400" /> Secure checkout by Tip4Serv</div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link to="/products" className="group rounded-2xl border border-red-500/20 bg-[#101012]/90 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-red-500/55 hover:shadow-[0_18px_45px_rgba(220,38,38,.12)]">
              <div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><Zap className="h-5 w-5" /></div><ArrowRight className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-red-400" /></div>
              <h2 className="mt-6 text-xl font-black text-white">VIP COINS</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Choose a coin package and power up your DemonArk account.</p><div className="mt-5 h-px bg-gradient-to-r from-red-500 via-red-500/30 to-transparent" />
            </Link>
            <Link to="/products" className="group rounded-2xl border border-red-500/20 bg-[#101012]/90 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-red-500/55 hover:shadow-[0_18px_45px_rgba(220,38,38,.12)]">
              <div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><Crown className="h-5 w-5" /></div><ArrowRight className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-red-400" /></div>
              <h2 className="mt-6 text-xl font-black text-white">DEMON VIP</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Unlock the premium DemonArk membership experience for 30 days.</p><div className="mt-5 h-px bg-gradient-to-r from-red-500 via-red-500/30 to-transparent" />
            </Link>
            <div className="rounded-2xl border border-white/10 bg-[#101012]/90 p-6 backdrop-blur-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><ShieldCheck className="h-5 w-5" /></div>
              <h2 className="mt-6 text-xl font-black text-white">FAST & SECURE</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">A focused checkout flow powered by Tip4Serv with store access available anytime.</p><div className="mt-5 flex gap-5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500"><span>24/7 Store</span><span>Secure Pay</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
