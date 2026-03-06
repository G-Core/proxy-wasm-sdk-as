# Variables and Secrets

This application demonstrates reading environment variables and secrets, then forwarding their values as request headers to the upstream.

## What it does

In `onRequestHeaders`, the app:

1. Reads the `USERNAME` environment variable using `getEnv`.
2. Reads the `PASSWORD` secret using `getSecret`.
3. Logs both values at `info` level.
4. Injects them as `x-env-username` and `x-env-password` request headers so the upstream receives them.

This is useful as a reference for understanding how to access environment variables and secrets within a FastEdge plugin.

## Configuration

Set the following on your FastEdge application:

| Name       | Type                 | Description                            |
| ---------- | -------------------- | -------------------------------------- |
| `USERNAME` | Environment variable | The username value to forward upstream |
| `PASSWORD` | Secret               | The password value to forward upstream |

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
