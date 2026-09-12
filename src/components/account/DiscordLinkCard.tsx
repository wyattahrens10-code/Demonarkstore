import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { useToast } from '../../lib/toast';
import { useTip4ServAuth } from '../../lib/tip4servAuth';

const STORAGE_KEY = 'demonark-discord-link';
const CHECKOUT_PROFILE_KEY = 'demonark-checkout-profile';

export interface DemonArkDiscordLink {
  id: string;
  username: string;
  globalName?: string;
  linkedAt: number;
  tip4servUserId?: string;
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

function writeDiscordLink(link: DemonArkDiscordLink | null) {
  try {
    if (link) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(link));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
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
  const { token, user } = useTip4ServAuth();
  const [linked, setLinked] = useState<DemonArkDiscordLink | null>(null);
  const [localOnlyLink, setLocalOnlyLink] = useState<DemonArkDiscordLink | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [loadingSavedLink, setLoadingSavedLink] = useState(false);
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const currentUserId = user?.id ? String(user.id) : null;

  const saveLinkToBackend = useCallback(async (link: DemonArkDiscordLink) => {
    if (!token) throw new Error('Sign in to your DemonArk account before linking Discord.');

    const res = await fetch(`${apiBaseUrl}/api/account/identity`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discord_id: link.id,
        discord_username: link.username,
        discord_global_name: link.globalName || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Unable to save Discord link to DemonArk.');

    const profile = data?.profile;
    if (!profile?.discord_id || String(profile.discord_id) !== String(link.id)) {
      throw new Error('DemonArk did not confirm the Discord link. Please try again.');
    }

    const confirmed: DemonArkDiscordLink = {
      ...link,
      username: String(profile.discord_username || link.username || profile.discord_id),
      globalName: profile.discord_global_name || link.globalName || undefined,
      linkedAt: profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now(),
      tip4servUserId: String(profile.tip4serv_user_id || currentUserId || ''),
    };

    writeDiscordLink(confirmed);
    syncDiscordToCheckout(confirmed);
    setLinked(confirmed);
    setLocalOnlyLink(null);
    window.dispatchEvent(new CustomEvent('demonark-discord-link-changed', { detail: confirmed }));
    return confirmed;
  }, [token, apiBaseUrl, currentUserId]);

  useEffect(() => {
    if (!token) {
      setLinked(null);
      setLocalOnlyLink(null);
      setLoadingSavedLink(false);
      return;
    }

    let cancelled = false;
    setLoadingSavedLink(true);
    setLinked(null);
    setLocalOnlyLink(null);
    const cached = readDiscordLink();

    fetch(`${apiBaseUrl}/api/account/identity`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load saved DemonArk identity.');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const profile = data?.profile;

        if (profile?.discord_id) {
          const restored: DemonArkDiscordLink = {
            id: String(profile.discord_id),
            username: String(profile.discord_username || profile.discord_id),
            globalName: profile.discord_global_name || undefined,
            linkedAt: profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now(),
            tip4servUserId: String(profile.tip4serv_user_id || currentUserId || ''),
          };
          writeDiscordLink(restored);
          syncDiscordToCheckout(restored);
          setLinked(restored);
          return;
        }

        // The backend is authoritative. A cache scoped to another account must never leak across logins.
        if (cached?.tip4servUserId && currentUserId && cached.tip4servUserId !== currentUserId) {
          writeDiscordLink(null);
          syncDiscordToCheckout(null);
          return;
        }

        // Older DemonArk builds stored Discord only in this browser. Offer an explicit safe migration.
        if (cached?.id && (!cached.tip4servUserId || cached.tip4servUserId === currentUserId)) {
          setLocalOnlyLink(cached);
        } else {
          writeDiscordLink(null);
          syncDiscordToCheckout(null);
        }
      })
      .catch((err) => {
        if (!cancelled) addToast(err instanceof Error ? err.message : 'Unable to load Discord link.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingSavedLink(false);
      });

    return () => { cancelled = true; };
  }, [token, apiBaseUrl, currentUserId, addToast]);

  const saveLink = useCallback(async (link: DemonArkDiscordLink) => {
    return saveLinkToBackend({ ...link, tip4servUserId: currentUserId || undefined });
  }, [saveLinkToBackend, currentUserId]);

  const syncLocalLink = async () => {
    if (!localOnlyLink) return;
    setSyncingLocal(true);
    try {
      const confirmed = await saveLink(localOnlyLink);
      addToast(`Discord ${confirmed.globalName || confirmed.username} is now synced to your DemonArk account.`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to sync Discord link.', 'error');
    } finally {
      setSyncingLocal(false);
    }
  };

  const connectDiscord = useCallback(() => {
    if (!clientId) {
      addToast('Discord linking is not configured yet.', 'error');
      return;
    }

    if (!token) {
      addToast('Sign in to your DemonArk account before linking Discord.', 'warning');
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
        const link: DemonArkDiscordLink = {
          id: data.id,
          username: data.username || data.id,
          globalName: data.global_name || undefined,
          linkedAt: Date.now(),
          tip4servUserId: currentUserId || undefined,
        };
        try {
          const confirmed = await saveLink(link);
          addToast(`Discord linked as ${confirmed.globalName || confirmed.username}.`, 'success');
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
  }, [clientId, token, currentUserId, addToast, saveLink]);

  const disconnect = async () => {
    try {
      if (!token) throw new Error('Sign in before unlinking Discord.');
      const res = await fetch(`${apiBaseUrl}/api/account/discord`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to unlink Discord from DemonArk.');

      writeDiscordLink(null);
      syncDiscordToCheckout(null);
      setLinked(null);
      setLocalOnlyLink(null);
      window.dispatchEvent(new CustomEvent('demonark-discord-link-changed', { detail: null }));
      addToast('Discord account unlinked.', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to unlink Discord.', 'error');
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#19191b] p-5 sm:p-6 shadow-[0_18px_50px_rgba(0,0,0,.24)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/30"><DiscordIcon className="h-6 w-6 text-[#7289da]" /></div>
          <div><div className="text-[11px] font-black uppercase tracking-[.18em] text-red-400">Connected account</div><h3 className="mt-1 text-lg font-black text-white">Discord</h3></div>
        </div>
        {linked && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-emerald-400"><Check className="h-3.5 w-3.5" /> Synced</span>}
      </div>

      {loadingSavedLink ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/8 bg-[#222225] p-4 text-sm text-zinc-400"><Loader2 className="h-5 w-5 animate-spin text-red-400" /> Loading Discord from your DemonArk account…</div>
      ) : linked ? (
        <div className="mt-5 rounded-xl border border-white/8 bg-[#222225] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><div className="text-sm font-bold text-white truncate">{linked.globalName || linked.username}</div><div className="mt-1 text-xs text-zinc-500 truncate">@{linked.username}</div><div className="mt-1 text-[11px] text-zinc-600">Discord ID: {linked.id}</div></div>
            <button onClick={disconnect} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10"><Unlink className="h-4 w-4" /> Unlink</button>
          </div>
          <p className="mt-3 border-t border-white/8 pt-3 text-xs leading-relaxed text-zinc-500">Synced to your DemonArk account. This Discord connection will follow you across devices.</p>
        </div>
      ) : localOnlyLink ? (
        <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/[.06] p-4">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" /><div className="min-w-0"><div className="text-sm font-bold text-white">Saved on this device only</div><div className="mt-1 text-sm text-zinc-300 truncate">{localOnlyLink.globalName || localOnlyLink.username} <span className="text-zinc-500">@{localOnlyLink.username}</span></div><p className="mt-2 text-xs leading-relaxed text-zinc-500">This is an older local Discord link. Sync it once to make it available on PC, mobile, and future devices.</p></div></div>
          <button onClick={syncLocalLink} disabled={syncingLocal} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-400 disabled:opacity-60 sm:w-auto">{syncingLocal ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync to DemonArk account</button>
        </div>
      ) : (
        <div className="mt-5"><p className="text-sm leading-relaxed text-zinc-400">Link Discord once and DemonArk will save it to your account so it follows you across devices and is ready for checkout and future in-game fulfillment.</p><button onClick={connectDiscord} disabled={connecting} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 font-black text-white transition hover:bg-[#4752c4] disabled:opacity-60 sm:w-auto">{connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}{connecting ? 'Connecting Discord…' : 'Link Discord account'}{!connecting && <ExternalLink className="h-4 w-4 opacity-70" />}</button></div>
      )}
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.27 14.27 0 0 0-.658 1.34 18.27 18.27 0 0 0-5.487 0A12.61 12.61 0 0 0 9.748 3a19.74 19.74 0 0 0-3.762 1.37C2.36 9.744 1.36 14.987 1.86 20.156a19.93 19.93 0 0 0 6.073 3.04c.49-.668.927-1.379 1.302-2.124a12.94 12.94 0 0 1-2.05-.98c.172-.126.34-.257.501-.39 3.927 1.81 8.18 1.81 12.061 0 .163.133.331.264.503.39-.658.39-1.346.722-2.052.98.375.745.811 1.456 1.302 2.124a19.9 19.9 0 0 0 6.073-3.04c.583-5.985-.992-11.18-4.156-15.787zM8.02 16.85c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.955 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.946 2.418-2.157 2.418z" /></svg>;
}
