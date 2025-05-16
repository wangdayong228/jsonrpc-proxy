const { ethers } = require('ethers');
const { TARGET_URL, CORRECT_BLOCK_HASH_START_BLOCK_NUMBER, CORRECT_BLOCK_HASH_START_BLOCK_COUNT_BEFORE_LATEST } = require('../config');
const { getDB } = require('../lib/cache');
const { correctBlockHash } = require('../lib/block_hash');
const provider = new ethers.JsonRpcProvider(TARGET_URL);


function getCorrectHashBaseBlockNumber(latestBlockNumber, inUseBaseBlockNumber) {
    console.log(`start getCorrectHashBaseBlockNumber, latestBlockNumber: ${latestBlockNumber}, inUseBaseBlockNumber: ${inUseBaseBlockNumber}`);
    let correctHashStartBlockNumber = CORRECT_BLOCK_HASH_START_BLOCK_NUMBER || latestBlockNumber;
    let correctHashStartBlockCountBeforeLatest = CORRECT_BLOCK_HASH_START_BLOCK_COUNT_BEFORE_LATEST || 0;
    inUseBaseBlockNumber = inUseBaseBlockNumber || Number.MAX_SAFE_INTEGER;

    const startBlockByOffset = latestBlockNumber - correctHashStartBlockCountBeforeLatest;
    return Math.min(correctHashStartBlockNumber, startBlockByOffset, inUseBaseBlockNumber);
}

async function correctBlockHashTillLatest() {
    const latestBlock = await provider.getBlock("latest");
    const latestBlockNumber = latestBlock.number;
    const inUseBaseBlockNumber = await getDB().getCorrectBlockHashBaseBlockNumber();

    const baseBlockNumber = getCorrectHashBaseBlockNumber(latestBlockNumber, inUseBaseBlockNumber);
    console.log('computed correct block hash baseBlockNumber', baseBlockNumber);

    await getDB().setCorrectBlockHashBaseBlockNumber(baseBlockNumber);

    console.log(`start correct block hash from ${"0x" + baseBlockNumber.toString(16)} to ${"0x" + latestBlockNumber.toString(16)}`);
    await correctBlockHash(latestBlock);
}

async function loopCorrectBlockHashs(){
    await correctBlockHashTillLatest();
    setInterval(async () => {
        await correctBlockHashTillLatest();
    }, 5000);
}


module.exports = {
    loopCorrectBlockHashs
}


