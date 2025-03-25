const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const { calculateBlockHash } = require('./rlp');

const provider = new ethers.JsonRpcProvider(process.env.JSONRPC_URL);

var blockHashMapSavePath = ""
var computToRawblockHashMap = {}
var rawToComputblockHashMap = {}
async function init() {
    const savePath = await getBlockHashMapSavePath();
    if (!fs.existsSync(savePath)) {
        fs.writeFileSync(savePath, JSON.stringify({}, null, 2));
    }
    const data = fs.readFileSync(savePath, 'utf-8');
    computToRawblockHashMap = JSON.parse(data);
    rawToComputblockHashMap = Object.fromEntries(Object.entries(computToRawblockHashMap).map(([key, value]) => [value, key]));
}

async function saveBlockHashMap(computedBlockHash, rawBlockHash) {
    const savePath = await getBlockHashMapSavePath();
    computToRawblockHashMap[computedBlockHash] = rawBlockHash;
    rawToComputblockHashMap[rawBlockHash] = computedBlockHash;
    fs.writeFileSync(savePath, JSON.stringify(computToRawblockHashMap, null, 2));
}


async function getBlockHashMapSavePath() {
    if (blockHashMapSavePath === "") {
        const network = await provider.getNetwork();
        blockHashMapSavePath = path.join(__dirname, `../data/block_hash_map_${network.chainId}.json`);
    }
    return blockHashMapSavePath;
}

async function correctBlockHash(block) {
    if (block) {
        block.rawHash = block.hash;
        block.hash = calculateBlockHash(block);
        await saveBlockHashMap(block.hash, block.rawHash);
    }
    return block;
}

function getRawBlockHash(computedBlockHash) {
    return computToRawblockHashMap[computedBlockHash];
}

function getComputedBlockHash(rawBlockHash) {
    return rawToComputblockHashMap[rawBlockHash];
}

module.exports = {
    // saveBlockHashMap,
    // getBlockHashMapSavePath,
    // computToRawblockHashMap,
    // rawToComputblockHashMap,
    getRawBlockHash,
    getComputedBlockHash,
    correctBlockHash,
    init
}
