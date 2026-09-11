import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function Hero() {
  const { store } = useStore();
  const title = store?.title || 'DemonArk';

  return (
    <section className="relative min-h-[150vh] overflow-hidden bg-[#080403]">
      <div className="fixed inset-0 top-16 lg:top-20 -z-0 bg-[url('/demonarkbackg.png')] bg-cover bg-center bg-no-repeat" />
      <div className="fixed inset-0 top-16 lg:top-20 -z-0 bg-[linear-gradient(180deg,rgba(7,3,2,.20),rgba(10,3,2,.46)_52%,rgba(8,3,2,.84))]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
        {store?.logo && <img src={store.logo} alt={title} className="h-32 w-auto object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,.95)] sm:h-40 lg:h-48" />}
        <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-white/75 drop-shadow-[0_2px_10px_#000] sm:text-base">VIP Coins. Demon VIP. Premium access to the DemonArk experience.</p>
        <Link to="/products" className="group mt-7 inline-flex items-center gap-3 rounded-xl border border-red-300/30 bg-gradient-to-r from-red-600 via-red-500 to-red-700 px-9 py-4 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_12px_45px_rgba(220,38,38,.45)] transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_18px_60px_rgba(239,68,68,.62)]"><ShoppingBag className="h-5 w-5" /> Shop DemonArk <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-[#160806]/65 px-4 py-2 text-[11px] font-semibold uppercase tracking-[.12em] text-red-100/70 backdrop-blur-md"><ShieldCheck className="h-3.5 w-3.5 text-red-400" /> Secure checkout by Tip4Serv</div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <PortalCard image="/VIPCOINLOGO.png" title="VIP COINS" subtitle="Premium currency" />
          <PortalCard image="/demonarkvipbanner.png" title="DEMON VIP" subtitle="30 day membership" />
        </div>
      </div>
    </section>
  );
}

function PortalCard({ image, title, subtitle }: { image: string; title: string; subtitle: string }) {
  return <Link to="/products" className="group relative h-[300px] overflow-hidden rounded-2xl border border-red-500/25 bg-[#120604]/80 shadow-[0_20px_60px_rgba(0,0,0,.55)] transition duration-500 hover:-translate-y-2 hover:border-red-400/70 hover:shadow-[0_25px_75px_rgba(185,28,28,.35)] sm:h-[360px]"><img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:saturate-[1.15]"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"/><div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6"><div><div className="text-2xl font-black text-white drop-shadow-lg">{title}</div><div className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-red-300">{subtitle}</div></div><div className="flex h-11 w-11 items-center justify-center rounded-full border border-red-400/40 bg-red-600/80 text-white shadow-[0_0_25px_rgba(239,68,68,.35)] transition group-hover:scale-110 group-hover:bg-red-500"><ArrowRight className="h-5 w-5"/></div></div><div className="absolute inset-0 opacity-0 ring-1 ring-inset ring-red-400/70 transition group-hover:opacity-100"/></Link>;
}
