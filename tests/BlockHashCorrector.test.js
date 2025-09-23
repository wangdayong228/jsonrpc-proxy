const { expect } = require("chai");
const { BlockHashCorrector } = require("../lib/BlockHashCorrector");

// Mock 依赖
class MockProvider {
    constructor(blocks = {}) {
        this.blocks = blocks; // { hash: blockData }
    }

    async send(method, params) {
        if (method === "eth_getBlockByHash") {
            const [hash, fullTx] = params;
            return this.blocks[hash] || null;
        }

        if (method === "eth_getBlockByNumber") {
            const [numberHex, fullTx] = params;
            const number = parseInt(numberHex, 16);
            // 查找对应区块号的区块
            return Object.values(this.blocks).find((block) => block.number === number) || null;
        }

        throw new Error(`Unsupported method: ${method}`);
    }
}

class MockDB {
    constructor() {
        this.hashMappings = new Map(); // cfxHash -> ethHash
        this.state = {
            baseBlockNumber: 100,
            lastBlockNumber: 105,
        };
    }

    async getEthHashByCfxHash(cfxHash) {
        return this.hashMappings.get(cfxHash) || null;
    }

    async saveBlockHashMap(cfxHash, ethHash, blockNumber) {
        this.hashMappings.set(cfxHash, ethHash);
    }

    async getCorrectBlockHashBaseBlockNumber() {
        return this.state.baseBlockNumber;
    }

    async getCorrectBlockHashLastBlockNumber() {
        return this.state.lastBlockNumber;
    }

    async setCorrectBlockHashLastBlockNumber(blockNumber) {
        this.state.lastBlockNumber = blockNumber;
    }
}

class MockLogger {
    info(msg) {
        console.log(`[INFO] ${msg}`);
    }
}

// Mock calculateBlockHash 函数
function mockCalculateBlockHash(block) {
    // 简单的 mock 实现：基于父hash和区块号生成hash
    return `0xeth_${block.parentHash}_${block.number}`;
}

describe("BlockHashCorrector", () => {
    /** @type {BlockHashCorrector} */
    let corrector;
    /** @type {MockProvider} */
    let mockProvider;
    /** @type {MockDB} */
    let mockDB;
    /** @type {MockLogger} */
    let mockLogger;

    beforeEach(() => {
        // 创建测试数据：区块链
        const testBlocks = {
            "0xcfx_99": { number: 99, hash: "0xcfx_99", parentHash: "0xcfx_98" },
            "0xcfx_100": { number: 100, hash: "0xcfx_100", parentHash: "0xcfx_99" }, // baseBlock
            "0xcfx_101": { number: 101, hash: "0xcfx_101", parentHash: "0xcfx_100" },
            "0xcfx_102": { number: 102, hash: "0xcfx_102", parentHash: "0xcfx_101" },
            "0xcfx_106": { number: 106, hash: "0xcfx_106", parentHash: "0xcfx_105" },
            "0xcfx_105": { number: 105, hash: "0xcfx_105", parentHash: "0xcfx_104" },
            "0xcfx_104": { number: 104, hash: "0xcfx_104", parentHash: "0xcfx_103" },
            "0xcfx_103": { number: 103, hash: "0xcfx_103", parentHash: "0xcfx_102" },
        };

        mockProvider = new MockProvider(testBlocks);
        mockDB = new MockDB();
        mockLogger = new MockLogger();
        corrector = new BlockHashCorrector(mockProvider, mockDB, mockLogger, mockCalculateBlockHash);
    });

    describe("Basic functionality tests", () => {
        // 测试：应该拒绝小于baseBlockNumber的区块（除了创世区块）
        it("should reject blocks smaller than baseBlockNumber (except genesis block)", async () => {
            const block = { number: 50, hash: "0xcfx_50", parentHash: "0xcfx_49" };

            try {
                await corrector.correctBlockHash(block);
                expect.fail("Should throw error");
            } catch (error) {
                expect(error.message).to.include("forbidden to correct");
            }
        });

        // 测试：应该允许创世区块（区块号 = 0）
        it("should allow genesis block (number = 0)", async () => {
            const genesisBlock = { number: 0, hash: "0xcfx_0", parentHash: "0x0" };
            const result = await corrector.correctBlockHash(genesisBlock);
            expect(result).to.equal(genesisBlock);
        });
    });

    describe("baseBlock special handling", () => {
        // 测试：baseBlock应该能够直接使用链上父区块hash
        it("baseBlock should be able to directly use on-chain parent block hash", async () => {
            const baseBlock = { number: 100, hash: "0xcfx_100", parentHash: "0xcfx_99" };

            const result = await corrector.correctBlockHash(baseBlock);

            // 验证结果
            expect(result.hash).to.not.equal("0xcfx_100"); // 应该被重新计算
            expect(result.parentHash).to.equal("0xcfx_99"); // 直接使用链上父区块hash

            // 验证数据库中保存了映射
            const savedEthHash = await mockDB.getEthHashByCfxHash("0xcfx_100");
            expect(savedEthHash).to.equal(result.hash);
        });
    });

    describe("Processed block caching", () => {
        // 测试：应该从数据库返回已处理的区块
        it("should return processed blocks from database when ethHash and parentEthHash exist", async () => {
            // 预先在数据库中保存一个映射
            await mockDB.saveBlockHashMap("0xcfx_101", "0xeth_cached_101", 101);
            await mockDB.saveBlockHashMap("0xcfx_100", "0xeth_cached_100", 100);

            const block = { number: 101, hash: "0xcfx_101", parentHash: "0xcfx_100" };
            const result = await corrector.correctBlockHash(block);

            expect(result.hash).to.equal("0xeth_cached_101");
        });

        // 测试：当ethHash存在，parentEthHash不存在; 应该重新计算ethHash
        it("should calculate ethHash when ethHash exist and parentEthHash not exist", async () => {
            // 预先在数据库中保存一个映射
            await mockDB.saveBlockHashMap("0xcfx_101", "0xeth_cached_101", 101);

            const block = { number: 101, hash: "0xcfx_101", parentHash: "0xcfx_100" };
            const result = await corrector.correctBlockHash(block);

            expect(result.hash).to.not.equal("0xeth_cached_101");
        });
    });

    describe("Recursive backtracking processing", () => {
        // 测试：应该递归处理缺失的父区块
        it("should recursively process missing parent blocks", async () => {
            // 测试区块102，它的父区块链都没有被处理过
            const block = { number: 102, hash: "0xcfx_102", parentHash: "0xcfx_101" };

            const result = await corrector.correctBlockHash(block);

            // 验证区块102被正确处理
            expect(result.hash).to.not.equal("0xcfx_102");

            // 验证父区块链都被处理了
            const eth101 = await mockDB.getEthHashByCfxHash("0xcfx_101");
            const eth100 = await mockDB.getEthHashByCfxHash("0xcfx_100");
            expect(eth101).to.not.be.null;
            expect(eth100).to.not.be.null;
        });
    });

    describe("Batch processing tests", () => {
        // 测试：应该批量处理lastBlockNumber之后的区块
        it("should batch process blocks after lastBlockNumber", async () => {
            // mockDB.state.lastBlockNumber = 105
            // 请求区块106，应该会批量处理106
            const block = { number: 106, hash: "0xcfx_106", parentHash: "0xcfx_105" };

            const result = await corrector.correctBlockHash(block);

            // 验证区块106被处理
            expect(result.hash).to.not.equal("0xcfx_106");

            // 验证 lastBlockNumber 被更新
            const newLastBlockNumber = await mockDB.getCorrectBlockHashLastBlockNumber();
            expect(newLastBlockNumber).to.equal(106);
        });
    });

    describe("Reorg handling tests", () => {
        // 测试：应该处理中等程度的重组 - 两个区块发生变化
        it("should handle moderate reorg - two blocks changed", async () => {
            // 预设：区块100-102都已经被正确处理
            await mockDB.saveBlockHashMap("0xcfx_100", "0xeth_100", 100); // baseBlock
            await mockDB.saveBlockHashMap("0xcfx_101", "0xeth_101", 101);
            await mockDB.saveBlockHashMap("0xcfx_102", "0xeth_102", 102);

            // 中度 reorg - 两个区块发生变化
            const reorgBlock = { number: 103, hash: "0xcfx_103", parentHash: "0xcfx_102_new" };

            // 添加新的区块链分支
            mockProvider.blocks["0xcfx_102_new"] = {
                number: 102,
                hash: "0xcfx_102_new",
                parentHash: "0xcfx_101_new",
            };
            mockProvider.blocks["0xcfx_101_new"] = {
                number: 101,
                hash: "0xcfx_101_new",
                parentHash: "0xcfx_100", // 指向baseBlock
            };

            const result = await corrector.correctBlockHash(reorgBlock);

            // 验证区块被正确处理
            expect(result.hash).to.not.equal("0xcfx_103");

            // 验证新区块都被处理
            const eth101New = await mockDB.getEthHashByCfxHash("0xcfx_101_new");
            const eth102New = await mockDB.getEthHashByCfxHash("0xcfx_102_new");
            expect(eth101New).to.not.be.null;
            expect(eth102New).to.not.be.null;

            // 验证baseBlock被复用
            const eth100 = await mockDB.getEthHashByCfxHash("0xcfx_100");
            expect(eth100).to.equal("0xeth_100"); // 还是原来的值
        });

        // 测试：应该处理回滚到baseBlock的重组
        it("should handle reorg that rolls back to baseBlock", async () => {
            // 预设一些区块
            await mockDB.saveBlockHashMap("0xcfx_100", "0xeth_100", 100);
            await mockDB.saveBlockHashMap("0xcfx_101", "0xeth_101", 101);

            // 新区块直接连接到 baseBlock，跳过了101
            const reorgBlock = {
                number: 102,
                hash: "0xcfx_102_direct",
                parentHash: "0xcfx_100", // 直接指向baseBlock
            };

            const result = await corrector.correctBlockHash(reorgBlock);

            // 验证区块被正确处理
            expect(result.hash).to.not.equal("0xcfx_102_direct");

            // 验证父hash指向baseBlock的ethHash
            expect(result.parentHash).to.equal("0xeth_100");
        });
    });

    describe("Error handling", () => {
        // 测试：应该处理链上区块不存在的情况
        it("should handle cases where on-chain blocks do not exist", async () => {
            const block = { number: 200, hash: "0xcfx_200", parentHash: "0xcfx_nonexistent" };

            try {
                await corrector.correctBlockHash(block);
                expect.fail("Should throw error");
            } catch (error) {
                // 应该在尝试获取父区块时失败
                expect(error).to.exist;
            }
        });
    });
});
