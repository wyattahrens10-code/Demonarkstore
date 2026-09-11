import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Link2, Loader2, Unlink } from 'lucide-react';
import { useToast } from '../../lib/toast';

const STORAGE_KEY = 'demonark-discord-link';
const CHECKOUT_PROFILE_KEY = 'demonark-checkout-profile';

export interface DemonArkDiscordLink {
  id: string;
  username: string;
  globalName?: string;
  linkedAt: number;
}

export function readDiscordLink(): DemonArkDiscordLink | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemonArkDiscordLink;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function syncDiscordToCheckout(link: DemonArkDiscordLink | null) {
  try {
    const raw = window.localStorage.getItem(CHECKOUT_PROFILE_KEY);
    const profile = raw ? JSON.parse(raw) : {};
    if (link) profile.discordTag = link.globalName || link.username;
    else delete profile.discordTag;
    window.localStorage.setItem(CHECKOUT_PROFILE_KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
}

export default function DiscordLinkCard() {
  const { addToast } = useToast();
  const [linked, setLinked] = useState<DemonArkDiscordLink | null>(null);
  const [connecting, setConnecting] = useState(false);
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

  useEffect(() => {
    const existing = readDiscordLink();
    setLinked(existing);
    if (existing) syncDiscordToCheckout(existing);
  }, []);

  const saveLink = useCallback((link: DemonArkDiscordLink) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(link));
    syncDiscordToCheckout(link);
    setLinked(link);
    window.dispatchEvent(new CustomEvent('demonark-discord-link-changed', { detail: link }));
  }, []);

  const connectDiscord = useCallback(() => {
    if (!clientId) {
      addToast('Discord linking is not configured yet.', 'error');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/discord/callback`;
    const state = Math.random().toString(36).slice(2);
    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'identify');
    authUrl.searchParams.set('state', state);

    try { window.sessionStorage.setItem('discord_oauth_opener_origin', window.location.origin); } catch { /* ignore */ }

    const width = 500;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(authUrl.toString(), 'discord-oauth', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`);

    if (!popup) {
      addToast('Please allow popups to link Discord.', 'warning');
      return;
    }

    setConnecting(true);
    let pollTimer = 0;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(pollTimer);
      setConnecting(false);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; ok?: boolean; id?: string; username?: string; global_name?: string; error?: string };
      if (!data || data.type !== 'discord-oauth') return;

      if (data.ok && data.id) {
        const link: DemonArkDiscordLink = { id: data.id, username: data.username || data.id, globalName: data.global_name || undefined, linkedAt: Date.now() };
        saveLink(link);
        addToast(`Discord linked as ${link.globalName || link.username}.`, 'success');
      } else {
        addToast(data.error || 'Discord linking failed.', 'error');
      }
      cleanup();
    };

    window.addEventListener('message', onMessage);
    pollTimer = window.setInterval(() => { if (popup.closed) cleanup(); }, 500);
  }, [clientId, addToast, saveLink]);

  const disconnect = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    syncDiscordToCheckout(null);
    setLinked(null);
    window.dispatchEvent(new CustomEvent('demonark-discord-link-changed', { detail: null }));
    addToast('Discord account unlinked.', 'info');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#19191b] p-5 sm:p-6 shadow-[0_18px_50px_rgba(0,0,0,.24)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/30"><DiscordIcon className="h-6 w-6 text-[#7289da]" /></div>
          <div><div className="text-[11px] font-black uppercase tracking-[.18em] text-red-400">Connected account</div><h3 className="mt-1 text-lg font-black text-white">Discord</h3></div>
        </div>
        {linked && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-emerald-400"><Check className="h-3.5 w-3.5" /> Linked</span>}
      </div>

      {linked ? (
        <div className="mt-5 rounded-xl border border-white/8 bg-[#222225] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><div className="text-sm font-bold text-white truncate">{linked.globalName || linked.username}</div><div className="mt-1 text-xs text-zinc-500 truncate">@{linked.username}</div><div className="mt-1 text-[11px] text-zinc-600">Discord ID: {linked.id}</div></div>
            <button onClick={disconnect} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10"><Unlink className="h-4 w-4" /> Unlink</button>
          </div>
          <p className="mt-3 border-t border-white/8 pt-3 text-xs leading-relaxed text-zinc-500">Your Discord name will automatically fill in during DemonArk checkout on this device.</p>
        </div>
      ) : (
        <div className="mt-5"><p className="text-sm leading-relaxed text-zinc-400">Link Discord once and DemonArk can automatically fill your Discord information during checkout.</p><button onClick={connectDiscord} disabled={connecting} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 font-black text-white transition hover:bg-[#4752c4] disabled:opacity-60 sm:w-auto">{connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}{connecting ? 'Connecting Discord…' : 'Link Discord account'}{!connecting && <ExternalLink className="h-4 w-4 opacity-70" />}</button></div>
      )}
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.27 14.27 0 0 0-.658 1.34 18.27 18.27 0 0 0-5.487 0A12.61 12.61 0 0 0 9.748 3a19.74 19.74 0 0 0-3.762 1.37C2.36 9.744 1.36 14.987 1.86 20.156a19.93 19.93 0 0 0 6.073 3.04c.49-.668.927-1.379 1.302-2.124a12.94 12.94 0 0 1-2.05-.98c.172-.126.34-.257.501-.39 3.927 1.81 8.18 1.81 12.061 0 .163.133.331.264.503.39-.658.39-1.346.722-2.052.98.375.745.811 1.456 1.302 2.124a19.9 19.9 0 0 0 6.073-3.04c.583-5.985-.992-11.18-4.156-15.787zM8.02 16.85c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.955 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.946 2.418-2.157 2.418z" /></svg>;
}
