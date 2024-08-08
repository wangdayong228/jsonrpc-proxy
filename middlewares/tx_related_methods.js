
// handle yParity and v is not same
module.exports = async function (ctx, next) {

    const method = ctx.request.rpcMethod;
    
    await next();

    if (method === 'eth_getTransactionByHash' || method === 'eth_getTransactionByBlockHashAndIndex' || method === 'eth_getTransactionByBlockNumberAndIndex') {
        if (ctx.body.result && ctx.body.result.yParity) {
            ctx.body.result = adaptTx(ctx.body.result);
        }
    }

    if (method === 'eth_getBlockByHash' || method === 'eth_getBlockByNumber') {
        if (ctx.body.result && ctx.body.result.transactions.length > 0 && typeof ctx.body.result.transactions[0] === 'object') {
            let transactions = ctx.body.result.transactions.filter(tx => tx.r !== '0x0' && tx.s !== '0x0');
            for(let i = 0; i < transactions.length; i++) {
                transactions[i] = adaptTx(transactions[i]);
            }
            ctx.body.result.transactions = transactions;
        }
    }
}

function adaptTx(tx) {
    if (tx.yParity) {
        tx.v = tx.yParity;
    }

    if (tx.r === '0x0') {
        tx.r = '0xffffffff';
    }

    if (tx.s === '0x0') {
        tx.s = '0xffffffff';
    }

    return tx;
}