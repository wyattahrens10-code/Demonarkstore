import { useEffect, useState } from 'react';
import { Check, Edit3, Loader2, Save, ShieldCheck } from 'lucide-react';
import { useTip4ServAuth } from '../../lib/tip4servAuth';
import { useToast } from '../../lib/toast';

interface IdentityProfile {
  eos_id?: string | null;
  server_key?: string | null;
  email?: string | null;
}

export default function AccountPlayerIdentityCard() {
  const { token, user } = useTip4ServAuth();
  const { addToast } = useToast();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const [profile, setProfile] = useState<IdentityProfile | null>(null);
  const [eosId, setEosId] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${apiBaseUrl}/api/account/identity`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Unable to load your DemonArk identity.');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const next = (data?.profile || null) as IdentityProfile | null;
        setProfile(next);
        setEosId(next?.eos_id || '');
        setEditing(!next?.eos_id);
      })
      .catch((err: Error) => {
        if (!cancelled) addToast(err.message, 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, apiBaseUrl, addToast]);

  const save = async () => {
    if (!token) return;
    const value = eosId.trim();
    if (!value) {
      addToast('Enter your EOSID before saving.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/account/identity`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eos_id: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to save EOSID.');
      setProfile(data.profile || { eos_id: value });
      setEosId(data?.profile?.eos_id || value);
      setEditing(false);

      try {
        const raw = localStorage.getItem('demonark-checkout-profile');
        const checkoutProfile = raw ? JSON.parse(raw) : {};
        checkoutProfile.identifiers = { ...(checkoutProfile.identifiers || {}), username: value, eos_id: value };
        localStorage.setItem('demonark-checkout-profile', JSON.stringify(checkoutProfile));
      } catch { /* ignore local cache errors */ }

      window.dispatchEvent(new CustomEvent('demonark-identity-changed', { detail: data.profile }));
      addToast('EOSID saved to your DemonArk account.', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to save EOSID.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#19191b] p-5 sm:p-6 shadow-[0_18px_50px_rgba(0,0,0,.24)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10">
            <ShieldCheck className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[.18em] text-red-400">Player identity</div>
            <h3 className="mt-1 text-lg font-black text-white">ARK EOSID</h3>
          </div>
        </div>
        {profile?.eos_id && !editing && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#222225] p-4 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your player identity…
        </div>
      ) : (
        <div className="mt-5">
          <label className="block text-sm font-bold text-zinc-300">EOSID</label>
          <input
            value={eosId}
            onChange={(e) => setEosId(e.target.value)}
            readOnly={!editing}
            placeholder="Enter your EOSID"
            className={`input-field mt-2 !bg-[#222225] ${!editing ? 'cursor-default opacity-90' : ''}`}
          />
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">Used to match purchases to your ARK player for DemonArk delivery.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {editing ? (
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-500 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save EOSID'}
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#222225] px-4 py-2.5 text-sm font-black text-white transition hover:border-red-500/30">
                <Edit3 className="h-4 w-4" /> Edit EOSID
              </button>
            )}
          </div>

          {user?.email && (
            <div className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4 text-xs text-zinc-400">
              <Check className="h-4 w-4 text-emerald-400" />
              Tip4Serv email connected: <span className="font-semibold text-zinc-200">{user.email}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
