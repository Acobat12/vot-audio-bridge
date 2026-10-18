# VOT Audio Bridge

A small Vercel/Next.js app that uploads **already valid MP4 audio files** directly from the browser to **public Vercel Blob**, and returns a public HTTPS URL. The file does **not** pass through a Vercel Function.

## Deploy from GitHub

1. Upload all files and folders from this archive **to the repository root**, preserving `app/` and `package.json`.
2. In Vercel, import the GitHub repository. Framework preset: **Next.js**. Deploy.
3. In your Vercel project, go to **Storage**, create a **Blob** store with **Public** access, and connect it to the project. Vercel should provide `BLOB_READ_WRITE_TOKEN` automatically.
4. In **Project Settings → Environment Variables**, add `UPLOAD_SECRET` with a long random password (at least 32 random characters). Do not commit this secret to GitHub. Enable it for Production.
5. Redeploy if necessary. Open your project's `.vercel.app` URL, choose a valid `.mp4`, enter the secret, and click Upload.
6. Copy the resulting `*.public.blob.vercel-storage.com` URL.

## Important limits and behavior

- This project does **not** download Bilibili audio or convert `.m4s` to `.mp4`. Use a valid MP4 file, not a renamed fragmented DASH stream. Browser download/remux integration with VOT is a separate step.
- Uses `@vercel/blob/client` multipart uploads, intended for large files (e.g. 270 MiB); actual limits and charges depend on your Vercel plan and current Blob quotas.
- Files are **public** and remain stored until deleted from Vercel Blob Storage; deleting them is not automatic.
- The `UPLOAD_SECRET` protects the token endpoint from casual unauthorized uploads, but the browser sends it to the Vercel API. Use HTTPS, keep it secret, and rotate if exposed. It is not a multi-user authentication system or rate limiter.
- Public MP4 URL does **not** guarantee that VOT/Yandex accepts the audio codec, file size, URL or duration. Test with the actual VOT integration.
- `BLOB_READ_WRITE_TOKEN` must remain server-side; never embed it in browser JavaScript.

Docs: https://vercel.com/docs/vercel-blob/client-upload

## Diagnostic build

The upload form now reports upload stage, transferred bytes, rate, elapsed time, and inactivity warnings after 30 seconds. It offers cancellation via AbortController and displays a copyable error summary. This helps diagnose multipart completion stalls but does not itself guarantee resolution of network or SDK failures. Do not share HAR request bodies, authorization headers, or UPLOAD_SECRET.
