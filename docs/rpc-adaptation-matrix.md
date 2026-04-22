# jsonrpc-proxy RPC 适配梳理

## 1. 范围

本文仅梳理两类内容：
- 运行时已接入中间件链的以太坊 RPC 适配（Request Body + Response）。
- 代码中已实现但当前未接入中间件链的适配逻辑。

不包含：
- L2 RPC 分流方法说明。
- 运行模式差异与环境开关说明。

## 2. 中间件链总览（与本文相关）

当前 `index.js` 中 `buildMiddlewareChain` 的顺序如下：

1. `jsonrpc_meta`
2. `eth_transactionCount`
3. `eth_getBalance`
4. `eth_getCode`
5. `eth_getStorageAt`
6. `eth_feeHistory`
7. `eth_estimateGas`
8. `eth_gasPrice`
9. `eth_getBlockByNumber`
10. `eth_getBlockByHash`
11. `eth_call`
12. `eth_getBlockReceipts`
13. `call_rpc`

## 3. Request Body 适配矩阵（生效中）

| RPC 方法 | 触发条件 | Request 改写 | 失败行为 | 代码位置 |
| --- | --- | --- | --- | --- |
| `eth_getTransactionCount` | `params[1]` 是 66 长度哈希字符串 | 先查区块，再把 `params[1]` 从 `blockHash` 改为 `0x<blockNumber>` | 查不到区块时直接返回 `header for hash not found`（`-32000`） | `middlewares/eth_transactionCount.js` |
| `eth_getBalance` | `params[1]` 是 66 长度哈希字符串 | 把 `params[1]` 从 `blockHash` 改为 `0x<blockNumber>` | 同上，查不到区块返回 `-32000` | `middlewares/eth_getBalance.js` |
| `eth_getCode` | `params[1]` 是 66 长度哈希字符串 | 把 `params[1]` 从 `blockHash` 改为 `0x<blockNumber>` | 同上，查不到区块返回 `-32000` | `middlewares/eth_getCode.js` |
| `eth_getStorageAt` | 请求命中该方法 | 1) `params[1]` 统一转成 `0x` 十六进制数量值；2) 若 `params[2]` 为 66 长度哈希，则改写为 `0x<blockNumber>` | 区块查不到返回 `-32000`；`BigInt(params[1])` 非法会抛错并进入统一错误响应 | `middlewares/eth_getStorageAt.js` |
| `eth_call` | 请求命中该方法 | 1) 若 `params[0].data` 缺失且有 `input`，补 `data = input`；2) 若 `params[1].blockHash` 存在，转换为底层可识别哈希 | 转换过程异常时抛错并进入统一错误响应 | `middlewares/eth_call.js` |
| `eth_estimateGas` | 请求命中该方法 | 与 `eth_call` 同一逻辑：补 `data`，并转换 `params[1].blockHash` | 同上 | `middlewares/eth_call.js` |
| `eth_getBlockByHash` | 请求命中该方法 | 若缓存中存在映射，则把 `params[0]` 从 `ethHash` 改成 `cfxHash`；不存在则保持原值 | 无映射不报错，继续透传 | `middlewares/eth_getBlockByHash.js` |
| `eth_getBlockReceipts` | `params[0]` 为 66 长度哈希字符串 | 先查区块，把 `params[0]` 从 `blockHash` 改成 `0x<blockNumber>` | 区块查不到返回 `-32000` | `middlewares/eth_getBlockReceipts.js` |

## 4. Response 适配矩阵（生效中）

| RPC 方法 | 触发条件 | Response 改写 | 失败行为 | 代码位置 |
| --- | --- | --- | --- | --- |
| `eth_feeHistory` | 请求命中该方法且 `ctx.body.result` 有 `baseFeePerGas` | 遍历 `baseFeePerGas` 并重写：低于 `maxPriorityFeePerGas` 则抬高；低于 `1 gwei` 则抬到 `1 gwei`；高于 `20 gwei` 则压到 `20 gwei` | `maxPriorityFeePerGas` 拉取失败会抛错并进入统一错误响应 | `middlewares/eth_feeHistory.js` |
| `eth_estimateGas` | 请求命中该方法且结果是十六进制字符串 | `result = result * 1.2`，上限 `30,000,000`，再转回十六进制 | 非十六进制结果时不改写，直接透传 | `middlewares/eth_estimateGas.js` |
| `eth_gasPrice` | 请求命中该方法且结果是十六进制字符串 | `result = result * 2`，上限 `20 gwei` | 非十六进制结果时不改写，直接透传 | `middlewares/eth_gasPrice.js` |
| `eth_getBlockByNumber` | 请求命中该方法且返回了 `result` | 对区块对象执行 `correctBlockHash` 修正 | 修正异常会抛错并进入统一错误响应 | `middlewares/eth_getBlockByNumber.js` |
| `eth_getBlockByHash` | 请求命中该方法 | 对返回区块执行 `correctBlockHash` 修正 | 修正异常会抛错并进入统一错误响应 | `middlewares/eth_getBlockByHash.js` |
| `eth_getBlockReceipts` | 请求命中该方法且回包有 receipt 列表 | 每条 receipt 与 log：保留旧值到 `rawBlockHash`，并把 `blockHash` 重写为查询区块哈希 | 列表为空时不改写，直接透传 | `middlewares/eth_getBlockReceipts.js` |

## 5. 未接入但已实现的适配

以下中间件文件存在实现，但当前 `buildMiddlewareChain` 未挂载：

| 中间件 | 主要适配点 | 文件 |
| --- | --- | --- |
| `eth_getLogs` | 对 `eth_getLogs` 的返回日志按 `blockNumber` 回查区块并修正 `blockHash` | `middlewares/eth_getLogs.js` |
| `tx_related_methods` | 统一修正交易对象中的 `v/yParity`、`r/s` 字段；也可批量处理区块内交易对象 | `middlewares/tx_related_methods.js` |
| `block_methods` | 当区块交易列表为空时，固定 `transactionsRoot` 为空树根 | `middlewares/block_methods.js` |

> 说明：`index.js` 虽有这些中间件的 `require`，但当前未 `push` 到链路中，因此不会在运行时生效。
