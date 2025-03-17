const Koa = require('koa');
const websockify = require('koa-websocket');
const axios = require('axios');
const winston = require('winston');
const { bodyParser } = require("@koa/bodyparser");
require('dotenv').config();
const adaptEthCall = require('./middlewares/eth_call');
const jsonrpcMeta = require('./middlewares/jsonrpc_meta');
const adaptTxRelatedMethods = require('./middlewares/tx_related_methods');
const blockMethods = require('./middlewares/block_methods');
const adaptEthGetLogs = require('./middlewares/eth_getLogs');
const eth_transactionCount = require('./middlewares/eth_transactionCount');
const eth_getBalance = require('./middlewares/eth_getBalance');

const PORTS = process.env.PORTS || 3000;
const TARGET_URL = process.env.JSONRPC_URL;
const L2_RPC_URL = process.env.L2_RPC_URL;

const l2_methods = [
    'zkevm_batchNumber',
    'zkevm_virtualBatchNumber',
    'zkevm_verifiedBatchNumber',
    'zkevm_getBatchByNumber',
    'bor_getSnapshotProposerSequence',  // cdk-erigon 未开放此方法
];

// const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.combine(
//         winston.format.timestamp(),
//         winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
//     ),
//     transports: [
//         new winston.transports.Console(),
//         new winston.transports.File({ filename: './logs/proxy.log' }),
//         new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
//     ]
// });

function creatLogger(port) {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
        ),
        transports: [
            // new winston.transports.Console(),
            new winston.transports.File({ filename: `./logs/proxy_${port}.log` }),
            new winston.transports.File({ filename: `./logs/error_${port}.log`, level: 'error' }),
        ]
    });
}
async function startServer(port) {
    const logger = creatLogger(port);
    const app = websockify(new Koa());
    // 解析 JSON 请求体
    app.use(bodyParser());
    app.use(jsonrpcMeta(logger));
    app.use(eth_transactionCount);
    app.use(eth_getBalance);

    // app.use(adaptEthCall);
    // app.use(adaptTxRelatedMethods);
    // app.use(blockMethods);
    // app.use(adaptEthGetLogs(logger));

    // 不支持 batch 请求
    app.use(async (ctx) => {
        // 将请求转发到目标 JSON-RPC 服务器
        const url = l2_methods.indexOf(ctx.request.rpcMethod) > -1 ? L2_RPC_URL : TARGET_URL;
        const { data } = await axios.post(url, ctx.request.body, {
            headers: {
                'Accept-Encoding': null, // Explicitly set it to null or remove it
            },
        });
        if (!data) {
            console.log('No data found', ctx.request.body);
        }
        ctx.body = data;
    });

    // WebSocket 路由处理
    app.ws.use(async (ctx, next) => {
        // WebSocket 连接建立
        console.log(`WebSocket 连接已建立: ${ctx.request.socket.remoteAddress}`);

        // 监听消息
        ctx.websocket.on('message', async (message) => {
            try {
                const msgObj = JSON.parse(message);
                logger.info(`收到 WebSocket 消息: ${message}`);

                // 处理 JSON-RPC 请求
                const url = l2_methods.indexOf(msgObj.method) > -1 ? L2_RPC_URL : TARGET_URL;
                const { data } = await axios.post(url, msgObj, {
                    headers: {
                        'Accept-Encoding': null,
                    },
                });

                // 发送响应回客户端
                ctx.websocket.send(JSON.stringify(data));
            } catch (error) {
                logger.error(`WebSocket 错误: ${error.message}`);
                ctx.websocket.send(JSON.stringify({
                    jsonrpc: "2.0",
                    id: message.id || null,
                    error: {
                        code: -32603,
                        message: "Internal error",
                        data: error.message
                    }
                }));
            }
        });

        // 处理连接关闭
        ctx.websocket.on('close', () => {
            logger.info(`WebSocket 连接已关闭: ${ctx.request.socket.remoteAddress}`);
        });

        await next();
    });

    app.listen(port, () => {
        console.log(`JSON-RPC proxy server is running on port ${port}`);
    });
}


async function main() {
    const ports = PORTS.split(',').map(Number);
    for (const port of ports) {
        await startServer(port);
    }
}

main();