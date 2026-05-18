[← Back to examples](../README.md)

# API Key

This application validates requests using an `X-API-Key` header checked against a stored secret.

## What it does

In `onRequestHeaders`, the app:

1. Reads the expected API key from the `API_KEY` secret.
2. Checks the `X-API-Key` request header.
3. Returns `401 Unauthorized` if the header is missing.
4. Returns `403 Forbidden` if the key does not match.
5. On success, strips the `X-API-Key` header before forwarding to the upstream origin.

This is a simpler alternative to JWT validation when you need basic API authentication without token expiry or claims.

> **Production note:** The key comparison (`providedKey !== expectedKey`) is not constant-time, which opens a timing side-channel for a high-volume attacker. For production use, replace the comparison with a constant-time HMAC equality check or use the `jwt` example which includes proper cryptographic validation.

## Configuration

Set the following on your FastEdge application:

| Name | Type | Description |
|------|------|-------------|
| `API_KEY` | Secret | The expected API key value |

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/apiKey.wasm` | Optimised release binary — upload this to FastEdge |
| `build/apiKey-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/apiKey.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the `API_KEY` secret in the application settings.
