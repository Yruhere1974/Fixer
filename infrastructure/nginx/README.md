# Nginx Standards

> **Mandate:** Nginx serves as a **TLS-terminating reverse proxy** with **modern ciphers, HSTS, and security headers**. Plaintext HTTP, weak TLS, and config that lives only on the server are rejected.

See [`../README.md`](../README.md) for infrastructure principles.

## Source of Truth
Live Nginx config is **mirrored into this folder** — per [`../../AGENTS.md`](../../AGENTS.md), any change to `/etc/nginx/*` is copied back to `infrastructure/nginx/*` and committed. The repo is authoritative; the server is a deployment target.

```text
nginx/
├── nginx.conf                 # global: worker, gzip, log format
├── conf.d/
│   └── <service>.conf         # one server block per service
└── snippets/
    ├── tls.conf               # shared TLS params
    └── security-headers.conf
```

## Standards
- **TLS 1.2+ only**, strong cipher suite, OCSP stapling; redirect all `:80` → `:443`.
- **HSTS** (`Strict-Transport-Security`) plus `X-Content-Type-Options`, `X-Frame-Options`/CSP, `Referrer-Policy`.
- **Proxy headers**: forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` to upstreams.
- **Upstreams** named and health-aware; sensible `proxy_read_timeout`/buffering.
- **gzip/brotli** for text assets; cache headers for static content.
- **No secrets** in config; certs referenced by path, managed by the cert tooling (e.g. certbot).

## Reference (server block excerpt)
```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;
    include snippets/tls.conf;
    include snippets/security-headers.conf;

    location / {
        proxy_pass http://api_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server { listen 80; server_name api.example.com; return 301 https://$host$request_uri; }
```

## Anti-Patterns (Rejected by This Standard)
- ❌ Serving plaintext HTTP without a redirect to HTTPS.
- ❌ TLS 1.0/1.1 or weak ciphers.
- ❌ Config edited only on the server and never mirrored back to the repo.
- ❌ Missing forwarded headers (breaks client IP / scheme detection upstream).
- ❌ Secrets or API keys embedded in config.
