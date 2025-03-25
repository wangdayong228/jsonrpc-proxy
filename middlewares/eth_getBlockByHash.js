const { getRawBlockHash, getComputedBlockHash } = require('../lib/block_cache');
const { resultNull } = require('../lib/response');
module.exports = async function (ctx, next) {
    console.log('eth_getBlockByHash middleware');

    const { method, params } = ctx.request.body;
    if (method != 'eth_getBlockByHash') {
        return await next();
    }

    console.log('trigger eth_getBlockByHash');
    const inputHash = ctx.request.body.params[0];
    if (!getRawBlockHash(inputHash)) {
        return resultNull(ctx);
    }

    const rawHash = getRawBlockHash(inputHash);
    ctx.request.body.params[0] = rawHash;

    await next();
    const block = ctx.response.body.result;
    if (block) {
        block.rawHash = rawHash;
        block.hash = inputHash;
    }

    console.log('eth_getBlockByHash middleware end');
}
