

module.exports = function (logger) {
    return async function(ctx, next) {
        try {
            const {id, method, params} = ctx.request.body;
            ctx.request.rpcId = id;
            ctx.request.rpcMethod = method;

            // logger.info(`Request: Req-${id} ${method}, ${JSON.stringify(params || [], null, '\t')}`);

            await next();

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
            logger.error(`${error.message || error}`);
            throw error;
        }
    }
}