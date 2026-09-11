import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';

export default function Footer() {
  const { store } = useStore();
  const storeName = store?.title || 'DEMONARKSHOP';
  return (
    <footer className="relative mt-0 border-t border-white/[.07] bg-[#111113]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,.08),transparent_58%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          {store?.logo && <img src={store.logo} alt={storeName} className="h-10 w-10 object-cover" />}
          <div><div className="font-black text-white">{storeName}</div><div className="text-xs text-zinc-500">DemonArk Premium Store</div></div>
        </Link>
        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-red-500"/> Secure checkout</span>
          <a href="https://tip4serv.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-red-400 transition hover:text-red-300">Tip4Serv <ExternalLink className="h-3 w-3"/></a>
        </div>
        <div className="text-[11px] text-zinc-600">© {new Date().getFullYear()} {storeName}</div>
      </div>
    </footer>
  );
}
