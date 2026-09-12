export function getDemonArkCategoryArtwork(slug?: string | null, name?: string | null): string | null {
  const value = `${slug || ''} ${name || ''}`.trim().toLowerCase();

  if (value.includes('vip coin')) return '/vipcoinpile.png?v=20260911';
  if (value.includes('demon vip')) return '/demonarkvipbanner.png?v=20260911';
  if (value.includes('private')) return '/privateservercatagorylogo.png?v=20260911';
  if (value.includes('misc')) return '/misccatagorylogo.png?v=20260911';

  return null;
}
