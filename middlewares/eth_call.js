
module.exports = async function(ctx, next) {

    if (ctx.request.rpcMethod === 'eth_call') {
        if (ctx.request.body.params[0] && ctx.request.body.params[0].input) {
            ctx.request.body.params[0].data = ctx.request.body.params[0].input;
        }
    }

    await next();
}