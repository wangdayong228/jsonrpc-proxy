#!/usr/bin/env node

const { ethers } = require('ethers');
const axios = require('axios');

// 配置
const ETHEREUM_RPC_URL = 'https://rpc.mevblocker.io/fullprivacy' || 'http://localhost:80'; // 修改为你的以太坊节点 RPC URL
const TO_ADDRESS = '0x0000000000000000000000000000000000000000'; // 任意目标地址
const INPUT_DATA = process.argv[2] || "0x" + '1234567890'.repeat(100); // 默认数据或从命令行参数获取
const CHUNK_SIZE = process.argv[3] || 10000; // 默认块大小为 10000 字节
const BASE_COST = 21000;

// 初始化提供者
const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);

/**
 * 将十六进制数据分割成块
 * @param {string} hexData - 十六进制数据字符串
 * @param {number} bytesPerChunk - 每块的字节数
 * @returns {string[]} 数据块数组
 */
function splitDataIntoChunks(hexData, bytesPerChunk = 100) {
    // 确保数据是十六进制格式并移除前缀
    const cleanHex = hexData.startsWith('0x') ? hexData.slice(2) : hexData;

    // 将十六进制转换为字节计数（每2个十六进制字符等于1字节）
    const chunks = [];
    const charsPerChunk = bytesPerChunk * 2;

    for (let i = 0; i < cleanHex.length; i += charsPerChunk) {
        const chunk = cleanHex.slice(i, i + charsPerChunk);
        chunks.push('0x' + chunk);
    }

    return chunks;
}

/**
 * 根据 EIP-7623 计算本地 gas 估算
 * @param {string} hexData - 十六进制数据
 * @returns {number} 估算的 gas 值
 */
function calculateLocalEstimateWithoutBaseCost(hexData) {
    // 确保数据是十六进制格式并移除前缀
    const cleanHex = hexData.startsWith('0x') ? hexData.slice(2) : hexData;

    // 创建 Buffer 用于计算零字节数量
    const buffer = Buffer.from(cleanHex, 'hex');

    // 计算零字节和非零字节数量
    let zeroBytes = 0;
    let nonZeroBytes = 0;

    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0) {
            zeroBytes++;
        } else {
            nonZeroBytes++;
        }
    }

    const tokensInCalldata = zeroBytes + (nonZeroBytes * 4);

    // 根据 EIP-7623 计算 gas
    // 零字节消耗 4 gas，非零字节消耗 16 gas
    const gasForData = tokensInCalldata * 10;

    // 交易基础成本为 21000 gas
    // const baseCost = 21000;

    return gasForData;
}

/**
 * 使用 eth_estimateGas 获取 RPC 估算
 * @param {string} hexData - 十六进制数据
 * @returns {Promise<number>} 估算的 gas 值
 */
async function getRpcEstimateWithoutBaseCost(hexData) {
    try {
        const gasEstimate = await provider.estimateGas({
            to: TO_ADDRESS,
            data: hexData
        });

        return Number(gasEstimate) - BASE_COST;
    } catch (error) {
        console.error(`RPC 估算失败: ${error.message}`);
        return 0;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('EIP-7623 Gas 估算比较');
    console.log('-----------------------------------------');
    console.log(`目标地址: ${TO_ADDRESS}`);
    console.log(`数据长度: ${Math.floor((INPUT_DATA.length - 2) / 2)} 字节`); // 减去 '0x' 前缀并除以 2
    console.log('-----------------------------------------');

    // 将数据分割成每块 CHUNK_SIZE 字节
    const chunks = splitDataIntoChunks(INPUT_DATA, CHUNK_SIZE);
    console.log(`已将数据分成 ${chunks.length} 个块, 每块最多 ${CHUNK_SIZE} 字节`);
    console.log('-----------------------------------------');

    console.log('块号\t字节数\t本地估算\tRPC估算\t差异\t差异百分比');
    console.log('-----------------------------------------');

    // 处理每个块
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const byteLength = (chunk.length - 2) / 2; // 减去 '0x' 前缀并除以 2

        // 本地 EIP-7623 估算
        const localEstimate = calculateLocalEstimateWithoutBaseCost(chunk);

        // RPC 估算
        const rpcEstimate = await getRpcEstimateWithoutBaseCost(chunk);

        // 计算差异
        const difference = rpcEstimate - localEstimate;
        const percentDifference = ((difference / localEstimate) * 100).toFixed(2);

        // 输出结果
        console.log(`${i + 1}\t${byteLength}\t${localEstimate}\t${rpcEstimate}\t${difference}\t${percentDifference}%`);
    }

    console.log('-----------------------------------------');
    console.log('估算完成!');
}

// 运行主函数
main().catch(error => {
    console.error('出错了:', error);
    process.exit(1);
}); 