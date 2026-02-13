module.exports = async function (ctx, next) {
    const start = Date.now();
    console.log('eth_gasPrice middleware start');
    const { method } = ctx.request.body;

    await next();

    if (method === 'eth_gasPrice') {
        console.log('trigger eth_gasPrice, result:', ctx.body.result);
        if (!ctx.body.result || !ctx.body.result.startsWith('0x')) {
            return;
        }

        const gasPrice = BigInt(ctx.body.result) * 2n;
        ctx.body.result = '0x' + gasPrice.toString(16);
    }

    console.log(`eth_gasPrice middleware end, duration: ${Date.now() - start}ms`);
}
