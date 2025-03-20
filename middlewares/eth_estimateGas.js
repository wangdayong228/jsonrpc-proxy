module.exports = async function (ctx, next) {
    console.log('eth_estimateGas middleware');
    const { method } = ctx.request.body;
    await next();
    if (method === 'eth_estimateGas') {
        console.log('trigger eth_estimateGas, result:', ctx.body.result);
        if (!ctx.body.result.startsWith('0x')) {
            return;
        }

        let gasLimit = BigInt(ctx.body.result) * 12n / 10n;
        if (gasLimit > BigInt(3000 * 10000)) {
            gasLimit = BigInt(3000 * 10000);
        }
        ctx.body.result = "0x" + gasLimit.toString(16);
    }
    console.log('eth_estimateGas middleware end');
}
