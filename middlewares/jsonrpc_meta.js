

module.exports = function (logger) {
    return async function(ctx, next) {
        try {
            const {id, method, params} = ctx.request.body;
            ctx.request.rpcId = id;
            ctx.request.rpcMethod = method;

            logger.info(`Request: req-${id} ${method}, ${params}`);

            await next();

            logger.info(`Response: ${JSON.stringify(ctx.body, null, '\t')}`);

            if (ctx.body.error) {
                logger.error(`${method} Error: ${ctx.body.error}`);
            }
        } catch (error) {
            logger.error(`Error: ${error.message || error}`);
            throw error;
        }
    }
}