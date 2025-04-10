const { getBlockByHash } = require('../lib/rpc');
const { headerForHashNotFound } = require('../lib/response');

module.exports = async function (ctx, next) {
    console.log('eth_getCode middleware');

    const {method, params} = ctx.request.body;
    if (method === 'eth_getCode') {
        console.log('trigger eth_getCode');
        if (params[1] && params[1].length == 66) {
            try {
                const block = await getBlockByHash(ctx.request.body.params[1]);
                if (!block) {
                    headerForHashNotFound(ctx);
                    return;
                }
                ctx.request.body.params[1] = "0x" + BigInt(block.number).toString(16);
            } catch (error) {
                console.error('获取block失败:', error);
                throw error
            }
        }
    }
    await next();
    console.log('eth_getCode middleware end');
}
