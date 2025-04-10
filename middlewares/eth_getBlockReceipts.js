const { getBlockByHash } = require('../lib/rpc');
const { headerForHashNotFound } = require('../lib/response');

module.exports = async function (ctx, next) {
    console.log('eth_getBlockReceipts middleware');

    const { method, params } = ctx.request.body;
    if (method != 'eth_getBlockReceipts') {
        return await next();
    }

    if (!params[0] || params[0].length != 66) {
        return await next();
    }

    console.log('trigger eth_getBlockReceipts');
    const block = await getBlockByHash(ctx.request.body.params[0]);
    if (!block) {
        headerForHashNotFound(ctx);
        return;
    }
    console.log("obtained block.hash", block.hash);
    ctx.request.body.params[0] = "0x" + BigInt(block.number).toString(16);

    await next();

    if (ctx.response.body.result && ctx.response.body.result.length > 0) {
        ctx.response.body.result.forEach(item => {
            item.rawBlockHash = item.blockHash;
            item.blockHash = block.hash;
            item.logs.forEach(log => {
                log.rawBlockHash = log.blockHash;
                log.blockHash = block.hash;
            });
            console.log(item);
        });
    }
    console.log('eth_getBlockReceipts middleware end');
}
