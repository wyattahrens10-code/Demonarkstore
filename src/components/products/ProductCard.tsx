import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import type { Product } from '../../lib/types';
import { formatMoney, translatePeriodicity } from '../../lib/utils';
import Badge from '../ui/Badge';
import { useLanguage } from '../../lib/i18n';
import { useStore } from '../../lib/store';

interface Props { product: Product; index?: number; }

export default function ProductCard({ product, index = 0 }: Props) {
  const { t, lang } = useLanguage();
  const { store } = useStore();
  const currency = store?.currency;
  const isNew = product.slug?.toLowerCase().includes('new') || product.name?.toLowerCase().includes('nouveau') || (product.id && product.id > 9000);
  const stockTracked = typeof product.stock === 'number';
  const outOfStock = stockTracked && (product.stock ?? 0) <= 0;
  const eagerImage = index < 4;
  const highPriorityImage = index < 2;

  return (
    <Link to={`/product/${product.slug}`} aria-label={`View ${product.name}`} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#19191b] shadow-[0_16px_45px_rgba(0,0,0,.28)] transition duration-300 hover:-translate-y-1 hover:border-red-500/45 hover:shadow-[0_20px_55px_rgba(127,29,29,.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 animate-fade-in-up" style={{ animationDelay: `${index * 55}ms`, animationFillMode: 'both' }}>
      <div className="relative aspect-square overflow-hidden bg-[#111113]">
        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" loading={eagerImage ? 'eager' : 'lazy'} fetchPriority={highPriorityImage ? 'high' : 'auto'} decoding="async" draggable={false} /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-950/70 via-[#19191b] to-[#111113]"><Sparkles className="w-10 h-10 text-red-700" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-[3]">{isNew && <Badge variant="new">{t('product.badge.new')}</Badge>}{product.percent_off && product.percent_off > 0 ? <Badge variant="discount">-{product.percent_off}%</Badge> : null}{product.subscription && <Badge variant="subscription"><RefreshCw className="w-3 h-3 mr-1" />{t('product.badge.subscription_short')}</Badge>}{product.featured && <Badge variant="featured">{t('product.badge.star')}</Badge>}</div>
        {outOfStock && <div className="absolute inset-0 bg-black/65 z-[2]" />}
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm sm:text-base lg:text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-red-300 transition-colors">{product.name}</h3>
          <div className="hidden sm:flex w-7 h-7 rounded-full border border-red-500/20 bg-red-500/5 items-center justify-center shrink-0"><ChevronRight className="w-3.5 h-3.5 text-red-400" /></div>
        </div>
        <div className="mt-3 pt-3 border-t border-red-500/10 flex items-end justify-between gap-2">
          <div className="min-w-0"><div className="text-lg sm:text-xl lg:text-2xl font-black text-white">{formatMoney(product.price, currency)}</div>{product.old_price && <div className="text-[11px] text-zinc-500 line-through">{formatMoney(product.old_price, currency)}</div>}{product.subscription && product.duration_periodicity && <div className="text-[10px] text-zinc-500">/{translatePeriodicity(product.duration_periodicity, lang)}</div>}</div>
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_5px_18px_rgba(220,38,38,.25)] transition group-hover:bg-red-500 group-hover:scale-110"><ChevronRight className="w-4 h-4" /></div>
        </div>
      </div>
    </Link>
  );
}
