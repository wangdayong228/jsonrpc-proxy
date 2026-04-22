# conflux 当前 RPC 问题（Request Body）

## 需要适配的 rpc

- `eth_getTransactionCount params[1] 不支持传 block hash`
- `eth_getBalance params[1] 不支持传 block hash`
- `eth_getCode params[1] 不支持传 block hash`
- `eth_getStorageAt params[1] 不支持非 hex 格式`
- `eth_getStorageAt params[2] 不支持传 block hash`
- `eth_call params[0] 不支持仅传 input 字段`
- `eth_call params[1].blockHash 不支持直接透传到底层节点`
- `eth_estimateGas params[0] 不支持仅传 input 字段`
- `eth_estimateGas params[1].blockHash 不支持直接透传到底层节点`
- `eth_getBlockReceipts params[0] 不支持传 block hash`

## 建虎发现的问题

### 案例 1：`cfx_getAccount` 查询时报 `Epoch number larger than the current pivot chain tip`

- 错误摘要：`Error processing request: Msg error detail: Epoch number larger than the current pivot chain tip`
- module：`stat-task`
- business：`token-audit`
- times：`4`
- detail：

```json
{
  "code": -32016,
  "method": "cfx_getAccount",
  "params": [
    "cfxtest:acapkxjzvpjds0vsnkn4naevxjv07mzfmjt7khpsdu",
    null
  ]
}
```

- 来源标记：`[scan 1] t-sync-1@t-scan-sync-HK , [StatTask]`
- 原始备注：`请求cfx_getAccount 报错，这是一个案例`

### 案例 2：`cfx_epochNumber(latest_finalized)` 报 `block_number is missing for best_hash`

- 错误摘要：`Error processing request: Msg error detail: block_number is missing for best_hash`
- module：`stat-task`
- business：`timer-stat-daily_burnt_fee_stat`
- times：`35`
- detail：

```json
{
  "code": -32016,
  "method": "cfx_epochNumber",
  "params": [
    "latest_finalized"
  ]
}
```

- 来源标记：`[scan 1] t-sync-1@t-scan-sync-HK , [StatTask]`

### 案例 3：`HomepageDashboard.supplyInfo` 调用 `cfx_getBalance` 报 state out-of-bound

- 错误摘要（原文）：
`Error processing request: Msg error detail: State for epoch (number=15120000 hash=0x6bd2acc8dc81e00ddeb8b0bfc07cba464f5cef3a212ff9ee6c1e0c532854ee2b) does not exist: out-of-bound StateAvailabilityBoundary { synced_state_height: 15120000, full_state_start_height: None, full_state_space: None, lower_bound: 15120000, upper_bound: 15120000, optimistic_executed_height: None, .. }`
- 日志来源：`open_api-1 | /scan/stat/service/HomepageDashboard.js supply info error`
- 调用栈关键路径：
  `ScanHttpProvider.request -> CFX.rpcMethod(getBalance) -> HomepageDashboard.supplyInfo -> HomepageDashboard.run`
- RPC detail（按原日志）：

```js
{
  code: -32016,
  method: 'cfx_getBalance',
  params: ['net8889:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa9r2c76rv', undefined]
}
```
