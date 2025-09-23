const { ethers } = require("ethers");
// const { encodeHeaderRLP } = require('./rlp')
// const { getRawBlockHash, getComputedBlockHash, correctBlockHash } = require('./block_cache')
const { getDB } = require("./cache");
const { correctBlockHash } = require("./block_hash");
// 创建 provider
// 可以使用你自己的 JSON-RPC URL
const provider = new ethers.JsonRpcProvider(process.env.JSONRPC_URL);
const CORRECT_BLOCK_HASH = process.env.CORRECT_BLOCK_HASH || false;

// 通过区块哈希获取区块
async function getBlockByHash(blockHash, includeTransactions = false) {
    if (CORRECT_BLOCK_HASH) {
        let rawHash = await getDB().getCfxHashByEthHash(blockHash);
        console.log(`get rawHash of computed hash(${blockHash}): ${rawHash}`);
        if (!rawHash) {
            // 同时支持 eth 和 cfx 查询 block hash，因为 op-challenge 的 disputeGame 合约中存储的是 cfxHash
            rawHash = blockHash;
        }

        const rpcCallStart = Date.now();
        let block = await provider.send("eth_getBlockByHash", [rawHash, includeTransactions]);
        console.log(`rpc call conflux-rust eth_getBlockByHash duration: ${Date.now() - rpcCallStart}ms`);
        // console.log("obtained block:", block);
        // const block2 = await provider.getBlock(rawHash, includeTransactions);
        if (!block) {
            console.warn(`no block with hash ${blockHash}`);
        } else {
            // console.log(`computed block.hash: ${blockHash}, raw block.hash: ${rawHash}`);
            // block.rawHash = rawHash;
            // block.hash = blockHash;
            // console.log("reset block.hash to re-computed hash:", block.hash);
            block = await correctBlockHash(block);
        }
        return block;
    }

    const block = await provider.getBlock(blockHash, includeTransactions);
    if (!block) {
        console.warn(`no block with hash ${blockHash}`);
    }
    return block;
}

// 如果blockHash是 eth hash，则返回对应的 cfx hash；如果不是直接返回。
async function getRawBlockHash(blockHash) {
    if (CORRECT_BLOCK_HASH) {
        let rawHash = await getDB().getCfxHashByEthHash(blockHash);
        console.log(`get rawHash of computed hash(${blockHash}): ${rawHash}`);
        if (!rawHash) {
            // 同时支持 eth 和 cfx 查询 block hash，因为 op-challenge 的 disputeGame 合约中存储的是 cfxHash
            rawHash = blockHash;
        }
        return rawHash;
    }
    return blockHash;
}

// async function getBlockByNumber(blockNumber, includeTransactions = false) {
//     const block = await provider.getBlock(blockNumber, includeTransactions);

//     if (CORRECT_BLOCK_HASH) {
//         return correctBlockHash(block);
//     }
//     return block;
// }

// 通过区块哈希获取区块
async function feeHistory(blockCount, newestBlock, rewardPercentiles = []) {
    try {
        // 调用 eth_feeHistory RPC 方法获取费用历史
        const feeHistoryData = await provider.send("eth_feeHistory", [ethers.toQuantity(blockCount), newestBlock || "latest", rewardPercentiles]);

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
        const maxPriorityFee = await provider.send("eth_maxPriorityFeePerGas", []);

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
    getRawBlockHash,
    // getBlockByNumber,
    feeHistory,
    maxPriorityFeePerGas,
};
