import Hero from '../components/home/Hero';
import ApiErrorNotice from '../components/ui/ApiErrorNotice';
import { usePageTitle } from '../lib/usePageTitle';
import { useStore } from '../lib/store';

export default function HomePage() {
  usePageTitle();
  const { error: storeError } = useStore();

  return (
    <div className="animate-fade-in bg-[#080403]">
      <Hero />
      {storeError && (
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <ApiErrorNotice title="DemonArk store connection error" message={storeError} />
        </div>
      )}
    </div>
  );
}
