[← Back to examples](../README.md)

# Variables and Secrets

This application demonstrates reading environment variables and secrets, then forwarding their values as request headers to the upstream.

## What it does

In `onRequestHeaders`, the app:

1. Reads the `USERNAME` environment variable using `getEnv`.
2. Reads the `PASSWORD` secret using `getSecret`.
3. Logs that both values were retrieved (without logging the secret value itself).
4. Injects them as `x-env-username` and `x-env-password` request headers so the upstream receives them.

This is useful as a reference for understanding how to access environment variables and secrets within a FastEdge plugin.

> **Security warning:** Never log secret values verbatim in production. Logs are often persisted and accessible to operators who should not see credential values. This example logs the secret's length rather than its content. Similarly, be deliberate about which upstream systems receive secret values via forwarded headers — limit forwarding to systems that need it.

## Configuration

Set the following on your FastEdge application:

| Name       | Type                 | Description                            |
| ---------- | -------------------- | -------------------------------------- |
| `USERNAME` | Environment variable | The username value to forward upstream |
| `PASSWORD` | Secret               | The password value to forward upstream |

## Local testing

The fixture at `fixtures/happy-path.test.json` uses `"dotenv": {"enabled": true}` to load values from `fixtures/.env`. The runner maps `FASTEDGE_VAR_ENV_<NAME>` to `getEnv("NAME")` and `FASTEDGE_VAR_SECRET_<NAME>` to `getSecret("NAME")`.

To test locally with the visual debugger, create `fixtures/.env`:

```
FASTEDGE_VAR_ENV_USERNAME=my-username
FASTEDGE_VAR_SECRET_PASSWORD=my-password
```

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                                   | Description                                        |
| -------------------------------------- | -------------------------------------------------- |
| `build/variablesAndSecrets.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/variablesAndSecrets-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/variablesAndSecrets.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the `USERNAME` environment variable and the `PASSWORD` secret in the application settings.
