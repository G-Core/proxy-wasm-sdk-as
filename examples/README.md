# FastEdge AssemblyScript Examples

AssemblyScript examples for building CDN applications on the [FastEdge](https://gcore.com/fastedge)
network using
[`@gcoredev/proxy-wasm-sdk-as`](https://www.npmjs.com/package/@gcoredev/proxy-wasm-sdk-as).

## Getting Started Examples

| Example | Description |
| --- | --- |
| [helloWorld](./helloWorld/) | Simplest CDN app skeleton — all lifecycle hooks with pass-through |
| [headers](./headers/) | Add, remove, and replace HTTP headers with validation |
| [body](./body/) | Request and response body read and manipulation |
| [variablesAndSecrets](./variablesAndSecrets/) | Read environment variables and secrets, forward as headers |
| [logTime](./logTime/) | Log UTC timestamps at request and response phases |
| [properties](./properties/) | Read and expose FastEdge runtime properties |

## Full Examples

| Example | Description |
| --- | --- |
| [abTesting](./abTesting/) | Cookie-based A/B traffic splitting at the CDN layer |
| [apiKey](./apiKey/) | Validate `X-API-Key` header against a secret |
| [cacheControl](./cacheControl/) | Content-type-aware Cache-Control response headers |
| [cors](./cors/) | CORS preflight handling and response headers |
| [customErrorPages](./customErrorPages/) | Replace 4xx/5xx responses with branded HTML error pages |
| [geoBlock](./geoBlock/) | Block requests by country using a `BLACKLIST` env var |
| [geoRedirect](./geoRedirect/) | Route requests to different origins by country code |
| [httpCall](./httpCall/) | Async HTTP dispatch to an external service with callback |
| [jwt](./jwt/) | Validate JWT Bearer tokens (requires `@gcoredev/as-jwt` dep) |
| [kvStore](./kvStore/) | Query a KV Store — get/scan/zrange/zscan/bfExists |
| [largeDictionary](./largeDictionary/) | Read large env vars (> 64 KB) via the dictionary API |

## Usage

Each example is a standalone project. To build one:

```sh
cd <example-name>
npm install
npm run asbuild
```

Each example installs `@gcoredev/proxy-wasm-sdk-as` from npm. Build output goes to `build/`.
