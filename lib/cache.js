const sqlite3 = require('sqlite3').verbose();
const { calculateBlockHash } = require('./rlp');

class RpcCacheDB {
    constructor(dbPath) {
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error(`连接数据库 ${dbPath} 错误: ${err.message}`);
            } else {
                console.log('已连接到 SQLite 数据库');
            }
        });
    }

    async initTable() {
        return new Promise((resolve, reject) => {
            const sql = `
                CREATE TABLE IF NOT EXISTS hash_mapping (
                    eth_hash TEXT PRIMARY KEY,
                    cfx_hash TEXT UNIQUE
                )
            `;

            this.db.run(sql, (err) => {
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

    async saveBlockHashMap(cfxHash, ethHash) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT OR REPLACE INTO hash_mapping (eth_hash, cfx_hash) VALUES (?, ?)`;
            this.db.run(sql, [ethHash, cfxHash], function (err) {
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
            this.db.get(sql, [ethHash], (err, row) => {
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
            this.db.get(sql, [cfxHash], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.cfx_hash : null);
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
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
let db = new RpcCacheDB(__dirname + '/../data/rpc_cache.db');

async function correctBlockHash(block) {
    if (block) {
        block.rawHash = block.hash;
        block.hash = calculateBlockHash(block);
        await db.saveBlockHashMap(block.rawHash, block.hash);
    }
    return block;
}

module.exports = {   
    correctBlockHash,
    db
}