const { getBlockByHash } = require('../lib/rpc');
const { headerForHashNotFound } = require('../lib/response');

module.exports = async function (ctx, next) {

    console.log("eth_call middleware");
    if (ctx.request.rpcMethod === 'eth_call' || ctx.request.rpcMethod === 'eth_estimateGas') {
        console.log("trigger eth_call or eth_estimateGas");
        const params = ctx.request.body.params;
        if (params[0]) {
            if (!params[0].data) {
                ctx.request.body.params[0].data = params[0].input;
            }
        }

        if (params[1] && params[1].blockHash != undefined) {
            try {
                const block = await getBlockByHash(params[1].blockHash);
                if (!block) {
                    headerForHashNotFound(ctx);
                    return;
                }
                ctx.request.body.params[1].blockHash = block.rawHash;
            } catch (error) {
                console.error('获取block失败:', error);
                throw error
            }
        }
    }

    await next();
    console.log("eth_call middleware end");
}