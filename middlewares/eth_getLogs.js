const request = require('../rpcClient');

module.exports = function(logger) {
    const blockNumHashCache = {};

    return async function(ctx, next) {

        await next();

        if (ctx.request.rpcMethod === 'eth_getLogs') {
            for(let i = 0; i < ctx.body.result.length; i++) {
                let blockNum = ctx.body.result[i].blockNumber;
                if (!blockNumHashCache[blockNum]) {
                    logger.error("fetching block");
                    let blockRes = await request('eth_getBlockByNumber', [blockNum, false]);
                    if (blockRes.error) {
                        logger.error("fetch block by number error", blockRes.error);
                        // request failed
                        continue;
                    }
                    if (blockRes.result) {
                        logger.error('Updating cache');
                        blockNumHashCache[blockNum] = blockRes.result.hash;
                    }
                }
                if (blockNumHashCache[blockNum] && blockNumHashCache[blockNum] !== ctx.body.result[i].blockHash) {
                    logger.error(`update log blockHash`, ctx.body.result[i]);
                    ctx.body.result[i].blockHash = blockNumHashCache[blockNum];
                }
            }
        }
    }
}