// Next.js App Router Route Handler: app/api/upload/route.ts
// Handles binary asset uploads to Vercel Blob with graceful offline/preview fallback

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle standard FormData file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const filename = (formData.get('filename') as string) || file?.name || `vault-${Date.now()}.webp`;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      // Check for Vercel Blob read/write token
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`vault/${Date.now()}-${filename}`, file, {
          access: 'public',
        });
        return NextResponse.json({
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
        });
      }

      // Fallback in local/preview environments: convert buffer to data URL
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mime = file.type || 'image/webp';
      const base64Url = `data:${mime};base64,${buffer.toString('base64')}`;

      return NextResponse.json({
        url: base64Url,
        pathname: `vault/${filename}`,
        contentType: mime,
        note: 'Stored locally via data URL fallback (Set BLOB_READ_WRITE_TOKEN for live cloud CDN)',
      });
    }

    // Handle Base64 JSON payload
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { base64Data, filename = `vault-${Date.now()}.webp` } = body;

      if (!base64Data) {
        return NextResponse.json({ error: 'base64Data is required' }, { status: 400 });
      }

      // Extract raw base64 and mime
      const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      const mime = matches ? matches[1] : 'image/webp';
      const rawData = matches ? matches[2] : base64Data;
      const buffer = Buffer.from(rawData, 'base64');

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`vault/${Date.now()}-${filename}`, buffer, {
          access: 'public',
          contentType: mime,
        });
        return NextResponse.json({
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
        });
      }

      // Fallback: Return the prepared base64 URL
      return NextResponse.json({
        url: base64Data,
        pathname: `vault/${filename}`,
        contentType: mime,
        note: 'Saved offline/locally. Synced to IndexedDB.',
      });
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
  } catch (error: any) {
    console.error('Vercel Blob upload failed:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
