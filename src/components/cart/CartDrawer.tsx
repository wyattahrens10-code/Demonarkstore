import { useEffect, useState } from 'react';
import { X, Trash2, Minus, Plus, ShoppingCart, ShoppingBag, Star, Settings2, Crown, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../lib/cart';
import { useToast } from '../../lib/toast';
import { computeExtrasPrice } from '../../lib/pricing';
import { formatMoney, isNiveauHidden, isNiveauField } from '../../lib/utils';
import type { CustomField } from '../../lib/types';
import CrossSellSection from './CrossSellSection';
import CartItemFields from './CartItemFields';
import { useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { useTip4ServAuth } from '../../lib/tip4servAuth';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, updateCustomFields, clearCart } = useCart();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [vipActive, setVipActive] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const t = useT();
  const { store } = useStore();
  const { token } = useTip4ServAuth();
  const currency = store?.currency;
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCart();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeCart]);

  useEffect(() => {
    if (!token) {
      setVipActive(false);
      return;
    }
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/account/vip-status`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to verify VIP status');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setVipActive(Boolean(data?.active));
      })
      .catch(() => {
        if (!cancelled) setVipActive(false);
      });
    return () => { cancelled = true; };
  }, [token, apiBaseUrl, isOpen]);

  if (!isOpen) return null;

  const cartTotal = items.reduce((sum, item) => {
    const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues);
    return sum + (item.product.price + extras) * item.quantity;
  }, 0);

  const vipPromo = !vipActive ? (
    <div className="m-4 rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-red-950/10 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
          <Crown className="h-5 w-5 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-amber-200">DEMON VIP — 20% OFF ALL ORDERS</div>
          <p className="mt-1 text-xs leading-5 text-volcanic-400">Save 20% on every DemonArk Store order, plus more DEMON VIP perks.</p>
        </div>
      </div>
      <button
        onClick={() => {
          closeCart();
          navigate('/products?category=demon-vip');
        }}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-amber-300"
      >
        Get DEMON VIP <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-volcanic-950/80 backdrop-blur-sm transition-opacity duration-300" onClick={closeCart} />
        <div className="absolute top-0 right-0 bottom-0 w-full max-w-md animate-slide-in-right">
          <div className="h-full flex flex-col bg-volcanic-900/95 backdrop-blur-xl border-l border-volcanic-800/50 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between p-5 border-b border-volcanic-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600/15 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-red-500" /></div>
                <h2 className="text-lg font-bold text-heading">
                  {t('cart.title')}
                  {items.length > 0 && <span className="ml-2 text-sm font-normal text-volcanic-400">({items.length} {items.length > 1 ? t('cart.items_plural') : t('cart.items_singular')})</span>}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                {items.length > 0 && <button onClick={() => { clearCart(); addToast(t('cart.toast.cleared'), 'info'); }} className="p-2 text-volcanic-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200" title={t('cart.clear_tooltip')}><Trash2 className="w-4 h-4" /></button>}
                <button onClick={closeCart} className="p-2 text-volcanic-400 hover:text-heading hover:bg-volcanic-800/60 rounded-lg transition-all duration-200"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="w-20 h-20 rounded-full bg-volcanic-800/40 flex items-center justify-center mb-5"><ShoppingBag className="w-10 h-10 text-volcanic-600" /></div>
                  <h3 className="text-lg font-semibold text-heading mb-2">{t('cart.empty.title')}</h3>
                  <p className="text-sm text-volcanic-400 mb-6">{t('cart.empty.description')}</p>
                  <Link to="/products" onClick={closeCart} className="btn-primary px-5 py-2.5 text-sm"><ShoppingBag className="w-4 h-4" />{t('cart.empty.cta')}</Link>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {items.map((item, idx) => {
                    const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues);
                    const unitPrice = item.product.price + extras;
                    const img = item.product.image || item.product.gallery?.[0];
                    return (
                      <div key={item.id} className="glass-card p-4 space-y-3 animate-fade-in" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}>
                        <div className="flex gap-3">
                          <Link to={`/product/${item.product.slug}`} onClick={closeCart} className="shrink-0 group">
                            {img ? <img src={img} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover group-hover:shadow-lg transition-shadow duration-200" /> : <div className="w-16 h-16 rounded-lg bg-volcanic-800 flex items-center justify-center"><Star className="w-6 h-6 text-volcanic-600" /></div>}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/product/${item.product.slug}`} onClick={closeCart} className="text-sm font-semibold text-heading hover:text-red-400 transition-colors duration-200 line-clamp-1">{item.product.name}</Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.product.category?.name && <span className="text-xs text-volcanic-500">{item.product.category.name}</span>}
                              {item.product.subscription && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.purchaseType === 'subscribe' ? 'bg-red-600/15 text-red-400' : 'bg-volcanic-700/50 text-volcanic-300'}`}>{item.purchaseType === 'subscribe' ? t('cart.badge.subscription_short') : t('cart.badge.one_month')}</span>}
                            </div>
                            <p className="text-sm font-bold text-red-400 mt-1">{formatMoney(unitPrice, currency)}{extras > 0 && <span className="text-xs text-volcanic-500 font-normal ml-1">({t('cart.price.base_label')} {formatMoney(item.product.price, currency)} + {t('cart.price.options_label')} {formatMoney(extras, currency)})</span>}</p>
                          </div>
                          <button onClick={() => { removeItem(item.id); addToast(t('cart.toast.item_removed', { name: item.product.name }), 'info'); }} className="shrink-0 p-1.5 text-volcanic-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200 self-start"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-7 h-7 flex items-center justify-center rounded-md bg-volcanic-800 text-volcanic-300 hover:text-heading hover:bg-volcanic-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-sm text-heading font-medium tabular-nums">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-volcanic-800 text-volcanic-300 hover:text-heading hover:bg-volcanic-700 transition-all duration-200"><Plus className="w-3 h-3" /></button>
                          {item.quantity > 1 && <span className="text-xs text-volcanic-500 ml-auto">{t('common.subtotal')} {formatMoney(unitPrice * item.quantity, currency)}</span>}
                        </div>
                        {item.product.custom_fields && item.product.custom_fields.length > 0 && (
                          <div>
                            <button onClick={() => setExpandedItems((prev) => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="flex items-center gap-1.5 text-[11px] font-medium text-volcanic-400 hover:text-red-400 transition-colors"><Settings2 className="w-3 h-3" />{expandedItems.has(item.id) ? t('cart.options.hide') : t('cart.options.edit')}</button>
                            {expandedItems.has(item.id) ? <CartItemFields fields={item.product.custom_fields} values={item.customFieldValues} onChange={(vals) => updateCustomFields(item.id, vals)} currency={currency} /> : Object.keys(item.customFieldValues).length > 0 && <CartItemOptionsSummary fields={item.product.custom_fields} values={item.customFieldValues} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {items.length > 0 && <div className="sm:hidden">{vipPromo}<CrossSellSection cartItems={items} onClose={closeCart} /></div>}
            </div>

            {items.length > 0 && <div className="hidden sm:block">{vipPromo}<CrossSellSection cartItems={items} onClose={closeCart} /></div>}

            {items.length > 0 && (
              <div className="border-t border-volcanic-800/50 p-5 space-y-4 bg-volcanic-900/80 backdrop-blur-lg">
                <div className="flex items-center justify-between"><span className="text-volcanic-400">{t('common.total')}</span><span className="text-xl font-bold text-heading">{formatMoney(cartTotal, currency)}</span></div>
                <button onClick={() => { closeCart(); navigate('/checkout'); }} className="btn-primary w-full py-3.5"><ShoppingCart className="w-5 h-5" />{t('cart.checkout_button')} ({formatMoney(cartTotal, currency)})</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function CartItemOptionsSummary({ fields, values }: { fields: CustomField[]; values: Record<string, string | number>; }) {
  const t = useT();
  const hideNiveau = isNiveauHidden(fields, values);
  const isVisible = (f: CustomField): boolean => {
    if (hideNiveau && isNiveauField(f)) return false;
    if (!f.parent) return true;
    const parentVal = values[String(f.parent.customFieldId)];
    if (parentVal === undefined) return false;
    const parentField = fields.find((pf) => pf.id === f.parent!.customFieldId);
    if (!parentField?.options) return false;
    const selectedOpt = parentField.options.find((o) => String(o.id) === String(parentVal));
    return selectedOpt ? String(selectedOpt.id) === String(f.parent.optionId) : false;
  };
  const entries = fields.filter((f) => values[String(f.id)] !== undefined && isVisible(f)).map((f) => {
    const val = values[String(f.id)];
    let displayValue = String(val);
    if ((f.type === 'select' || f.type === 'selection') && f.options) {
      const opt = f.options.find((o) => String(o.id) === String(val));
      if (opt) displayValue = opt.name;
    } else if (f.type === 'checkbox') displayValue = val === 1 || val === '1' ? t('common.yes') : t('common.no');
    return { name: f.name, value: displayValue };
  });
  if (entries.length === 0) return null;
  return <div className="flex flex-wrap gap-1.5">{entries.map((e) => <span key={e.name} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-volcanic-800/60 rounded-md text-volcanic-400"><span className="text-volcanic-500">{e.name}:</span><span className="text-volcanic-300">{e.value}</span></span>)}</div>;
}
