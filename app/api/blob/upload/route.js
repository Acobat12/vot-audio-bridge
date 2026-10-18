import { handleUpload } from '@vercel/blob/client';

export const runtime = 'nodejs';
export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.UPLOAD_SECRET) {
    return Response.json({ error: 'Configure BLOB_READ_WRITE_TOKEN and UPLOAD_SECRET' }, { status: 503 });
  }
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // The browser submits this only when requesting a short-lived upload token.
        // Do not print or store clientPayload.
        if (typeof clientPayload !== 'string' || clientPayload !== process.env.UPLOAD_SECRET) {
          throw new Error('Неверный ключ загрузки');
        }
        if (typeof pathname !== 'string' || !/^audio\/[a-zA-Z0-9._-]+\.mp4$/i.test(pathname) || pathname.length > 180) {
          throw new Error('Разрешены только файлы audio/*.mp4');
        }
        return {
          allowedContentTypes: ['audio/mp4'],
          addRandomSuffix: true,
          tokenPayload: 'vot-audio-upload'
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob upload completed:', blob.pathname);
      }
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error?.message || 'Upload failed' }, { status: 400 });
  }
}
