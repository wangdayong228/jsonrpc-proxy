# jsonrpc-proxy

## Run

proxy for op-stack
```sh
pm2 start "ENV_FILE=.env_op node ./index.js" --name jsonrpc-proxy  
```

proxy for op-cdk
```sh
pm2 start "ENV_FILE=.env_cdk node ./index.js" --name jsonrpc-proxy-cdk
```