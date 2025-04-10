const { getBlockByHash } = require('../lib/rpc');
const { headerForHashNotFound } = require('../lib/response');


module.exports = async function (ctx, next) {
    console.log('eth_transactionCount middleware');

    const {method, params} = ctx.request.body;
    if (method === 'eth_getTransactionCount') {
        console.log('trigger eth_getTransactionCount');
        if (params[1] && params[1].length == 66) {
            try {
                const block = await getBlockByHash(ctx.request.body.params[1]);
                if (!block) {
                    headerForHashNotFound(ctx);
                    return;
                }
                ctx.request.body.params[1] = "0x" + BigInt(block.number).toString(16);
            } catch (error) {
                console.error('获取区块失败:', error);
                throw error
            }
        }
    }

    await next();
    console.log('eth_transactionCount middleware end');
}

