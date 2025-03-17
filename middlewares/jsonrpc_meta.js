

module.exports = function (logger) {
    return async function(ctx, next) {
        console.log('jsonrpc_meta middleware');
        try {
            const {id, method, params} = ctx.request.body;
            ctx.request.rpcId = id;
            ctx.request.rpcMethod = method;

            await next();

            if(!ctx.body){
                logger.error(`No body found of Request: Req-${id} ${method}, ${JSON.stringify(params || [], null, '\t')}`);
                throw new Error('No response body found');
            }

            if (ctx.body.error) {
                logger.error(`Req-${id} Error: ${JSON.stringify({
                    method,
                    params,
                    error: ctx.body.error
                })}`);
            } else {
                logger.info(`Req & Res: ${JSON.stringify({
                    id,
                    method,
                    params: params || [],
                    result: ctx.body.result,
                }, null, '\t')}`);
            }
        } catch (error) {
            logger.error(`Print json meta Error: ${error.message || error} ${error.stack}`);
            ctx.body = {
                jsonrpc: '2.0',
                id: ctx.request.body.id,
                error: {
                    code: -32000,
                    message: error.message || error
                }
            }
        }
        console.log('jsonrpc_meta middleware end');
    }
}