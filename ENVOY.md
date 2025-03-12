# Testing with Envoy

**Please note:** Testing with Envoy is **NOT** a guarantee that it will work the same way within FastEdge.

Namely not all API's are implemented within FastEdge, also FastEdge is running within NGINX `ngx_wasm_module`.

This is purely some config to help you get started: Make sure you understand the differences and use at your own risk !!

Your binaries cannot be using any FastEdge specific functions. e.g.

- getSecretEnv()

None of this is compatible with Envoy and it is not a a good substitute for testing full functionality.

### Setting up

`envoy.config`

```yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 127.0.0.1, port_value: 8099 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                codec_type: AUTO
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: svc_trendyol }
                http_filters:
                  - name: envoy.filters.http.wasm
                    typed_config:
                      "@type": type.googleapis.com/udpa.type.v1.TypedStruct
                      type_url: type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
                      value:
                        config:
                          name: "auth"
                          root_id: "auth"
                          vm_config:
                            vm_id: "my_vm_id"
                            runtime: "envoy.wasm.runtime.v8"
                            code:
                              local:
                                filename: "build/release.wasm"
                            allow_precompiled: false
                            environment_variables:
                              key_values:
                                {
                                  env_variable_name: "env_variable_value",
                                  another_env_variable_name: "another_env_variable_value",
                                }
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: svc_trendyol
      connect_timeout: 1.00s
      type: STATIC
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: svc_trendyol
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8085
```

This envoy config requires the running of a simple http server on `localhost:8085`

`http-server.js`

```js
import http from "http"; //create a server object:

http
  .createServer(function (req, res) {
    res.write("Hello World!");
    res.end(); //end the response
  })
  .listen(8085);
console.log("server started 8085");
```

# Running it all

Start the node server:

```sh
node ./server.js
```

Start the envoy proxy:

```sh
envoy -c envoycfg.yaml --log-level debug
```
