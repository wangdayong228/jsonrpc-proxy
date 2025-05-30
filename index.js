const Koa = require('koa');
const websockify = require('koa-websocket');
const axios = require('axios');
const { bodyParser } = require("@koa/bodyparser");
const adaptEthCall = require('./middlewares/eth_call');
const jsonrpcMeta = require('./middlewares/jsonrpc_meta');
const adaptTxRelatedMethods = require('./middlewares/tx_related_methods');
const blockMethods = require('./middlewares/block_methods');
const adaptEthGetLogs = require('./middlewares/eth_getLogs');
const eth_transactionCount = require('./middlewares/eth_transactionCount');
const eth_getBalance = require('./middlewares/eth_getBalance');
const eth_getCode = require('./middlewares/eth_getCode');
const eth_getStorageAt = require('./middlewares/eth_getStorageAt');
const eth_estimateGas = require('./middlewares/eth_estimateGas');
const eth_feeHistory = require('./middlewares/eth_feeHistory');
const eth_getBlockByNumber = require('./middlewares/eth_getBlockByNumber');
const eth_getBlockByHash = require('./middlewares/eth_getBlockByHash');
const eth_call = require('./middlewares/eth_call');
const eth_getBlockReceipts = require('./middlewares/eth_getBlockReceipts');
const { getDB } = require('./lib/cache');
const { loopCorrectBlockHashs } = require('./services/correct_block_hash');
const { PORTS, TARGET_URL, L2_RPC_URL, CORRECT_BLOCK_HASH } = require('./config');
const { getApiLogger } = require('./logger');

const l2_methods = [
    'zkevm_batchNumber',
    'zkevm_virtualBatchNumber',
    'zkevm_verifiedBatchNumber',
    'zkevm_getBatchByNumber',
    'bor_getSnapshotProposerSequence',  // cdk-erigon 未开放此方法
];

// 构建中间件链
function buildMiddlewareChain(logger) {
    const middlewares = [];

    // 添加请求元数据处理
    middlewares.push(jsonrpcMeta(logger));
    middlewares.push(eth_transactionCount);
    middlewares.push(eth_getBalance);
    middlewares.push(eth_getCode);
    middlewares.push(eth_getStorageAt);
    middlewares.push(eth_feeHistory);
    middlewares.push(eth_estimateGas);

    // 按照逻辑顺序添加中间件
    if (CORRECT_BLOCK_HASH) {
        middlewares.push(eth_getBlockByNumber);
        middlewares.push(eth_getBlockByHash);
        middlewares.push(eth_call);
        middlewares.push(eth_getBlockReceipts);
    }
    return middlewares;
}

// 获取目标 RPC URL
function getTargetUrl(method) {
    return l2_methods.includes(method) ? L2_RPC_URL : TARGET_URL;
}

// 创建错误响应
function createErrorResponse(id, message, code = -32603) {
    return {
        jsonrpc: "2.0",
        id: id || null,
        error: {
            code: code,
            message: message || "Internal error",
            data: message
        }
    };
}

// 创建一个处理单个 RPC 请求的函数
// request 是rpc 请求体， {id, method, params}
async function processSingleRequest(request, logger, middlewareChain) {
    if (!request || !request.method) {
        logger.error(`无效的请求格式: ${JSON.stringify(request)}`);
        return createErrorResponse(request?.id, "Invalid request format");
    }

    // // 创建一个模拟的 ctx 对象
    // const mockCtx = {
    //     request: {
    //         body: request,
    //         rpcId: request.id,
    //         rpcMethod: request.method
    //     },
    //     body: undefined
    // };

    const { id, method } = request;
    const mockCtx = {
        request: {
            body: request,
        },
        response: {
            body: undefined
        },
    };

    Object.defineProperty(mockCtx, 'body', {
        get() {
            return this.response.body;
        },
        set(val) {
            this.response.body = val;
        }
    });

    // 执行中间件链
    let index = 0;
    const next = async () => {
        if (index < middlewareChain.length) {
            const middleware = middlewareChain[index++];
            await middleware(mockCtx, next);
        } else {
            // 所有中间件执行完毕后，执行实际的 RPC 调用
            const url = getTargetUrl(method);
            try {
                const { data } = await axios.post(url, request, {
                    headers: {
                        'Accept-Encoding': null,
                    },
                    timeout: 30000, // 添加超时设置
                });

                if (!data) {
                    logger.warn(`RPC 调用无响应数据: ${JSON.stringify(request)}`);
                }

                mockCtx.body = data;
            } catch (error) {
                logger.error(`RPC 调用失败: ${error.message}`);
                mockCtx.body = createErrorResponse(
                    id,
                    `RPC call failed: ${error.message}`
                );
            }
        }
    };

    try {
        await next();
        return mockCtx.body;
    } catch (error) {
        logger.error(`处理单个请求出错: ${error.message}, 请求: ${JSON.stringify(request)}`);
        return createErrorResponse(request.id, error.message);
    }
}

// 处理批量请求
async function processBatchRequest(requests, logger, middlewareChain) {
    if (!Array.isArray(requests) || requests.length === 0) {
        return [];
    }

    logger.info(`处理批量请求，包含 ${requests.length} 个请求`);

    // 并行处理所有请求
    return Promise.all(
        requests.map(request => processSingleRequest(request, logger, middlewareChain))
    );
}

async function startServer(port) {
    const logger = getApiLogger(port);
    logger.info(`Starting server, port ${port}, TARGET_URL: ${TARGET_URL}, L2_RPC_URL: ${L2_RPC_URL}`);

    const app = websockify(new Koa());
    app.use(bodyParser());

    const middlewareChain = buildMiddlewareChain(logger);
    // 处理 RPC 请求（包括批量请求）
    app.use(async (ctx) => {
        // 检查是否为批量请求 (数组)
        if (Array.isArray(ctx.request.body)) {
            ctx.body = await processBatchRequest(ctx.request.body, logger, middlewareChain);
        } else {
            // // 普通请求直接转发
            // try {
            //     const url = getTargetUrl(ctx.request.rpcMethod);
            //     const { data } = await axios.post(url, ctx.request.body, {
            //         headers: {
            //             'Accept-Encoding': null,
            //         },
            //         timeout: 30000, // 添加超时设置
            //     });

            //     if (!data) {
            //         logger.warn(`RPC 调用无响应数据: ${JSON.stringify(ctx.request.body)}`);
            //     }

            //     ctx.body = data;
            // } catch (error) {
            //     logger.error(`RPC 调用失败: ${error.message}`);
            //     ctx.body = createErrorResponse(
            //         ctx.request.rpcId, 
            //         `RPC call failed: ${error.message}`
            //     );
            // }
            ctx.body = await processSingleRequest(ctx.request.body, logger, middlewareChain);
        }
    });

    // WebSocket 路由处理
    app.ws.use(async (ctx, next) => {
        // WebSocket 连接建立
        logger.info(`WebSocket 连接已建立: ${ctx.request.socket.remoteAddress}`);

        // 监听消息
        ctx.websocket.on('message', async (message) => {
            try {
                const msgObj = JSON.parse(message);

                // 检查是否为批量请求
                if (Array.isArray(msgObj)) {
                    const results = await processBatchRequest(msgObj, logger, middlewareChain);
                    ctx.websocket.send(JSON.stringify(results));
                } else {
                    // // 普通 WebSocket 请求
                    // try {
                    //     const url = getTargetUrl(msgObj.method);
                    //     const { data } = await axios.post(url, msgObj, {
                    //         headers: {
                    //             'Accept-Encoding': null,
                    //         },
                    //         timeout: 30000,
                    //     });

                    //     // 发送响应回客户端
                    //     ctx.websocket.send(JSON.stringify(data));
                    // } catch (error) {
                    //     logger.error(`WebSocket RPC 调用失败: ${error.message}`);
                    //     ctx.websocket.send(JSON.stringify(
                    //         createErrorResponse(msgObj.id, error.message)
                    //     ));
                    // }
                    const result = await processSingleRequest(msgObj, logger, middlewareChain);
                    ctx.websocket.send(JSON.stringify(result));
                }
            } catch (error) {
                logger.error(`WebSocket 错误: ${error.message}`);
                try {
                    ctx.websocket.send(JSON.stringify(
                        createErrorResponse(null, error.message)
                    ));
                } catch (sendError) {
                    logger.error(`WebSocket 发送错误响应失败: ${sendError.message}`);
                }
            }
        });

        // 处理连接关闭
        ctx.websocket.on('close', () => {
            logger.info(`WebSocket 连接已关闭: ${ctx.request.socket.remoteAddress}`);
        });

        await next();
    });

    app.listen(port, () => {
        logger.info(`JSON-RPC proxy server is running on port ${port}`);
    });
}

async function main() {
    try {
        await getDB().initTable();
        await loopCorrectBlockHashs();

        const ports = PORTS.split(',').map(Number);
        for (const port of ports) {
            await startServer(port);
        }
    } catch (error) {
        console.error(`服务启动失败: ${error.message}, ${error.stack}`);
        process.exit(1);
    }
}

main();