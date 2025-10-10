const { calculateBlockHash } = require("./rlp");
const { Mutex } = require("async-mutex");

/**
 * 简单的区块 hash 处理类
 */
class BlockWrapper {
    constructor(block) {
        // 复制所有属性
        Object.assign(this, block);
        // 保存原始 hash
        this.rawHash = block.hash;
        this.rawParentHash = block.parentHash;
    }

    /**
     * 设置修正后的区块 hash
     */
    setEthHash(ethHash) {
        this.hash = ethHash;
        return this;
    }

    /**
     * 设置修正后的父区块 hash
     */
    setParentEthHash(parentEthHash) {
        this.parentHash = parentEthHash;
        return this;
    }
}

class BlockHashCorrector {
    constructor(provider, db, logger, calculateBlockHashFn = calculateBlockHash) {
        this.provider = provider;
        this.db = db;
        this.logger = logger;
        this.calculateBlockHash = calculateBlockHashFn;
        this.mutex = new Mutex();
    }

    async correctBlockHash(block) {
        return await this.mutex.runExclusive(() => this.#correctBlockHash(block));
    }

    // 对外暴露的主方法
    async #correctBlockHash(block) {
        if (!block) return block;

        this.logger.info(`start correctBlockHash block.number ${Number(block.number)}`);

        const config = await this.#getConfig();

        if (block.number < config.baseBlockNumber) {
            if (block.number == 0) return block;
            throw new Error(`forbidden to correct, because block.number ${block.number} < baseBlockNumber ${config.baseBlockNumber}`);
        }

        if (block.number <= config.lastBlockNumber) {
            return await this.#correctSingleBlock(block, config.baseBlockNumber);
        }

        // 批量处理
        await this.#correctRange(config.lastBlockNumber + 1, Number(block.number), config.baseBlockNumber);
        return await this.#correctSingleBlock(block, config.baseBlockNumber);
    }

    // 私有方法：获取配置
    async #getConfig() {
        const baseBlockNumber = await this.db.getCorrectBlockHashBaseBlockNumber();
        let lastBlockNumber = await this.db.getCorrectBlockHashLastBlockNumber();
        lastBlockNumber = lastBlockNumber || baseBlockNumber;
        lastBlockNumber = Math.max(lastBlockNumber, baseBlockNumber);

        return { baseBlockNumber, lastBlockNumber };
    }

    // 私有方法：处理单个区块
    async #correctSingleBlock(block, baseBlockNumber) {
        if (!block) return block;

        const startAt = Date.now();
        const isBaseBlock = Number(block.number) === Number(baseBlockNumber);

        // console.log(`start correctSingleBlock block.number ${Number(block.number)}, isBaseBlock ${isBaseBlock}`);

        let ethHash = await this.db.getEthHashByCfxHash(block.hash);
        let parentEthHash = await this.db.getEthHashByCfxHash(block.parentHash);

        // ethHash 存在 ｜ parentEthHash 存在 ｜ 直接返回
        // ethHash 存在 ｜ parentEthHash 不存在 ｜ 计算父区块，重新计算ethHash
        // ethHash 不存在 ｜ parentEthHash 存在 ｜ 计算ethHash
        // ethHash 不存在 ｜ parentEthHash 不存在 ｜ 计算父区块，重新计算ethHash
        if (ethHash && parentEthHash) {
            return new BlockWrapper(block).setEthHash(ethHash).setParentEthHash(parentEthHash);
        }

        if (!parentEthHash) {
            const rawParentHash = block.parentHash;
            const parentBlock = await this.provider.send("eth_getBlockByHash", [block.parentHash, false]);

            if (isBaseBlock) {
                // baseBlock 可以直接使用链上父区块hash
                parentEthHash = parentBlock.hash;
            } else {
                // 其他区块需要重新计算父区块
                await this.#correctSingleBlock(parentBlock, baseBlockNumber);
                parentEthHash = await this.db.getEthHashByCfxHash(block.parentHash);
            }

            await this.db.saveBlockHashMap(rawParentHash, parentEthHash, parentBlock.number);
        }

        // 计算当前区块
        const correctedBlock = new BlockWrapper(block).setParentEthHash(parentEthHash);
        ethHash = this.calculateBlockHash(correctedBlock);
        correctedBlock.setEthHash(ethHash);
        await this.db.saveBlockHashMap(correctedBlock.rawHash, ethHash, correctedBlock.number);

        this.logger.info(`correctSingleBlock ${Number(correctedBlock.number)} ${correctedBlock.rawHash} duration ${Date.now() - startAt}ms`);
        return correctedBlock;
    }

    // 私有方法：批量处理区块范围
    async #correctRange(start, end, baseBlockNumber) {
        console.log(`start correctRange ${start} ${end}`);
        const startAt = Date.now();
        for (let bn = start; bn <= end; bn++) {
            const block = await this.provider.send("eth_getBlockByNumber", ["0x" + bn.toString(16), false]);
            await this.#correctSingleBlock(block, baseBlockNumber);
            await this.db.setCorrectBlockHashLastBlockNumber(bn);
            // this.logger.info(`corrected block ${block.number} ${block.rawHash} success`);
        }
        this.logger.info(`correctRange ${start} ${end} duration ${Date.now() - startAt}ms`);
    }
}

module.exports = {
    BlockHashCorrector,
};
