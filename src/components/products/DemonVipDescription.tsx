import { LockKeyhole, BadgePercent, TrendingUp, Crown, MessageCircle, Gift, Sparkles } from 'lucide-react';

const benefits = [
  {
    image: '/VIPCOINLOGO.png',
    title: '4,000 VIP COINS',
    text: 'Receive 4,000 VIP Coins instantly with your membership.',
    accent: 'text-amber-300',
  },
  {
    icon: LockKeyhole,
    title: 'VIP VAULT ACCESS',
    text: 'Unlock the exclusive VIP Vault inside the in-game Demon Shop, featuring VIP-only bundles, special releases, and limited drops.',
    accent: 'text-red-400',
  },
  {
    icon: BadgePercent,
    title: '20% OFF ALL ORDERS',
    text: 'Save 20% on every DemonArk Store order while your VIP membership is active.',
    accent: 'text-emerald-400',
  },
  {
    icon: TrendingUp,
    title: 'BONUS DEMON COIN EARNINGS',
    text: 'Earn Demon Coins faster during normal gameplay while VIP is active.',
    accent: 'text-red-400',
  },
  {
    icon: Crown,
    title: 'DEMON VIP DISCORD ROLE',
    text: 'Receive the exclusive Demon VIP role in the DemonArk Discord.',
    accent: 'text-amber-300',
  },
  {
    icon: MessageCircle,
    title: 'PRIVATE VIP CHAT',
    text: 'Gain access to a members-only VIP Discord channel.',
    accent: 'text-violet-400',
  },
  {
    icon: Gift,
    title: 'VIP-ONLY GIVEAWAYS',
    text: 'Get access to exclusive giveaways and community rewards reserved for Demon VIP members.',
    accent: 'text-red-400',
  },
];

export default function DemonVipDescription() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-[#151517] shadow-[0_24px_70px_rgba(0,0,0,.4),0_0_45px_rgba(127,29,29,.1)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(185,28,28,.12),transparent_40%)]" />

      <div className="relative border-b border-white/8 px-5 py-6 sm:px-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          30 Day Membership
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          DEMON <span className="text-amber-300">VIP</span> — 30 DAYS
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
          Unlock the full DemonArk VIP experience for 30 days with exclusive in-game rewards, private community perks, store savings, and an instant VIP Coin bonus.
        </p>
      </div>

      <div className="relative px-5 py-6 sm:px-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
          <span className="text-[11px] font-black uppercase tracking-[.22em] text-amber-200">Your VIP Benefits</span>
          <div className="h-px flex-1 bg-gradient-to-l from-amber-400/50 to-transparent" />
        </div>

        <div className="space-y-2.5">
          {benefits.map(({ icon: Icon, image, title, text, accent }) => (
            <div key={title} className="group flex gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-3.5 transition duration-200 hover:border-red-500/20 hover:bg-white/[.04]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/25">
                {image ? (
                  <img src={image} alt="VIP Coin" className="h-8 w-8 object-contain" />
                ) : Icon ? (
                  <Icon className={`h-5 w-5 ${accent}`} />
                ) : null}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black tracking-wide text-white sm:text-sm">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-400 sm:text-[13px]">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-400/[.08] via-red-950/20 to-transparent p-4">
          <div className="flex gap-3">
            <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <div className="text-xs font-black uppercase tracking-[.14em] text-amber-200">Membership Details</div>
              <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                Membership lasts 30 days. VIP Vault access, 20% store savings, earning bonuses, and Discord benefits require an active membership.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
