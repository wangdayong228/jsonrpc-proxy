const { expect } = require('chai');
const { RpcCacheDB } = require('../lib/cache');

describe('RpcCacheDB', () => {
    let cacheDb;

    before(async () => {
        // 初始化测试前的数据库
        cacheDb = new RpcCacheDB("./test.db");
        await cacheDb.initTable();
    });

    describe('initTable', () => {
        it('应该成功创建 hash_mapping 和 state 表', async () => {
            // 检查表是否存在
            const tables = await new Promise((resolve, reject) => {
                cacheDb.inner.all(
                    "SELECT name FROM sqlite_master WHERE type='table' AND (name='hash_mapping' OR name='state')",
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows.map(row => row.name));
                    }
                );
            });

            expect(tables).to.include('hash_mapping', '未成功创建 hash_mapping 表');
            expect(tables).to.include('state', '未成功创建 state 表');

            // 检查 state 表结构
            const stateColumns = await new Promise((resolve, reject) => {
                cacheDb.inner.all("PRAGMA table_info(state)", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.name));
                });
            });

            expect(stateColumns).to.include('key');
            expect(stateColumns).to.include('value');
        });
    });

    describe('blockHash映射', () => {
        it('应该正确保存和获取哈希映射', async () => {
            const cfxHash = '0xcfx123456';
            const ethHash = '0xeth123456';
            
            // 保存映射
            await cacheDb.saveBlockHashMap(cfxHash, ethHash);
            
            // 通过ethHash获取cfxHash
            const retrievedCfxHash = await cacheDb.getCfxHashByEthHash(ethHash);
            expect(retrievedCfxHash).to.equal(cfxHash);
            
            // 通过cfxHash获取ethHash
            const retrievedEthHash = await cacheDb.getEthHashByCfxHash(cfxHash);
            expect(retrievedEthHash).to.equal(ethHash);
        });
    });

    describe('state操作', () => {
        it('应该正确设置和获取区块号', async () => {
            const baseBlockNumber = 1000;
            const lastBlockNumber = 2000;
            
            // 设置基础区块号
            await cacheDb.setCorrectBlockHashBaseBlockNumber(baseBlockNumber);
            
            // 设置最后区块号
            await cacheDb.setCorrectBlockHashLastBlockNumber(lastBlockNumber);
            
            // 获取状态
            const state = await cacheDb.getState();
            // console.log('state', state);
            expect(state).to.not.be.null;
            expect(state[RpcCacheDB.STATE_KEY_CORRECT_BLOCK_HASH_BASE_BLOCK_NUMBER]).to.equal(baseBlockNumber);
            expect(state[RpcCacheDB.STATE_KEY_CORRECT_BLOCK_HASH_LAST_BLOCK_NUMBER]).to.equal(lastBlockNumber);
        });
    });

    after(async () => {
        // 清理测试数据
        await new Promise((resolve, reject) => {
            cacheDb.inner.exec(`
                DELETE FROM state;
                DELETE FROM hash_mapping;
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // 关闭数据库连接
        await cacheDb.close();
    });
});
