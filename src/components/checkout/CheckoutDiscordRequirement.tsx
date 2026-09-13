import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Link2, Loader2 } from 'lucide-react';
import { useToast } from '../../lib/toast';
import { useTip4ServAuth } from '../../lib/tip4servAuth';

type DiscordAccount = {
  id: string;
  username: string;
  globalName?: string;
};

type DiscordRequirementState = {
  loading: boolean;
  linked: boolean;
  account: DiscordAccount | null;
};

type Props = {
  onStateChange?: (state: DiscordRequirementState) => void;
};

export default function CheckoutDiscordRequirement({ onStateChange }: Props) {
  const { token, user } = useTip4ServAuth();
  const { addToast } = useToast();
  const [account, setAccount] = useState<DiscordAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

  const reportState = useCallback((nextLoading: boolean, nextAccount: DiscordAccount | null) => {
    onStateChange?.({ loading: nextLoading, linked: Boolean(nextAccount?.id), account: nextAccount });
  }, [onStateChange]);

  const loadSavedDiscord = useCallback(async () => {
    if (!token) {
      setAccount(null);
      setLoading(false);
      reportState(false, null);
      return;
    }

    setLoading(true);
    reportState(true, account);
    try {
      const res = await fetch(`${apiBaseUrl}/api/account/identity`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to verify your Discord connection.');
      const profile = data?.profile;
      const next = profile?.discord_id ? {
        id: String(profile.discord_id),
        username: String(profile.discord_username || profile.discord_id),
        globalName: profile.discord_global_name || undefined,
      } : null;
      setAccount(next);
      reportState(false, next);
    } catch (err) {
      setAccount(null);
      reportState(false, null);
      addToast(err instanceof Error ? err.message : 'Unable to verify Discord.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, apiBaseUrl, addToast, reportState, account]);

  useEffect(() => {
    void loadSavedDiscord();
    // Re-check when the signed-in Tip4Serv account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  const saveDiscord = useCallback(async (next: DiscordAccount) => {
    if (!token) throw new Error('Sign in to Tip4Serv before linking Discord.');
    const res = await fetch(`${apiBaseUrl}/api/account/identity`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discord_id: next.id,
        discord_username: next.username,
        discord_global_name: next.globalName || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Unable to save Discord to your DemonArk account.');
    const profile = data?.profile;
    if (!profile?.discord_id) throw new Error('DemonArk did not confirm the Discord connection.');

    const confirmed = {
      id: String(profile.discord_id),
      username: String(profile.discord_username || profile.discord_id),
      globalName: profile.discord_global_name || undefined,
    };
    setAccount(confirmed);
    reportState(false, confirmed);
    window.dispatchEvent(new CustomEvent('demonark-discord-link-changed', { detail: confirmed }));
    return confirmed;
  }, [token, apiBaseUrl, reportState]);

  const connectDiscord = useCallback(() => {
    if (!clientId) {
      addToast('Discord linking is not configured yet.', 'error');
      return;
    }
    if (!token) {
      addToast('Sign in to Tip4Serv before linking Discord.', 'warning');
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
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; ok?: boolean; id?: string; username?: string; global_name?: string; error?: string };
      if (!data || data.type !== 'discord-oauth') return;
      if (data.ok && data.id) {
        try {
          const confirmed = await saveDiscord({
            id: data.id,
            username: data.username || data.id,
            globalName: data.global_name || undefined,
          });
          addToast(`Discord connected as ${confirmed.globalName || confirmed.username}.`, 'success');
        } catch (err) {
          addToast(err instanceof Error ? err.message : 'Discord linking failed.', 'error');
        }
      } else {
        addToast(data.error || 'Discord linking failed.', 'error');
      }
      cleanup();
    };

    window.addEventListener('message', onMessage);
    pollTimer = window.setInterval(() => { if (popup.closed) cleanup(); }, 500);
  }, [clientId, token, addToast, saveDiscord]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#222225] p-4">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin text-[#7289da]" />
          Verifying Discord connection…
        </div>
      </div>
    );
  }

  if (account) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Check className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-white">Discord connected</div>
            <div className="mt-1 truncate text-sm text-emerald-300">{account.globalName || account.username} <span className="text-zinc-500">@{account.username}</span></div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">Synced to your DemonArk account and verified for purchase support.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/[.07] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/15">
          <DiscordIcon className="h-6 w-6 text-[#7289da]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-black text-white">Discord account required</div>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">Link and sync Discord to your DemonArk account before purchasing. This gives staff a verified support contact if an order ever needs help.</p>
        </div>
      </div>
      <button onClick={connectDiscord} disabled={connecting} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 font-black text-white transition hover:bg-[#4752c4] disabled:opacity-60">
        {connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}
        {connecting ? 'Connecting Discord…' : 'Link Discord account'}
        {!connecting && <ExternalLink className="h-4 w-4 opacity-70" />}
      </button>
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.27 14.27 0 0 0-.658 1.34 18.27 18.27 0 0 0-7.8 0A13.5 13.5 0 0 0 7.442 3a19.74 19.74 0 0 0-3.758 1.37C1.304 7.895.66 11.332.983 14.72a19.9 19.9 0 0 0 4.61 2.33c.371-.51.702-1.05.986-1.616a12.98 12.98 0 0 1-1.553-.743c.13-.095.257-.193.38-.291a14.18 14.18 0 0 0 12.19 0c.124.1.251.198.38.291-.497.293-1.016.541-1.552.743.285.566.615 1.106.986 1.616a19.84 19.84 0 0 0 4.61-2.33c.379-3.93-.648-7.335-2.703-10.351ZM8.02 12.58c-1.19 0-2.17-1.095-2.17-2.44s.96-2.45 2.17-2.45c1.22 0 2.19 1.105 2.17 2.45 0 1.345-.96 2.44-2.17 2.44Zm7.97 0c-1.19 0-2.17-1.095-2.17-2.44s.96-2.45 2.17-2.45c1.22 0 2.19 1.105 2.17 2.45 0 1.345-.95 2.44-2.17 2.44Z"/></svg>;
}
