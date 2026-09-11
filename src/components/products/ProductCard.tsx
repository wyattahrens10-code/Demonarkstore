import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Sparkles, Star } from 'lucide-react';
import type { Product } from '../../lib/types';
import { formatMoney, translatePeriodicity } from '../../lib/utils';
import Badge from '../ui/Badge';
import DiscountCountdown from '../ui/DiscountCountdown';
import { useLanguage } from '../../lib/i18n';
import { useStore } from '../../lib/store';

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { t, lang } = useLanguage();
  const { store } = useStore();
  const currency = store?.currency;
  const isNew = product.slug?.toLowerCase().includes('new') ||
                product.name?.toLowerCase().includes('nouveau') ||
                (product.id && product.id > 9000);

  const stockTracked = typeof product.stock === 'number';
  const outOfStock = stockTracked && (product.stock ?? 0) <= 0;
  const lowStock = stockTracked && !outOfStock && (product.stock ?? 0) <= 5;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group glass-card-hover card-shine flex flex-col min-h-full animate-fade-in-up"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-volcanic-900">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ark-950/70 via-volcanic-900 to-volcanic-950">
            <Sparkles className="w-12 h-12 text-ark-700" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-volcanic-950 via-volcanic-950/20 to-transparent opacity-75 group-hover:opacity-60 transition-opacity duration-500" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-ark-500/50 to-transparent opacity-70" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-[3]">
          {isNew && <Badge variant="new">{t('product.badge.new')}</Badge>}
          {product.percent_off && product.percent_off > 0 && (
            <Badge variant="discount">-{product.percent_off}%</Badge>
          )}
          {product.subscription && (
            <Badge variant="subscription">
              <RefreshCw className="w-3 h-3 mr-1" />
              {t('product.badge.subscription_short')}
            </Badge>
          )}
          {product.featured && <Badge variant="featured">{t('product.badge.star')}</Badge>}
        </div>

        {stockTracked && (
          <div className="absolute top-3 right-3 z-[3]">
            {outOfStock ? (
              <Badge variant="out_of_stock">{t('product.stock.out_of_stock')}</Badge>
            ) : lowStock ? (
              <Badge variant="low_stock">{t('product.stock.low_stock', { qty: product.stock ?? 0 })}</Badge>
            ) : (
              <Badge variant="in_stock">{t('product.stock.in_stock')}</Badge>
            )}
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-volcanic-950/60 backdrop-blur-[1px] z-[2]" aria-hidden="true" />
        )}
      </div>

      <div className="relative p-4 lg:p-5 flex flex-col flex-1 z-[3]">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <h3 className="text-base lg:text-lg font-bold text-heading tracking-tight group-hover:text-ark-300 transition-colors duration-300">
            {product.name}
          </h3>
          <div className="w-8 h-8 rounded-full border border-ark-500/15 bg-ark-500/5 flex items-center justify-center shrink-0 opacity-70 group-hover:opacity-100 group-hover:border-ark-400/35 group-hover:bg-ark-500/10 transition-all duration-300">
            <ChevronRight className="w-4 h-4 text-ark-400 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
        </div>

        {product.small_description ? (
          <div
            className="text-sm text-volcanic-400 leading-relaxed mb-4 line-clamp-2 flex-1 [&_*]:inline"
            dangerouslySetInnerHTML={{ __html: product.small_description }}
          />
        ) : (
          <p className="text-sm text-volcanic-500 mb-4 flex-1">Premium DemonArk VIP bundle.</p>
        )}

        <div className="mt-auto pt-3.5 border-t border-ark-500/10 space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-xl lg:text-2xl font-black text-heading group-hover:text-ark-300 transition-colors duration-300">
                {formatMoney(product.price, currency)}
              </span>
              {product.old_price && (
                <span className="text-sm text-volcanic-500 line-through">
                  {formatMoney(product.old_price, currency)}
                </span>
              )}
            </div>
            {product.subscription && product.duration_periodicity && (
              <span className="text-xs text-volcanic-500 shrink-0">
                /{translatePeriodicity(product.duration_periodicity!, lang)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-volcanic-500 group-hover:text-volcanic-400 transition-colors duration-300">
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-ark-500" />
              View bundle
            </span>
            <span className="text-ark-500/80">DemonArk</span>
          </div>

          {product.discount_end && (product.discount_end < 1e12 ? product.discount_end * 1000 : product.discount_end) > Date.now() && (
            <DiscountCountdown endTimestamp={product.discount_end} compact />
          )}
        </div>
      </div>
    </Link>
  );
}
