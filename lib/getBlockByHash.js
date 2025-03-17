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
            throw new Error(`no block with hash ${blockHash}`);
        }
        return block;
    } catch (error) {
        throw error;
    }
}

module.exports = getBlockByHash;