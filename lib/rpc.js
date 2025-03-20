const { ethers } = require('ethers');

// 创建 provider
// 可以使用你自己的 JSON-RPC URL
const provider = new ethers.JsonRpcProvider(process.env.JSONRPC_URL);

// 通过区块哈希获取区块
async function getBlockByHash(blockHash, includeTransactions = false) {
    try {
        // 第二个参数为 true 时会返回完整的交易对象
        // 为 false 时只返回交易哈希
        const block = await provider.getBlock(blockHash, includeTransactions);
        if (!block) {
            console.warn(`no block with hash ${blockHash}`);
        }
        return block;
    } catch (error) {
        throw error;
    }
}

// 通过区块哈希获取区块
async function feeHistory(blockCount, newestBlock, rewardPercentiles = []) {
    try {
        // 调用 eth_feeHistory RPC 方法获取费用历史
        const feeHistoryData = await provider.send('eth_feeHistory', [
            ethers.toQuantity(blockCount),
            newestBlock || 'latest',
            rewardPercentiles
        ]);
        
        if (!feeHistoryData) {
            console.warn(`无法获取费用历史数据`);
            return null;
        }
        
        return feeHistoryData;
    } catch (error) {
        console.error(`获取费用历史时出错:`, error);
        throw error;
    }
}

// 获取最大优先费用
async function maxPriorityFeePerGas() {
    try {
        // 调用 eth_maxPriorityFeePerGas RPC 方法获取最大优先费用
        const maxPriorityFee = await provider.send('eth_maxPriorityFeePerGas', []);
        
        if (!maxPriorityFee) {
            console.warn(`无法获取最大优先费用数据`);
            return null;
        }
        
        return maxPriorityFee;
    } catch (error) {
        console.error(`获取最大优先费用时出错:`, error);
        throw error;
    }
}


module.exports = {
    getBlockByHash,
    feeHistory,
    maxPriorityFeePerGas
};