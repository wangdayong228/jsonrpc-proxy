const { correctBlockHash } = require('../lib/block_hash');

module.exports = async function (ctx, next) {
    console.log('eth_getBlockByNumber middleware');

    const { method, params } = ctx.request.body;
    if (method != 'eth_getBlockByNumber') {
        return await next();
    }

    console.log('trigger eth_getBlockByNumber');
    await next();
    if (ctx.response.body.result) {
        ctx.response.body.result = await correctBlockHash(ctx.response.body.result);
    }
    console.log('eth_getBlockByNumber middleware end');
}
