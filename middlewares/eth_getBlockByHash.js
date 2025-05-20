const { getDB } = require('../lib/cache');
const { resultNull } = require('../lib/response');
const { correctBlockHash } = require('../lib/block_hash');

module.exports = async function (ctx, next) {
    console.log('eth_getBlockByHash middleware');

    const { method, params } = ctx.request.body;
    if (method != 'eth_getBlockByHash') {
        return await next();
    }

    console.log('trigger eth_getBlockByHash');
    const inputHash = ctx.request.body.params[0];
    const cfxHash = await getDB().getCfxHashByEthHash(inputHash)
    if (!cfxHash) {
        return resultNull(ctx);
    }
    ctx.request.body.params[0] = cfxHash;

    await next();
    const block = ctx.response.body.result;
    await correctBlockHash(block);

    console.log('eth_getBlockByHash middleware end');
}
