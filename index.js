const Koa = require('koa');
const axios = require('axios');
const winston = require('winston');
const { bodyParser } = require("@koa/bodyparser");
require('dotenv').config();
const adaptEthCall = require('./middlewares/eth_call');
const jsonrpcMeta = require('./middlewares/jsonrpc_meta');
const adaptTxRelatedMethods = require('./middlewares/tx_related_methods');
const blockMethods = require('./middlewares/block_methods');
const adaptEthGetLogs = require('./middlewares/eth_getLogs');

const app = new Koa();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.JSONRPC_URL;
const L2_RPC_URL = process.env.L2_RPC_URL;

const l2_methods = [
    'zkevm_batchNumber',
    'zkevm_virtualBatchNumber',
    'zkevm_verifiedBatchNumber',
    'zkevm_getBatchByNumber',
    'bor_getSnapshotProposerSequence',  // cdk-erigon 未开放此方法
];

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './logs/proxy.log' }),
        new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    ]
});

// 解析 JSON 请求体
app.use(bodyParser());

app.use(jsonrpcMeta(logger));
// app.use(adaptEthCall);
// app.use(adaptTxRelatedMethods);
// app.use(blockMethods);
// app.use(adaptEthGetLogs(logger));

// 不支持 batch 请求
app.use(async (ctx) => {
    // 将请求转发到目标 JSON-RPC 服务器
    const url = l2_methods.indexOf(ctx.request.rpcMethod) > -1 ? L2_RPC_URL : TARGET_URL;
    const {data} = await axios.post(url, ctx.request.body, {
        headers: {
            'Accept-Encoding': null, // Explicitly set it to null or remove it
        },
    });
    ctx.body = data;
});

app.listen(PORT, () => {
    console.log(`JSON-RPC proxy server is running on port ${PORT}`);
});