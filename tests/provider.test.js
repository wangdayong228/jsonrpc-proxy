const { expect } = require("chai");
const { ethers } = require("ethers");

xdescribe("真实 Provider 测试", () => {
    let provider;

    before(() => {
        provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    });

    describe("获取区块测试", () => {
        it("应该能获取最新区块并包含 sha3Uncles 字段", async () => {
            const latestBlock = await provider.getBlock("latest");
            
            expect(latestBlock).to.not.be.null;
            expect(latestBlock.number).to.be.a("number");
            expect(latestBlock.hash).to.be.a("string");
            expect(latestBlock.sha3Uncles).to.be.a("string");
            
            console.log(`最新区块号: ${latestBlock.number}`);
            console.log(`最新区块 hash: ${latestBlock.hash}`);
            console.log(`最新区块 sha3Uncles: ${latestBlock.sha3Uncles}`);
        });

        it("应该能获取前一个区块并包含 sha3Uncles 字段", async () => {
            const latestBlock = await provider.getBlock("latest");
            const previousBlockNumber = latestBlock.number - 1;
            const previousBlock = await provider.getBlock(previousBlockNumber);
            
            expect(previousBlock).to.not.be.null;
            expect(previousBlock.number).to.equal(previousBlockNumber);
            expect(previousBlock.hash).to.be.a("string");
            expect(previousBlock.sha3Uncles).to.be.a("string");
            
            console.log(`前一个区块号: ${previousBlock.number}`);
            console.log(`前一个区块 hash: ${previousBlock.hash}`);
            console.log(`前一个区块 sha3Uncles: ${previousBlock.sha3Uncles}`);
        });

        it("两个区块的 sha3Uncles 字段应该存在且为有效的十六进制字符串", async () => {
            const latestBlock = await provider.getBlock("latest");
            const previousBlock = await provider.getBlock(latestBlock.number - 1);
            
            // 检查 sha3Uncles 字段格式
            expect(latestBlock.sha3Uncles).to.match(/^0x[a-fA-F0-9]{64}$/);
            expect(previousBlock.sha3Uncles).to.match(/^0x[a-fA-F0-9]{64}$/);
            
            console.log(`最新区块 sha3Uncles 格式正确: ${latestBlock.sha3Uncles}`);
            console.log(`前一个区块 sha3Uncles 格式正确: ${previousBlock.sha3Uncles}`);
        });
    });
});

describe("测试 correctBlockHash", () => {
    let provider;

    before(() => {
        provider = new ethers.JsonRpcProvider("http://127.0.0.1:3031");
    });

    it("应该能正确修正区块 hash", async () => {
        const block = await provider.getBlock("0x73710c340b32e1bcda8f5fb06379c1604fd910af6ae50b00c6d30987e4add584");
        expect(block.hash).to.be.equal("0x73710c340b32e1bcda8f5fb06379c1604fd910af6ae50b00c6d30987e4add584");
    });
});