import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, ArrowUpDown, LayoutGrid, Rows3, SlidersHorizontal, ChevronDown } from 'lucide-react';
import ProductGrid from '../components/products/ProductGrid';
import ApiErrorNotice from '../components/ui/ApiErrorNotice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getAllProducts, getCategories } from '../lib/api';
import { getCategoryIcon } from '../lib/categoryIcons';
import type { Product, Category } from '../lib/types';
import { useT } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'newest' | 'popular';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get('category');
  const t = useT();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    getCategories().then((r) => { setCategoriesError(null); setCategories(r.categories ?? []); }).catch((e) => { setCategoriesError(e instanceof Error ? e.message : String(e)); setCategories([]); });
  }, []);

  const categoryIdBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c.id])), [categories]);
  const activeCategoryId = activeSlug ? categoryIdBySlug.get(activeSlug) : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllProducts(activeCategoryId).then((products) => { if (!cancelled) { setProductsError(null); setFilteredProducts(products); } }).catch((e) => { if (!cancelled) { setProductsError(e instanceof Error ? e.message : String(e)); setFilteredProducts([]); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCategoryId]);

  const activeCategory = activeSlug ? categories.find((c) => c.slug === activeSlug) : null;
  const activeCategoryName = activeCategory?.name || null;
  usePageTitle(activeCategoryName || t('products.page.title_all'));

  const { filtered, totalPages, paginatedProducts } = useMemo(() => {
    const results = filteredProducts.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.small_description || '').toLowerCase().includes(search.toLowerCase()));
    const sorted = [...results].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'popular') return (b.id > 9000 ? 1 : 0) - (a.id > 9000 ? 1 : 0);
      return 0;
    });
    const total = Math.ceil(sorted.length / itemsPerPage);
    return { filtered: sorted, totalPages: total, paginatedProducts: sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) };
  }, [filteredProducts, search, sortBy, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [search, sortBy, activeSlug, itemsPerPage]);
  const productGridRef = useRef<HTMLDivElement>(null);
  const setCategory = useCallback((slug: string | null) => {
    setSearchParams(slug ? { category: slug } : {});
    if (window.innerWidth < 1024 && productGridRef.current) setTimeout(() => productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [setSearchParams]);

  return (
    <div className="pt-24 lg:pt-28 pb-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-3xl lg:text-4xl font-black text-heading mb-2">{activeCategoryName || t('products.page.title_all')}</h1>
          <p className="text-volcanic-400 text-base lg:text-lg">{activeCategoryName ? t('products.page.subtitle_category', { name: activeCategoryName }) : 'Discover the DemonArk Store'}</p>
          {(activeSlug || search) && <p className="text-red-400 font-semibold mt-2 text-sm">{filtered.length} {filtered.length !== 1 ? t('products.page.found_plural') : t('products.page.found_singular')}</p>}
        </div>

        {categoriesError && <ApiErrorNotice title="Category loading error" message={categoriesError} />}
        {productsError && <ApiErrorNotice title="Product loading error" message={productsError} />}

        <div className="mb-5 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max pb-1">
            <button onClick={() => setCategory(null)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap border transition-all ${!activeSlug ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-[#19191b] border-white/10 text-zinc-300 hover:border-red-500/40 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /> All</button>
            {categories.map((cat) => { const Icon = getCategoryIcon(cat.slug || cat.name); return <button key={cat.id} onClick={() => setCategory(cat.slug)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap border transition-all ${activeSlug === cat.slug ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-[#19191b] border-white/10 text-zinc-300 hover:border-red-500/40 hover:text-white'}`}><Icon className="w-4 h-4" />{cat.name}</button>; })}
          </div>
        </div>

        <div ref={productGridRef} className="scroll-mt-24">
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <input type="text" placeholder={t('products.page.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11 !bg-[#19191b]" />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              </div>
              <button onClick={() => setFiltersOpen((v) => !v)} className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border px-4 font-bold transition-all ${filtersOpen ? 'bg-red-600 border-red-500 text-white' : 'bg-[#19191b] border-white/10 text-zinc-200 hover:border-red-500/40'}`}><SlidersHorizontal className="w-4 h-4" /><span className="hidden sm:inline">Filters</span><ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} /></button>
            </div>

            {filtersOpen && <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#19191b] p-3 shadow-xl">
              <label className="relative"><span className="block text-[10px] uppercase tracking-[.16em] text-zinc-500 mb-1.5 ml-1">Sort</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="input-field !bg-[#222225] pl-10 appearance-none cursor-pointer"><option value="name">{t('products.sort.name')}</option><option value="newest">{t('products.sort.newest')}</option><option value="popular">{t('products.sort.popular')}</option><option value="price-asc">{t('products.sort.price_asc')}</option><option value="price-desc">{t('products.sort.price_desc')}</option></select><ArrowUpDown className="absolute left-3 top-[42px] -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" /></label>
              <label className="relative"><span className="block text-[10px] uppercase tracking-[.16em] text-zinc-500 mb-1.5 ml-1">Show</span><select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="input-field !bg-[#222225] pl-10 appearance-none cursor-pointer"><option value={12}>12 per page</option><option value={24}>24 per page</option><option value={48}>48 per page</option><option value={96}>96 per page</option></select><Rows3 className="absolute left-3 top-[42px] -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" /></label>
            </div>}

            {activeSlug && <div className="mt-3"><button onClick={() => setCategory(null)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-[#19191b] border border-white/10 rounded-lg hover:border-red-500/30"><X className="w-3.5 h-3.5" />{activeCategoryName}</button></div>}
          </div>

          {loading ? <LoadingSpinner /> : <><ProductGrid products={paginatedProducts} />{totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-10"><button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-[#19191b] text-zinc-300 border border-white/10 disabled:opacity-40">{t('products.pagination.prev')}</button><span className="text-sm text-zinc-400 px-2">{currentPage} / {totalPages}</span><button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-lg bg-[#19191b] text-zinc-300 border border-white/10 disabled:opacity-40">{t('products.pagination.next')}</button></div>}</>}
        </div>
      </div>
    </div>
  );
}
