import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { CartProvider } from './lib/cart';
import { StoreProvider } from './lib/store';
import { Tip4ServAuthProvider } from './lib/tip4servAuth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { LanguageProvider } from './lib/i18n';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/cart/CartDrawer';
import ToastContainer from './components/ui/ToastContainer';
import AccountDiscordEnhancer from './components/account/AccountDiscordEnhancer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import DemonArkCheckoutPage from './pages/DemonArkCheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCanceledPage from './pages/CheckoutCanceledPage';
import AccountPage from './pages/AccountPage';
import DiscordOAuthCallbackPage from './pages/DiscordOAuthCallbackPage';
import AdminPage from './pages/AdminPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-28 text-center">
      <div className="max-w-md rounded-3xl border border-white/10 bg-[#171719] p-8 shadow-[0_24px_70px_rgba(0,0,0,.4)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <SearchX className="h-7 w-7 text-red-400" />
        </div>
        <div className="mt-5 text-xs font-black uppercase tracking-[.2em] text-red-400">404</div>
        <h1 className="mt-2 text-3xl font-black uppercase text-white">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">That DemonArk page does not exist or may have moved.</p>
        <Link to="/products" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-[.08em] text-white transition hover:bg-red-600">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <StoreProvider>
              <Tip4ServAuthProvider>
                <CartProvider>
                  <ScrollToTop />
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/product/:slug" element={<ProductDetailPage />} />
                        <Route path="/checkout" element={<DemonArkCheckoutPage />} />
                        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                        <Route path="/checkout/canceled" element={<CheckoutCanceledPage />} />
                        <Route path="/account" element={<AccountPage />} />
                        <Route path="/auth/discord/callback" element={<DiscordOAuthCallbackPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                      <AccountDiscordEnhancer />
                    </main>
                    <Footer />
                    <CartDrawer />
                    <ToastContainer />
                  </div>
                </CartProvider>
              </Tip4ServAuthProvider>
            </StoreProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
