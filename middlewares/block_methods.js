
module.exports = async function (ctx, next) {

    const method = ctx.request.rpcMethod;
    
    await next();

    if (method === 'eth_getBlockByHash' || method === 'eth_getBlockByNumber') {
        if (ctx.body.result && ctx.body.result.transactions.length === 0) {
            ctx.body.result.transactionsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
        }
    }
}