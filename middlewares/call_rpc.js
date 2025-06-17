const axios = require('axios');
const { TARGET_URL, L2_RPC_URL,PORT } = require('../config');
const { logger } = require('../logger');
const l2_methods = [
    'zkevm_batchNumber',
    'zkevm_virtualBatchNumber',
    'zkevm_verifiedBatchNumber',
    'zkevm_getBatchByNumber',
    'bor_getSnapshotProposerSequence',  // cdk-erigon 未开放此方法
];

// 获取目标 RPC URL
function getTargetUrl(method) {
    return l2_methods.includes(method) ? L2_RPC_URL : TARGET_URL;
}

// const logger = getApiLogger(PORT);

module.exports = async function (ctx, next) {
    const requestBody = ctx.request.body;
    const { method } = requestBody;
    const url = getTargetUrl(method);

    const { data } = await axios.post(url, requestBody, {
        headers: {
            'Accept-Encoding': null,
        },
        timeout: 30000, // 添加超时设置
    });

    if (!data) {
        logger.warn(`RPC 调用无响应数据: ${JSON.stringify(requestBody)}`);
    }
    ctx.body = data;
}