import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import { getAllProducts, getRelatedProducts } from '../../lib/api';
import type { Product } from '../../lib/types';

interface RelatedProductsProps {
  currentProductId: number;
  categoryId?: number;
  limit?: number;
}

export default function RelatedProducts({
  currentProductId,
  categoryId,
  limit = 4,
}: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        let related = await getRelatedProducts(currentProductId, categoryId, limit);

        if (related.length < limit) {
          const allProducts = await getAllProducts();
          const existing = new Set(related.map((product) => product.id));
          const fallback = allProducts.filter(
            (product) => product.id !== currentProductId && !existing.has(product.id)
          );
          related = [...related, ...fallback].slice(0, limit);
        }

        if (!cancelled) setProducts(related);
      } catch (error) {
        console.error('Error loading related products:', error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentProductId, categoryId, limit]);

  if (loading || products.length === 0) return null;

  return (
    <section className="mt-14 border-t border-white/10 pt-10 sm:mt-16 sm:pt-14">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
          <Sparkles className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">Keep exploring</div>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">You may also like</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        {products.map((product, idx) => (
          <ProductCard key={product.id} product={product} index={idx} />
        ))}
      </div>
    </section>
  );
}
