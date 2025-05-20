const sqlite3 = require('sqlite3').verbose();
const { calculateBlockHash } = require('./rlp');
const { ethers } = require('ethers');
const { DB_PATH, TARGET_URL } = require('../config');
const { commonLogger } = require('../logger');
sqlite3.verbose();

class RpcCacheDB {

    static STATE_KEY_CORRECT_BLOCK_HASH_BASE_BLOCK_NUMBER = 'correct_block_hash_base_block_number';
    static STATE_KEY_CORRECT_BLOCK_HASH_LAST_BLOCK_NUMBER = 'correct_block_hash_last_block_number';

    constructor(dbPath) {
        this.inner = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error(`连接数据库 ${dbPath} 错误: ${err.message}`);
            } else {
                console.log('已连接到 SQLite 数据库');
            }
        });
        // this.inner.on('trace', (sql) => {
        //     console.log('trace', sql);
        // });
    }

    async initTable() {
        return new Promise((resolve, reject) => {
            const sql = `
                CREATE TABLE IF NOT EXISTS state (
                    key TEXT PRIMARY KEY,
                    value INTEGER
                );
                CREATE TABLE IF NOT EXISTS hash_mapping (
                    eth_hash TEXT PRIMARY KEY,
                    cfx_hash TEXT UNIQUE,
                    block_number INTEGER
                );
            `;

            this.inner.exec(sql, (err) => {
                if (err) {
                    console.error('创建表错误:', err.message);
                    reject(err);
                } else {
                    console.log('表创建成功或已存在');
                    resolve();
                }
            });
        });
    }

    async saveBlockHashMap(cfxHash, ethHash, blockNumber) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT OR REPLACE INTO hash_mapping (eth_hash, cfx_hash, block_number) VALUES (?, ?, ?)`;
            this.inner.run(sql, [ethHash, cfxHash, blockNumber], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async getCfxHashByEthHash(ethHash) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT cfx_hash FROM hash_mapping WHERE eth_hash = ?`;
            this.inner.get(sql, [ethHash], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.cfx_hash : null);
                }
            });
        });
    }

    async getEthHashByCfxHash(cfxHash) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT eth_hash FROM hash_mapping WHERE cfx_hash = ?`;
            this.inner.get(sql, [cfxHash], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    // console.log('getEthHashByCfxHash', cfxHash, row);
                    resolve(row ? row.eth_hash : null);
                }
            });
        });
    }

    async getState() {
        return new Promise((resolve, reject) => {
            this.inner.all('SELECT * FROM state', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const result = rows.reduce((acc, row) => {
                        acc[row.key] = row.value;
                        return acc;
                    }, {});
                    resolve(result);
                }
            });
        });
    }

    async getCorrectBlockHashBaseBlockNumber() {
        const state = await this.getState();
        return state[RpcCacheDB.STATE_KEY_CORRECT_BLOCK_HASH_BASE_BLOCK_NUMBER];
    }

    async getCorrectBlockHashLastBlockNumber() {
        const state = await this.getState();
        return state[RpcCacheDB.STATE_KEY_CORRECT_BLOCK_HASH_LAST_BLOCK_NUMBER];
    }

    async setCorrectBlockHashBaseBlockNumber(baseBlockNumber) {
        if (!baseBlockNumber) {
            throw new Error('baseBlockNumber is required');
        }

        const inUseBaseBlockNumber = await this.getCorrectBlockHashBaseBlockNumber();
        if (inUseBaseBlockNumber && inUseBaseBlockNumber <= baseBlockNumber) {
            commonLogger.info(`skip setCorrectBlockHashBaseBlockNumber ${baseBlockNumber} because inUseBaseBlockNumber ${inUseBaseBlockNumber} <= ${baseBlockNumber}`);
            return;
        }

        console.log(`setCorrectBlockHashBaseBlockNumber baseBlockNumber to ${baseBlockNumber}, and truncate hash_mapping`);
        return new Promise((resolve, reject) => {
            this.inner.run(`INSERT OR REPLACE INTO state (key, value) VALUES (?, ?); 
                            TRUNCATE TABLE hash_mapping;`,
                [RpcCacheDB.STATE_KEY_CORRECT_BLOCK_HASH_BASE_BLOCK_NUMBER, baseBlockNumber], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    async setCorrectBlockHashLastBlockNumber(lastBlockNumber) {
        return new Promise((resolve, reject) => {
            this.inner.run('INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)', [RpcCacheDB.STATE_KEY_CORRECT_BLOCK_HASH_LAST_BLOCK_NUMBER, lastBlockNumber], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            this.inner.close((err) => {
                if (err) {
                    console.error('关闭数据库错误:', err.message);
                    reject(err);
                } else {
                    console.log('数据库连接已关闭');
                    resolve();
                }
            });
        });
    }
}

// sigleton
let _db = new RpcCacheDB(DB_PATH);
function getDB() {
    return _db;
}

module.exports = {
    RpcCacheDB,
    getDB,
}