if (!process.env.ENV_FILE) {
    throw new Error(`ENV_FILE is not set`);
}
const env = require('dotenv').config({ path: process.env.ENV_FILE });
if (env.error) {
    throw new Error(`load env file ${process.env.ENV_FILE} error: ${env.error}`);
}
const PORT = process.env.PORT || 3000;
console.log('PORT', PORT);
const TARGET_URL = process.env.JSONRPC_URL;
const L2_RPC_URL = process.env.L2_RPC_URL;
const CORRECT_BLOCK_HASH = process.env.CORRECT_BLOCK_HASH || false;
const DB_PATH = __dirname + '/data/rpc_cache.db';
const HASH_MAP_START_BLOCK_NUMBER = process.env.HASH_MAP_START_BLOCK_NUMBER || 0;
const HASH_MAP_START_BLOCK_COUNT_BEFORE_LATEST = process.env.HASH_MAP_START_BLOCK_COUNT_BEFORE_LATEST || 0;

module.exports = {
    PORT,
    TARGET_URL,
    L2_RPC_URL,
    CORRECT_BLOCK_HASH,
    DB_PATH,
    HASH_MAP_START_BLOCK_NUMBER,
    HASH_MAP_START_BLOCK_COUNT_BEFORE_LATEST,
}

// 判断是否直接运行该脚本
if (require.main === module) {
    // 这里的代码只在直接运行 ts-node config.ts 时执行
    console.log('直接运行 config.ts');
    console.log('配置信息:', module.exports);
}