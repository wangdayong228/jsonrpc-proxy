const { getDB } = require('../lib/cache');
const { resultNull } = require('../lib/response');
const { correctBlockHash } = require('../lib/block_hash');

module.exports = async function (ctx, next) {
    const start = Date.now();
    console.log('eth_getBlockByHash middleware start');

    const { method, params } = ctx.request.body;
    if (method != 'eth_getBlockByHash') {
        return await next();
    }

    console.log('trigger eth_getBlockByHash');
    const inputHash = ctx.request.body.params[0];
    const cfxHash = await getDB().getCfxHashByEthHash(inputHash)
    // if (!cfxHash) {
    //     // return resultNull(ctx);
    //     // Note: 同时支持以 eth 和 cfx 查询 block，因为 op-challenge 的 disputeGame 合约中存储的是 cfxHash
    //     cfxHash = inputHash;
    // }else{
    //     ctx.request.body.params[0] = cfxHash;
    // }
    
    // Note: 同时支持以 eth 和 cfx 查询 block，因为 op-challenge 的 disputeGame 合约中存储的是 cfxHash
    if(cfxHash){
        ctx.request.body.params[0] = cfxHash;
    }

    await next();
    const block = ctx.response.body.result;
    await correctBlockHash(block);

    console.log(`eth_getBlockByHash middleware end, duration: ${Date.now() - start}ms`);
}
