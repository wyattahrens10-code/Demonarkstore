import { Link } from 'react-router-dom';
import { ArrowRight, Crown, ShieldCheck, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function Hero() {
  const { store } = useStore();
  const title = store?.title || 'DemonArk';

  return (
    <section className="relative bg-[#080809] overflow-hidden">
      <div className="relative min-h-[790px] lg:min-h-[860px] flex items-end">
        <img
          src="/demonarkbackg.png"
          onError={(event) => { event.currentTarget.src = '/background.png'; }}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-[#080809]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.48),transparent_35%,transparent_65%,rgba(0,0,0,.38))]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full border border-red-500/35 bg-black/55 backdrop-blur-md px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-[.25em] text-red-200 shadow-[0_0_30px_rgba(239,68,68,.15)]">
              Official DemonArk Premium Store
            </div>

            <div className="mt-5 flex items-center justify-center rounded-full bg-black/20 p-2 backdrop-blur-[2px]">
              {store?.logo ? (
                <img src={store.logo} alt={title} className="h-28 sm:h-36 lg:h-44 w-auto object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,.9)]" />
              ) : (
                <Sparkles className="h-28 w-28 text-red-500" />
              )}
            </div>

            <h1 className="mt-2 text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-.055em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,.9)]">
              ENTER <span className="text-red-500">DEMONARK</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base lg:text-lg font-medium text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,.95)]">
              VIP Coins, Demon VIP, and premium upgrades built for your next run.
            </p>
            <Link to="/products" className="btn-primary mt-6 px-9 py-4 group text-base">
              <ShoppingBag className="h-5 w-5" /> Enter Store
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link to="/products" className="group flex items-center gap-4 rounded-2xl border border-red-500/30 bg-black/70 px-5 py-4 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:bg-black/85 hover:border-red-400/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400"><Zap className="h-5 w-5" /></div>
              <div className="min-w-0"><div className="font-black text-white">VIP COINS</div><div className="text-xs text-slate-400">Browse coin packages</div></div>
              <ArrowRight className="ml-auto h-4 w-4 text-red-400 transition group-hover:translate-x-1" />
            </Link>
            <Link to="/products" className="group flex items-center gap-4 rounded-2xl border border-red-500/30 bg-black/70 px-5 py-4 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:bg-black/85 hover:border-red-400/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400"><Crown className="h-5 w-5" /></div>
              <div className="min-w-0"><div className="font-black text-white">DEMON VIP</div><div className="text-xs text-slate-400">30 days premium access</div></div>
              <ArrowRight className="ml-auto h-4 w-4 text-red-400 transition group-hover:translate-x-1" />
            </Link>
            <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-black/70 px-5 py-4 text-left backdrop-blur-xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400"><ShieldCheck className="h-5 w-5" /></div>
              <div><div className="font-black text-white">SECURE CHECKOUT</div><div className="text-xs text-slate-400">Powered by Tip4Serv</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-red-500/10 bg-[#0d0d0f]">
        <div className="max-w-7xl mx-auto grid grid-cols-3 divide-x divide-red-500/10 px-4 sm:px-6 lg:px-8">
          <Mini icon={<Zap className="h-4 w-4" />} top="FAST" bottom="CHECKOUT" />
          <Mini icon={<Crown className="h-4 w-4" />} top="PREMIUM" bottom="VIP ACCESS" />
          <Mini icon={<ShieldCheck className="h-4 w-4" />} top="SECURE" bottom="PAYMENTS" />
        </div>
      </div>
    </section>
  );
}

function Mini({ icon, top, bottom }: { icon: React.ReactNode; top: string; bottom: string }) {
  return <div className="flex items-center justify-center gap-2 sm:gap-3 py-5 text-red-400">{icon}<div><div className="text-[10px] sm:text-xs font-black text-white">{top}</div><div className="hidden sm:block text-[9px] uppercase tracking-[.18em] text-slate-500">{bottom}</div></div></div>;
}
