const getBlockByHash = require('../lib/rpc');
const { headerForHashNotFound: headerForHashNotFound } = require('../lib/response');
module.exports = async function (ctx, next) {
    console.log('eth_getStorageAt middleware');

    const {method, params} = ctx.request.body;
    if (method === 'eth_getStorageAt') {
        console.log('trigger eth_getStorageAt');
        // position should be big integer
        if (params[1] && params[1].length > 0) {
            params[1] = "0x" + BigInt(params[1]).toString(16);
        }

        if (params[2] && params[2].length == 66) {
            try {
                const block = await getBlockByHash(ctx.request.body.params[2]);
                if (!block) {
                    headerForHashNotFound(ctx);
                    return;
                }
                ctx.request.body.params[2] = "0x" + block.number.toString(16);
            } catch (error) {
                console.error('获取block失败:', error);
                throw error
            }
        }
    }
    await next();
    console.log('eth_getStorageAt middleware end');
}
