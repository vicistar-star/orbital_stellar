# @orbital/server

**Reference Express server for Orbital.** Combines `pulse-core`, `pulse-webhooks`, and an HTTP API into a single process you can deploy, fork, or use as the canonical example of how the packages fit together.

This is the binary that a self-hoster runs. Everything else in Orbital is a library.

## Endpoints

| Method   | Path                 | Description                                 |
| -------- | -------------------- | ------------------------------------------- |
| `POST`   | `/webhooks/register` | Register an address → webhook URL mapping   |
| `DELETE` | `/webhooks/:address` | Unregister an address                       |
| `GET`    | `/webhooks`          | List registered webhooks (secrets stripped) |
| `GET`    | `/webhooks/:address` | Get a single registration                   |
| `GET`    | `/events/:address`   | Server-Sent Events stream for live events   |
| `GET`    | `/health`            | Liveness probe                              |

All endpoints except `/health` require an API key — either `Authorization: Bearer <key>` (REST) or `?token=<key>` (SSE, since browsers cannot set headers on `EventSource`).

## Running locally

```bash
pnpm install
NETWORK=testnet API_KEY=dev-key pnpm --filter @orbital/server dev
```

The server listens on `PORT` (default `3000`). Point your client at `http://localhost:3000` and include the API key in every request.

## Register a webhook

```bash
curl -X POST http://localhost:3000/v1/webhooks/register \
  -H "Authorization: Bearer dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "GABC...",
    "url": "https://your-app.com/hooks",
    "secret": "shared-secret"
  }'
```

## Subscribe over SSE

```bash
curl -N "http://localhost:3000/v1/events/GABC...?token=dev-key"
```

Or from the browser, via `@orbital/pulse-notify`:

```tsx
useStellarEvent({
  serverUrl: "http://localhost:3000",
  address: "GABC...",
  token: "dev-key",
});
```

## Environment variables

| Variable         | Required | Description                                  |
| ---------------- | -------- | -------------------------------------------- |
| `NETWORK`        | yes      | `mainnet` or `testnet`                       |
| `API_KEY`        | yes      | Bearer token clients must present            |
| `PORT`           | no       | HTTP port (default `3000`)                   |
| `WEBHOOK_SECRET` | no       | HMAC key used to hash stored webhook secrets |

## Error responses

All error responses follow [RFC 7807](https://tools.ietf.org/html/rfc7807) (Problem Details for HTTP APIs) and are returned with `Content-Type: application/problem+json`.

### Error response shape

```json
{
  "type": "https://api.orbital.dev/errors/invalid-stellar-key",
  "title": "Invalid Stellar Key",
  "status": 400,
  "detail": "address must be a valid Stellar public key",
  "instance": "https://api.orbital.dev/requests/550e8400-e29b-41d4-a716-446655440000"
}
```

| Field      | Type   | Description                                             |
| ---------- | ------ | ------------------------------------------------------- |
| `type`     | string | A machine-readable error identifier (typically a URI)   |
| `title`    | string | A short, human-readable error summary                   |
| `status`   | number | The HTTP status code                                    |
| `detail`   | string | A specific explanation for this occurrence              |
| `instance` | string | Optional: A unique identifier for this error occurrence |

### Common error responses

| Status | Title                        | Description                                    |
| ------ | ---------------------------- | ---------------------------------------------- |
| 400    | `Missing Required Fields`    | Request body is missing required fields        |
| 400    | `Invalid Field Types`        | Field types do not match expectations          |
| 400    | `Invalid Stellar Key`        | Address is not a valid Stellar public key      |
| 400    | `Invalid Webhook URL`        | URL must be HTTPS and not point to private IPs |
| 409    | `Address Already Registered` | This address already has an active webhook     |
| 404    | `Not Found`                  | The requested address is not registered        |

## Security defaults

- **Request body limit.** `express.json()` enforces a **16 kb** maximum body size. Webhook registration payloads are small by design; oversized requests are rejected with `413 Payload Too Large`.
- **HTTPS enforcement.** The server rejects `http://`, `localhost`, and private-IP-range webhook URLs at registration time to prevent SSRF.
- **Stellar key validation.** Registered addresses must pass `StrKey.isValidEd25519PublicKey` before they're accepted.
- **Secrets are hashed.** Webhook secrets are HMAC-hashed before storage; the plaintext never persists beyond the request.
- **Timing-safe verification** is used throughout for HMAC comparisons.

## Graceful shutdown

On `SIGTERM` or `SIGINT`, the server:

1. Stops accepting new connections
2. Closes the upstream Horizon stream
3. Stops all watchers (clearing retry timers)
4. Closes the HTTP server
5. Exits cleanly — or hard-exits after 5 s if graceful shutdown stalls

## Current limitations

- **In-memory registry.** Webhook registrations are lost on restart. PostgreSQL persistence is the next roadmap item — see issues tagged [`server-sdk`](https://github.com/orbital/orbital/labels/server-sdk).
- **Single-tenant.** One `API_KEY` for the entire process. Multi-tenant auth belongs in the managed Cloud layer, not this reference server.
- **Single-process.** No leader election or horizontal scale. Deploy multiple instances only if they subscribe to disjoint address sets.

## Deployment

Sample Dockerfile, docker-compose, and Kubernetes manifests are in the open issues tracker. Contributions welcome.

## License

MIT
