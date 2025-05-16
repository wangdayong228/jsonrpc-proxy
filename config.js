require('dotenv').config();
const PORTS = process.env.PORTS || 3000;
console.log('PORTS', PORTS);
const TARGET_URL = process.env.JSONRPC_URL;
const L2_RPC_URL = process.env.L2_RPC_URL;
const CORRECT_BLOCK_HASH = process.env.CORRECT_BLOCK_HASH || false;
const DB_PATH = __dirname + '/data/rpc_cache.db';
const HASH_MAP_START_BLOCK_NUMBER = process.env.HASH_MAP_START_BLOCK_NUMBER || 0;
const HASH_MAP_START_BLOCK_COUNT_BEFORE_LATEST = process.env.HASH_MAP_START_BLOCK_COUNT_BEFORE_LATEST || 0;

module.exports = {
    PORTS,
    TARGET_URL,
    L2_RPC_URL,
    CORRECT_BLOCK_HASH,
    DB_PATH,
    HASH_MAP_START_BLOCK_NUMBER,
    HASH_MAP_START_BLOCK_COUNT_BEFORE_LATEST,
}