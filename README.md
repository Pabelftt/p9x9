# p9x9.com-new

P9X9 - free adult video platform. Next.js 15 (App Router) + MongoDB. Fast SSR, data caching, infinite scroll, fully responsive modern UI/UX.

## Video playback configuration

Copy `.env.example` into your local environment file and set `VIDEO_REDIRECT_URL`
to the destination used after a visitor explicitly selects Continue in the
video prompt. The destination is read server-side; if it is unset or invalid,
the visitor continues directly to the video.

Video media is served through the same-origin `/api/videos/[routeName]/media`
endpoint. Public media responses use a 10-minute browser cache and preserve
HTTP byte-range requests. Responses marked private or `no-store` by the source
are not cached.
