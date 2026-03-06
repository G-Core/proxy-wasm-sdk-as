# JWT Validation

This application validates a JWT Bearer token on every incoming request using the [`@gcoredev/as-jwt`](https://www.npmjs.com/package/@gcoredev/as-jwt) library.

## What it does

In `onRequestHeaders`, the app:

1. Reads the HMAC secret from a FastEdge secret variable named `secret`.
2. Extracts the `Authorization: Bearer <token>` header.
3. Verifies the token signature and expiry using `jwtVerify()`.
4. Allows the request through on a valid token, or returns `401`/`403` on missing, expired, or invalid tokens.

## Configuration

Set the following secret variable on your FastEdge application:

| Secret   | Description                                                        |
| -------- | ------------------------------------------------------------------ |
| `secret` | The HMAC-SHA256 signing secret (at least 256 bits / 32 characters) |

## Testing tokens

**Expired token** (will return `403 Forbidden`):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk3ODMxMDg2MX0.egSSDoDdAHz8Kqee7be9N168CDEwOiOej96Idm2c1yQ
```

**Valid token** (expiry: 2035-01-01, will return `200 OK`):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjIwNTEyMjYwNjF9.zn_pSdcBo8T3SvNgMVYzWc5CU_MKqOlms7TpZXhPtJU
```

Both tokens use the secret `a-string-secret-at-least-256-bits-long-thats-hard-to-break`.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                   | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `build/jwt.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/jwt-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/jwt.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the `secret` secret variable in the application settings.

For more on secrets and secret rotation slots, see the [FastEdge secrets documentation](https://gcore.com/docs/fastedge/secrets-manager/slots).
