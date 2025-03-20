const { maxPriorityFeePerGas } = require('../lib/rpc');

module.exports = async function (ctx, next) {
    console.log('eth_feeHistory middleware');
    const { method } = ctx.request.body;
    await next();
    if (method === 'eth_feeHistory') {
        const maxPriorityFee = await maxPriorityFeePerGas();
        console.log('maxPriorityFee', maxPriorityFee);

        const {baseFeePerGas} = ctx.body.result;
        for (let i = 0; i < baseFeePerGas.length; i++) {
            if(baseFeePerGas[i] < maxPriorityFee) {
                baseFeePerGas[i] = maxPriorityFee;
            }

            if(baseFeePerGas[i] < 1e9) {
                baseFeePerGas[i] = 1e9;
            }
        }
        ctx.body.result.baseFeePerGas = baseFeePerGas;


        // console.log('trigger eth_feeHistory, result:', ctx.body.result);
        // if (!ctx.body.result.startsWith('0x')) {
        //     return;
        // }

        // let gasLimit = BigInt(ctx.body.result) * 12n / 10n;
        // if (gasLimit > BigInt(3000 * 10000)) {
        //     gasLimit = BigInt(3000 * 10000);
        // }
        // ctx.body.result = "0x" + gasLimit.toString(16);
    }
    console.log('eth_feeHistory middleware end');
}
