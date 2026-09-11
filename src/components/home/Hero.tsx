import { Link } from 'react-router-dom';
import { ArrowRight, Crown, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function Hero() {
  const { store } = useStore();
  const title = store?.title || 'DemonArk';

  return (
    <section className="v2-hero relative min-h-[94vh] overflow-hidden flex items-center pt-20">
      <div className="absolute inset-0">
        <img src="/background.png" alt="" className="v2-hero-bg absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,8,.98)_0%,rgba(8,3,7,.93)_42%,rgba(16,2,5,.58)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#04050c_0%,transparent_38%,rgba(4,5,12,.72)_100%)]" />
        <div className="absolute inset-0 v2-grid" />
      </div>

      <div className="v2-orb v2-orb-one" />
      <div className="v2-orb v2-orb-two" />
      <div className="v2-ember-field" aria-hidden="true" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-[1.02fr_.98fr] gap-12 lg:gap-20 items-center">
          <div className="max-w-3xl">
            <div className="v2-eyebrow v2-reveal">
              <span className="v2-live-dot" />
              Official DemonArk Store
            </div>

            <div className="mt-7 v2-reveal v2-delay-1">
              <p className="text-red-400/90 text-xs sm:text-sm font-black uppercase tracking-[.34em] mb-4">Enter the inferno</p>
              <h1 className="text-[3.6rem] sm:text-[5.2rem] lg:text-[6.7rem] font-black leading-[.82] tracking-[-.065em] text-white">
                RULE THE
                <span className="block v2-fire-text">ARK.</span>
              </h1>
            </div>

            <p className="mt-7 max-w-xl text-base sm:text-lg text-slate-300/85 leading-relaxed v2-reveal v2-delay-2">
              Claim VIP access and premium DemonArk upgrades through one focused storefront built for fast, secure checkout.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 v2-reveal v2-delay-3">
              <Link to="/products" className="v2-main-cta group">
                <Crown className="w-5 h-5" />
                Enter the Store
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <div className="v2-secure-pill">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                Secure checkout by Tip4Serv
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 max-w-xl border-t border-red-500/15 pt-6 v2-reveal v2-delay-4">
              <Feature icon={<Zap className="w-4 h-4" />} title="Fast" text="Checkout" />
              <Feature icon={<Crown className="w-4 h-4" />} title="VIP" text="Access" />
              <Feature icon={<ShieldCheck className="w-4 h-4" />} title="Secure" text="Payments" />
            </div>
          </div>

          <div className="relative v2-reveal v2-delay-2">
            <div className="v2-sigil-wrap">
              <div className="v2-sigil-ring v2-ring-a" />
              <div className="v2-sigil-ring v2-ring-b" />
              <div className="v2-sigil-glow" />
              <div className="v2-logo-card">
                <div className="absolute inset-0 v2-card-grid" />
                <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-red-400/80 to-transparent" />
                {store?.logo ? (
                  <img src={store.logo} alt={title} className="relative z-10 w-[78%] max-w-[470px] object-contain v2-logo-float" />
                ) : (
                  <div className="relative z-10 text-center">
                    <Sparkles className="w-12 h-12 text-red-400 mx-auto mb-5" />
                    <div className="text-5xl font-black v2-fire-text">DEMONARK</div>
                  </div>
                )}
              </div>
              <div className="v2-corner-tag">DEMONARK // V2</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#04050c] to-transparent" />
    </section>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 border-l border-red-500/15 first:border-l-0 px-3 first:pl-0 sm:px-5">
      <span className="text-red-400">{icon}</span>
      <div>
        <div className="text-sm sm:text-base font-extrabold text-white">{title}</div>
        <div className="text-[10px] sm:text-xs uppercase tracking-[.16em] text-slate-500">{text}</div>
      </div>
    </div>
  );
}
