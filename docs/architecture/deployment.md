# Deployment Architecture

## Docker

Applications should be deployable with Docker.

Recommended services:

- `api`: Express.js backend.
- `frontend`: Next.js frontend.
- Remote PostgreSQL database for production.

## Environment

Keep runtime configuration in environment variables:

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `CORS_ORIGIN`
- `INITIAL_USER_EMAIL`
- `INITIAL_USER_PASSWORD`
- External service tokens as needed.

Rules:

- Do not commit real `.env` files.
- Provide `.env.example` in application repos.
- Validate required environment variables at startup.
- Keep secrets server-side.

## Dokploy / Reverse Proxy

### Same Domain With Path Routing (chosen)

- Site and admin panel: `https://app.example.com/`
- API: `https://app.example.com/api`

`web/nginx.conf` serves the built site and proxies `/api` to the API container. Vite's
dev server does the same, so development and production share one origin model.

This is not just convenience. Two things break under separate origins:

- The API answers `Cross-Origin-Resource-Policy`, which makes the browser refuse to
  **render** a public image fetched from another origin. The public router relaxes it
  to `cross-origin` as a safety net, but same-origin removes the problem at the root.
- The session cookie stops being first-party, which browsers increasingly restrict.

Only `/api` is proxied. `/docs` and `/openapi.json` stay unreachable from the site.

Environment:

```text
VITE_API_URL=            # empty: requests are relative to the site origin
PUBLIC_BASE_URL=https://app.example.com   # the SITE origin, not the API's
CORS_ORIGIN=https://app.example.com
BETTER_AUTH_URL=https://app.example.com
```

`PUBLIC_BASE_URL` is the prefix the API puts on the file URLs it hands to visitors and
on the OpenGraph image. With one origin it is the same value as the site.

Two nginx details that are easy to miss and fail loudly:

- `client_max_body_size` must be above `MAX_UPLOAD_BYTES`. The nginx default is 1 MB,
  so uploads would die at the proxy with a 413.
- `X-Forwarded-For` must be set, or the API counts every request against the proxy's
  IP and the rate limit fires for everyone at once.

nginx also serves `/robots.txt` and `/sitemap.xml` from the API, and sets the site's
Content-Security-Policy. The policy allows Google Fonts and inline style attributes but
not inline scripts; it was checked against the real build, not the dev server, because
Vite injects a dev-only inline script that production does not have.

### Separate API Domain

- Frontend: `https://app.example.com/`
- API: `https://api.example.com/`

Use this only when path routing is not available. Then `VITE_API_URL` must be filled
in, `CORS_ORIGIN` must list the site origin exactly, and the cookie becomes
third-party.

## Rate Limits

Two counters, on purpose:

```text
RATE_LIMIT_MAX=120          # admin panel and everything else
PUBLIC_RATE_LIMIT_MAX=600   # /api/public
LOGIN_RATE_LIMIT_MAX=5      # sign-in, stricter (SEC-003)
```

One number cannot serve both. The panel makes tens of requests a minute; a visitor
reading a work with a figure gallery makes dozens in one page view, and a whole office
shares one IP. With a single limit, either the panel is over-provisioned or visitors
lose their images.

## Data Safety

- Redeploying the application must not delete database data.
- Production migrations should be explicit and reviewed.
- Initial broad database privileges can be used to run migrations, then reduced to least privilege.
- Volumes should be used only for files that must persist outside the database.

