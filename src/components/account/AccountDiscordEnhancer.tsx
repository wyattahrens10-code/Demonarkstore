import { useLocation } from 'react-router-dom';
import DiscordLinkCard from './DiscordLinkCard';

export default function AccountDiscordEnhancer() {
  const location = useLocation();
  if (location.pathname !== '/account') return null;

  return (
    <section className="mx-auto -mt-6 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mb-4">
        <div className="text-[11px] font-black uppercase tracking-[.2em] text-red-400">DemonArk identity</div>
        <h2 className="mt-1 text-xl font-black text-white">Connected accounts</h2>
        <p className="mt-1 text-sm text-zinc-500">Link services you use with DemonArk for faster checkout and future account automation.</p>
      </div>
      <div className="max-w-2xl">
        <DiscordLinkCard />
      </div>
    </section>
  );
}
