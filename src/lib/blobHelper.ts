/**
 * Helper to resolve media URLs, automatically proxying private Vercel Blob URLs
 * through /api/blob so they load with server-side authentication headers.
 */
export function getDisplayImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/api/')) {
    return url;
  }
  if (url.includes('.blob.vercel-storage.com')) {
    return `/api/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}
