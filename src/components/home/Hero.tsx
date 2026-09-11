import { Link } from 'react-router-dom';
import { ArrowRight, Crown, ShieldCheck, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function Hero() {
  const { store } = useStore();
  const title = store?.title || 'DemonArk';

  return (
    <section className="relative overflow-hidden bg-[#070707]">
      <div className="relative min-h-[820px] lg:min-h-[900px]">
        <img src="/demonarkbackg.png" alt="DemonArk" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,4,5,.90)_0%,rgba(5,4,5,.62)_35%,rgba(5,4,5,.14)_68%,rgba(5,4,5,.30)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,5,.22)_0%,rgba(4,4,5,.06)_45%,#070707_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[55%] bg-[radial-gradient(circle_at_25%_46%,rgba(185,28,28,.18),transparent_52%)]" />

        <div className="relative z-10 mx-auto flex min-h-[820px] max-w-7xl items-center px-4 pb-36 pt-24 sm:px-6 lg:min-h-[900px] lg:px-8">
          <div className="w-full max-w-[660px] text-left">
            <div className="inline-flex items-center gap-2 rounded-md border-l-2 border-red-500 bg-black/45 px-4 py-2 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[.25em] text-red-100">Official DemonArk Store</span>
            </div>

            <div className="mt-7 flex items-center gap-4">
              {store?.logo ? <img src={store.logo} alt={title} className="h-20 sm:h-24 w-auto object-contain drop-shadow-[0_8px_25px_rgba(0,0,0,.9)]" /> : <Sparkles className="h-20 w-20 text-red-500" />}
              <div className="h-14 w-px bg-red-500/40" />
              <div><div className="text-xs font-bold uppercase tracking-[.25em] text-red-400">Premium Store</div><div className="mt-1 text-sm text-white/60">Built for the DemonArk community</div></div>
            </div>

            <h1 className="mt-7 text-[3.5rem] sm:text-[5rem] lg:text-[6.2rem] font-black uppercase leading-[.82] tracking-[-.06em] text-white drop-shadow-[0_5px_25px_rgba(0,0,0,.95)]">
              YOUR ARK.<br/><span className="text-red-500">YOUR REIGN.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base sm:text-lg leading-relaxed text-white/75 drop-shadow-[0_2px_10px_rgba(0,0,0,.9)]">Gear up with VIP Coins and Demon VIP. A focused premium store built to get you what you need and send you straight back into the fight.</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/products" className="group inline-flex items-center justify-center gap-3 rounded-lg bg-red-600 px-7 py-4 font-black uppercase tracking-wide text-white shadow-[0_12px_40px_rgba(220,38,38,.35)] transition hover:-translate-y-1 hover:bg-red-500 hover:shadow-[0_18px_50px_rgba(220,38,38,.5)]"><ShoppingBag className="h-5 w-5" /> Shop DemonArk <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></Link>
              <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/45 px-5 py-4 text-sm text-white/70 backdrop-blur-md"><ShieldCheck className="h-4 w-4 text-red-400" /> Checkout powered by Tip4Serv</div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-[#0a0a0b]/95 shadow-[0_-20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl md:grid-cols-3">
              <StoreTile icon={<Zap className="h-6 w-6" />} title="VIP COINS" text="Premium currency packages" link />
              <StoreTile icon={<Crown className="h-6 w-6" />} title="DEMON VIP" text="30 days of premium access" link />
              <StoreTile icon={<ShieldCheck className="h-6 w-6" />} title="SECURE STORE" text="Fast Tip4Serv checkout" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreTile({ icon, title, text, link = false }: { icon: React.ReactNode; title: string; text: string; link?: boolean }) {
  const content = <><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-400">{icon}</div><div><div className="text-base font-black tracking-wide text-white">{title}</div><div className="mt-1 text-xs text-slate-400">{text}</div></div>{link && <ArrowRight className="ml-auto h-5 w-5 text-red-500 transition group-hover:translate-x-1" />}</>;
  const cls = "group flex min-h-[105px] items-center gap-4 border-b border-white/10 px-6 py-5 transition hover:bg-red-500/[.06] md:border-b-0 md:border-r last:border-r-0";
  return link ? <Link to="/products" className={cls}>{content}</Link> : <div className={cls}>{content}</div>;
}
