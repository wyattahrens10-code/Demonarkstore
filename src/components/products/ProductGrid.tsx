import { ShoppingBag } from 'lucide-react';
import type { Product } from '../../lib/types';
import ProductCard from './ProductCard';
import { useT } from '../../lib/i18n';

interface Props { products: Product[]; loading?: boolean; }

export default function ProductGrid({ products, loading }: Props) {
  const t = useT();
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} index={i} />)}</div>;
  if (products.length === 0) return <div className="text-center py-20 animate-fade-in"><div className="w-16 h-16 rounded-full bg-[#19191b] flex items-center justify-center mx-auto mb-4"><ShoppingBag className="w-8 h-8 text-zinc-600" /></div><p className="text-zinc-400 text-lg mb-1">{t('products.grid.empty_title')}</p><p className="text-zinc-500 text-sm">{t('products.grid.empty_help')}</p></div>;
  return <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">{products.map((product, idx) => <ProductCard key={product.id} product={product} index={idx} />)}</div>;
}

function SkeletonCard({ index }: { index: number }) {
  return <div className="glass-card animate-fade-in" style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}><div className="aspect-square skeleton" /><div className="p-3 sm:p-4 space-y-3"><div className="h-4 w-3/4 skeleton rounded" /><div className="h-5 w-20 skeleton rounded" /></div></div>;
}
