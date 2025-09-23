const { getDB } = require("./cache");
const { TARGET_URL } = require("../config");
const { ethers } = require("ethers");
const { logger } = require("../logger");
const { BlockHashCorrector } = require("./BlockHashCorrector")

const provider = new ethers.JsonRpcProvider(TARGET_URL);
const blockHashCorrector = new BlockHashCorrector(provider, getDB(), logger);

// // @param {Object} block - block object
// // @return {Object} block 修正后的区块对象
// async function correctBlockHash(block) {
//     if (!block) {
//         return block;
//     }
//     console.log(`correctBlockHash block.number ${block.number}`);

//     const { baseBlockNumber, lastBlockNumber } = await getBaseAndCorrectedLastBlockNumber();

//     if (block.number < baseBlockNumber) {
//         // NOTE: 暂时允许访问 geneisis 区块
//         if (block.number == 0) {
//             return block;
//         }
//         throw new Error(`forbidden to correct, because block.number ${block.number} < baseBlockNumber ${baseBlockNumber}`);
//     }

//     if (block.number < lastBlockNumber) {
//         console.log(`corrected block directly becasue block.number ${block.number} < lastBlockNumber ${lastBlockNumber}`);
//         return await correctBlockHashAgainstParent(block);
//     }

//     // 批量处理从 lastBlockNumber 到 block.number 的所有区块
//     await correctBlockRange(lastBlockNumber, block.number, baseBlockNumber);

//     return correctBlockHashAgainstParent(block);
// }

// async function getBaseAndCorrectedLastBlockNumber(){
//     const baseBlockNumber = await getDB().getCorrectBlockHashBaseBlockNumber();
//     let lastBlockNumber = await getDB().getCorrectBlockHashLastBlockNumber();
//     lastBlockNumber = lastBlockNumber || baseBlockNumber;
//     lastBlockNumber = Math.max(lastBlockNumber, baseBlockNumber);
//     return { baseBlockNumber, lastBlockNumber };
// }

// async function correctBlockRange(startBlockNumber, endBlockNumber, baseBlockNumber) {
//     let preBlock = null;
//     for (let bn = startBlockNumber; bn <= endBlockNumber; bn++) {
//         const _block = await provider.send("eth_getBlockByNumber", ["0x" + bn.toString(16), false]);

//         const enableGetParentHashOnChain = BigInt(_block.number) == BigInt(baseBlockNumber);
//         await correctBlockHashAgainstParent(_block, enableGetParentHashOnChain);
//         await getDB().setCorrectBlockHashLastBlockNumber(bn);
//         preBlock = _block;
//         logger.info(`corrected block ${_block.number} success`);
//     }
// }

// // 只有 enableGetParentHashOnChain 为 true 时，才会从链上获取父区块来计算 hash，否则会从数据库获取。
// // 如果数据库中没有，表明 reorg 了
// async function correctBlockHashAgainstParent(block, enableGetParentHashOnChain = false) {
//     if (!block) {
//         return block;
//     }

//     const startAt = Date.now();

//     // set parent hash
//     block.rawParentHash = block.parentHash;
//     let ethParentHash = await getDB().getEthHashByCfxHash(block.parentHash);
//     if (!ethParentHash) {
//         if (!enableGetParentHashOnChain) {
//             // throw new Error(`block.number ${block.number} > baseBlockNumber ${baseBlockNumber}, but not found ethParentHash for cfxParentHash ${block.parentHash}, that means reorg. Unspport handle reorg now.`);
//             throw new Error("disable get parent hash on chain, please check if reorg");
//         }
//         const parentBlock = await provider.send("eth_getBlockByHash", [block.parentHash, false]);
//         const correctParentBlock = await correctBlockHash(parentBlock);
//         ethParentHash = correctParentBlock.hash;
//         await getDB().saveBlockHashMap(block.rawParentHash, ethParentHash, correctParentBlock.number);
//     }
//     block.parentHash = ethParentHash;

//     // set block hash
//     block.rawHash = block.hash;
//     let ethHash = await getDB().getEthHashByCfxHash(block.rawHash);
//     if (!ethHash) {
//         ethHash = calculateBlockHash(block);
//         await getDB().saveBlockHashMap(block.rawHash, ethHash, block.number);
//     }
//     block.hash = ethHash;
//     console.log(`correctBlockHashDirectly ${block.number} duration ${Date.now() - startAt}ms`);
//     return block;
// }

module.exports = {
    correctBlockHash: blockHashCorrector.correctBlockHash.bind(blockHashCorrector),
};
