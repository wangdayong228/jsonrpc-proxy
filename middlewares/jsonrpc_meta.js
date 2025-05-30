

module.exports = function (logger) {
    return async function (ctx, next) {
        console.log('jsonrpc_meta middleware');
        const startAt = Date.now();
        try {

            if (ctx.request.body && ctx.request.body.id === undefined) {
                logger.error(`No id found of Request: ${JSON.stringify(ctx.request.body, null, '\t')}`);
            }

            const { id, method, params } = ctx.request.body;
            ctx.request.rpcId = id;
            ctx.request.rpcMethod = method;

            await next();

            if (ctx.body === undefined) {
                logger.error(`No body found of Request: Req-${id} ${method}, ${JSON.stringify(params || [], null, '\t')}`);
                throw new Error('No response body found');
            }

            if (ctx.body === null) {
                return
            }

            if (ctx.body.error) {
                logger.error(`Req-${id} Error: ${JSON.stringify({
                    method,
                    params: params || [],
                    error: ctx.body.error,
                    duration: Date.now() - startAt
                })}`);
            } else {
                logger.info(`Req & Res: ${JSON.stringify({
                    id,
                    method,
                    params: params || [],
                    result: ctx.body.result,
                    duration: Date.now() - startAt
                }, null, '\t')}`);
            }
        } catch (error) {
            logger.error(`Print json meta Error:\nrequest body: ${JSON.stringify(ctx.request.body)}\nresponse body: ${JSON.stringify(ctx.body)}\nerror: ${error.message || error} ${error.stack}`);
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