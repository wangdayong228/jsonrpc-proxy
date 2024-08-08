
// handle yParity and v is not same
module.exports = async function (ctx, next) {

    const method = ctx.request.rpcMethod;
    
    await next();

    if (method === 'eth_getTransactionByHash' || method === 'eth_getTransactionByBlockHashAndIndex' || method === 'eth_getTransactionByBlockNumberAndIndex') {
        if (ctx.body.result && ctx.body.result.yParity) {
            ctx.body.result.v = ctx.body.result.yParity;
        }
    }

    if (method === 'eth_getBlockByHash' || method === 'eth_getBlockByNumber') {
        if (ctx.body.result && ctx.body.result.transactions.length > 0 && typeof ctx.body.result.transactions[0] === 'object') {
            for(let i = 0; i < ctx.body.result.transactions.length; i++) {
                if (ctx.body.result.transactions[i].yParity) {
                    ctx.body.result.transactions[i].v = ctx.body.result.transactions[i].yParity;
                }
            }
        }
    }
}