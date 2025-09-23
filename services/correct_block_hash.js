const { ethers } = require('ethers');
const { TARGET_URL, CORRECT_BLOCK_HASH_START_BLOCK_NUMBER, CORRECT_BLOCK_HASH_START_BLOCK_COUNT_BEFORE_LATEST } = require('../config');
const { getDB } = require('../lib/cache');
const { correctBlockHash } = require('../lib/block_hash');
const { logger } = require('../logger');

const provider = new ethers.JsonRpcProvider(TARGET_URL);

function getCorrectHashBaseBlockNumber(latestBlockNumber, inUseBaseBlockNumber) {
    let correctHashStartBlockNumber = CORRECT_BLOCK_HASH_START_BLOCK_NUMBER || latestBlockNumber;
    let correctHashStartBlockCountBeforeLatest = CORRECT_BLOCK_HASH_START_BLOCK_COUNT_BEFORE_LATEST || 0;
    inUseBaseBlockNumber = inUseBaseBlockNumber || Number.MAX_SAFE_INTEGER;

    const startBlockByOffset = latestBlockNumber - correctHashStartBlockCountBeforeLatest;
    let baseBlockNumber = Math.min(correctHashStartBlockNumber, startBlockByOffset, inUseBaseBlockNumber);
    if (baseBlockNumber < 0) {
        baseBlockNumber = 0;
    }
    return baseBlockNumber;
}

async function correctBlockHashTillLatest() {
    logger.info("start correctBlockHashTillLatest");
    const latestBlock = await provider.send("eth_getBlockByNumber", ["latest", false]);
    const latestBlockNumber = Number(latestBlock.number);
    const inUseBaseBlockNumber = await getDB().getCorrectBlockHashBaseBlockNumber();

    const baseBlockNumber = getCorrectHashBaseBlockNumber(latestBlockNumber, inUseBaseBlockNumber); 
    logger.info(`computed correct eth hash with latestBlockNumber ${latestBlockNumber}, baseBlockNumber ${baseBlockNumber} `);

    await getDB().setCorrectBlockHashBaseBlockNumber(Number(baseBlockNumber));

    logger.info(`start correct block hash to ${"0x" + latestBlockNumber.toString(16)}`);
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


