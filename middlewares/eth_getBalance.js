const getBlockByHash = require('../lib/getBlockByHash');

module.exports = async function (ctx, next) {
    console.log('eth_getBalance middleware');

    const {method, params} = ctx.request.body;
    if (method === 'eth_getBalance') {
        console.log('trigger eth_getBalance');
        if (params[1] && params[1].length == 66) {
            try {
                const block = await getBlockByHash(ctx.request.body.params[1]);
                ctx.request.body.params[1] = "0x" + block.number.toString(16);
            } catch (error) {
                console.error('获取余额失败:', error);
                throw error
            }
        }
    }
    await next();
    console.log('eth_getBalance middleware end');
}
