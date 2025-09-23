const Koa = require("koa");
const websockify = require("koa-websocket");
const axios = require("axios");
const { bodyParser } = require("@koa/bodyparser");
const cors = require("./middlewares/cors");
const adaptEthCall = require("./middlewares/eth_call");
const jsonrpcMeta = require("./middlewares/jsonrpc_meta");
const adaptTxRelatedMethods = require("./middlewares/tx_related_methods");
const blockMethods = require("./middlewares/block_methods");
const adaptEthGetLogs = require("./middlewares/eth_getLogs");
const eth_transactionCount = require("./middlewares/eth_transactionCount");
const eth_getBalance = require("./middlewares/eth_getBalance");
const eth_getCode = require("./middlewares/eth_getCode");
const eth_getStorageAt = require("./middlewares/eth_getStorageAt");
const eth_estimateGas = require("./middlewares/eth_estimateGas");
const eth_feeHistory = require("./middlewares/eth_feeHistory");
const eth_getBlockByNumber = require("./middlewares/eth_getBlockByNumber");
const eth_getBlockByHash = require("./middlewares/eth_getBlockByHash");
const eth_call = require("./middlewares/eth_call");
const eth_getBlockReceipts = require("./middlewares/eth_getBlockReceipts");
const callRpc = require("./middlewares/call_rpc");
const { getDB } = require("./lib/cache");
const { loopCorrectBlockHashs } = require("./services/correct_block_hash");
const { PORT, TARGET_URL, L2_RPC_URL, CORRECT_BLOCK_HASH, LOOP_CORRECT_BLOCK_HASH } = require("./config");
const { logger } = require("./logger");
Error.stackTraceLimit = Infinity;

// 构建中间件链
function buildMiddlewareChain(logger) {
    const middlewares = [];
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
    middlewares.push(callRpc);
    return middlewares;
}

// 创建错误响应
function createErrorResponse(id, message, code = -32603) {
    return {
        jsonrpc: "2.0",
        id: id || null,
        error: {
            code: code,
            message: message || "Internal error",
            data: message,
        },
    };
}

// 创建一个处理单个 RPC 请求的函数
// @param {Object} rpcRequest - RPC 请求体，结构为 {id, method, params}
// @param {Object} logger - 日志记录器
// @param {Array} middlewareChain - 中间件链
// @returns {Promise<Object>} - 处理后的 RPC 响应
async function processSingleRequest(rpcRequest, logger, middlewareChain) {
    if (!rpcRequest || !rpcRequest.method) {
        logger.error(`无效的请求格式: ${JSON.stringify(rpcRequest)}`);
        return createErrorResponse(rpcRequest?.id, "Invalid request format");
    }

    const mockCtx = {
        request: {
            body: rpcRequest,
        },
        response: {
            body: undefined,
        },
    };

    Object.defineProperty(mockCtx, "body", {
        get() {
            return this.response.body;
        },
        set(val) {
            this.response.body = val;
        },
    });

    // 执行中间件链
    let index = 0;
    const next = async () => {
        if (index <= middlewareChain.length) {
            const middleware = middlewareChain[index++];
            await middleware(mockCtx, next);
        }
    };

    try {
        await next();
        return mockCtx.body;
    } catch (error) {
        logger.error(`处理单个请求出错: ${error.message}, 请求: ${JSON.stringify(rpcRequest)}`);
        return createErrorResponse(rpcRequest.id, error.message);
    }
}

// 处理批量请求
async function processBatchRequest(requests, logger, middlewareChain) {
    if (!Array.isArray(requests) || requests.length === 0) {
        return [];
    }

    logger.info(`处理批量请求，包含 ${requests.length} 个请求`);

    // 并行处理所有请求
    return Promise.all(requests.map((request) => processSingleRequest(request, logger, middlewareChain)));
}

async function startServer(port) {
    logger.info(`Starting server, port ${port}, TARGET_URL: ${TARGET_URL}, L2_RPC_URL: ${L2_RPC_URL}`);

    const app = websockify(new Koa());
    app.use(bodyParser());
    app.use(cors);

    const middlewareChain = buildMiddlewareChain(logger);
    // 处理 RPC 请求（包括批量请求）
    app.use(async (ctx) => {
        // 检查是否为批量请求 (数组)
        if (Array.isArray(ctx.request.body)) {
            ctx.body = await processBatchRequest(ctx.request.body, logger, middlewareChain);
        } else {
            ctx.body = await processSingleRequest(ctx.request.body, logger, middlewareChain);
        }
    });

    // WebSocket 路由处理
    app.ws.use(async (ctx, next) => {
        // WebSocket 连接建立
        logger.info(`WebSocket 连接已建立: ${ctx.request.socket.remoteAddress}`);

        // 监听消息
        ctx.websocket.on("message", async (message) => {
            try {
                const msgObj = JSON.parse(message);

                // 检查是否为批量请求
                if (Array.isArray(msgObj)) {
                    const results = await processBatchRequest(msgObj, logger, middlewareChain);
                    ctx.websocket.send(JSON.stringify(results));
                } else {
                    const result = await processSingleRequest(msgObj, logger, middlewareChain);
                    ctx.websocket.send(JSON.stringify(result));
                }
            } catch (error) {
                logger.error(`WebSocket 错误: ${error.message}`);
                try {
                    ctx.websocket.send(JSON.stringify(createErrorResponse(null, error.message)));
                } catch (sendError) {
                    logger.error(`WebSocket 发送错误响应失败: ${sendError.message}`);
                }
            }
        });

        // 处理连接关闭
        ctx.websocket.on("close", () => {
            logger.info(`WebSocket 连接已关闭: ${ctx.request.socket.remoteAddress}`);
        });

        await next();
    });

    app.listen(port, () => {
        logger.info(`JSON-RPC proxy server is running on port ${port}`);
    });
}

async function main() {
    process.on("uncaughtException", (error) => {
        console.error("未捕获的异常:", error);
        console.error("完整堆栈:", error.stack);
        process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
        console.error("未处理的 Promise 拒绝:", reason);
        console.error("Promise:", promise);
        console.error("当前堆栈:", new Error().stack);
    });

    try {
        await getDB().initTable();
        if (LOOP_CORRECT_BLOCK_HASH) {
            await loopCorrectBlockHashs();
        }
        await startServer(PORT);
    } catch (error) {
        console.error(`服务启动失败: ${error.message}, ${error.stack}`);
        process.exit(1);
    }
}

main();
