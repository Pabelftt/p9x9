# p9x9.com-new

P9X9 - free adult video platform. Next.js 15 (App Router) + MongoDB. Fast SSR, data caching, infinite scroll, fully responsive modern UI/UX.

## Production deployment

Configure `MONGO_URI` in the hosting provider's server-side environment settings.
It must point to the MongoDB database containing the site's `posts` collection.
For MongoDB Atlas, confirm the database user has the required access and that the
hosting provider can reach the cluster through its network access rules. Restart
or redeploy after changing environment variables. Never commit `.env`.

Use the exact cluster URI shown by MongoDB Atlas under **Connect → Drivers**.
The hostname must be the unique hostname for your cluster (for example,
`cluster0.<your-cluster-id>.mongodb.net`), not the generic text
`cluster.mongodb.net`. Use a MongoDB database user, URL-encode special
characters in its password, and allow the deployment host in Atlas Network
Access.

Build and run the standalone production server with:

```bash
npm run build
npm start
```

The build copies the required static assets into the standalone output. Before
publishing, verify `/api/posts?page=1&limit=1` returns the expected live record.
If it returns an error, check the deployment logs and MongoDB network settings;
the application does not substitute sample records when MongoDB is unavailable.

## Video playback configuration

Copy `.env.example` into your local environment file and set `VIDEO_REDIRECT_URL`
to the destination used after a visitor explicitly selects Continue in the
video prompt. The destination is read server-side; if it is unset or invalid,
the visitor continues directly to the video.

## Ad settings

The Popunder, Social Bar, and video redirect placements are enabled by default.
An authenticated administrator can change each placement independently at
`/admin/ads`; the page shows whether each one is active. Ad scripts are loaded
on public pages only and are excluded from all `/admin` pages. Set
`VIDEO_REDIRECT_URL` in the deployment environment to choose the video redirect
destination.

Video media is served through the same-origin `/api/videos/[routeName]/media`
endpoint. Public media responses use a 10-minute browser cache and preserve
HTTP byte-range requests. Responses marked private or `no-store` by the source
are not cached.

## Personal features

The site includes local browser favorites and a recently viewed history. These are stored in `localStorage` and remain available across page reloads without requiring a user account. A watch on a video automatically adds it to the history; you can manage favorites and history from the top navigation or dedicated pages.

## Web push setup

If you want browser push notifications, populate the VAPID placeholders in `.env`:

- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`

Generate a VAPID keypair with:

```bash
npx web-push generate-vapid-keys
```

Then set the generated public key in the browser-facing variable and the private key in the server-only variable. Keep this same key pair in the build and runtime environment, then rebuild and redeploy if either key changes. Subscriptions are stored in MongoDB, and an admin can send messages from `/admin/notifications`. Configure `WEB_PUSH_CONTACT_EMAIL` for the VAPID contact. Actual push delivery requires valid matching keys, a saved browser subscription, and HTTPS in production. Redirects accept any HTTP or HTTPS URL, as well as a path on this site; other URL schemes are rejected.

## Admin and integration secrets

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` to enable environment-based
admin credentials. Set `ADMIN_SESSION_SECRET` to a random value of at least 32
characters; it signs the HttpOnly admin session cookie. Generate one locally
with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
An authenticated admin session persists for 30 days, and visiting `/admin`
while signed in opens the dashboard. Use Logout to end the session sooner.
The external post synchronization integration is disabled until
`P9X9_SYNC_API_KEY` is configured. Keep all of these values out of source
control and rotate any integration key that was previously embedded in source.
Legacy database admin passwords are upgraded to a salted scrypt hash after a
successful login; the existing password field and account records are retained.
The cross-site data ingestion APIs continue to accept their existing requests
while `DATA_SYNC_API_KEY` is unset. To enable authentication without changing
their paths or response formats, configure the same key on the sending service
and send it in the `X-P9X9-Sync-Key` header before setting it here.
