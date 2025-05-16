const { ethers, encodeRlp } = require("ethers");

function push(array, item, name) {
    array.push(item);
    // console.log(`pushed ${name}`, item);
}

/**
 * 实现与 Go 的 WriteUint64 相同的 RLP 编码
 * @param {number|BigInt|string} value - 要编码的 uint64 值
 * @returns {string} 十六进制字符串，符合 RLP 规范
 */
function formatNumberForRlp(value) {
    const bigValue = BigInt(value);

    // 特殊情况：0 值编码为 0x80
    if (bigValue === 0n) {
        return "0x";
    }
    return ethers.toBeHex(bigValue);
}

/**
 * 使用 ethers v6 实现与 Header.EncodeRLP 等价的功能
 * @param {Object} header - 区块头对象
 * @returns {string} - RLP 编码后的十六进制字符串
 */
function encodeHeaderRLP(header) {
    // console.log("ready to encodeHeaderRLP", header);


    // 准备要编码的列表项
    const items = [];

    // 添加基本字段（始终存在）
    push(items, header.parentHash, "parentHash");
    push(items, header.sha3Uncles, "sha3Uncles");
    push(items, header.miner, "miner");
    push(items, header.stateRoot, "stateRoot");
    push(items, header.transactionsRoot, "transactionsRoot");
    push(items, header.receiptsRoot, "receiptsRoot");
    push(items, header.logsBloom, "logsBloom");

    // difficulty
    if (!header.difficulty) {
        push(items, "0x", "difficulty"); // 空字符串：0x80
    } else {
        // 检查是否为负数
        if (BigInt(header.difficulty) < 0n) {
            throw new Error("ErrNegativeBigInt: difficulty cannot be negative");
        }
        push(items, formatNumberForRlp(header.difficulty), "difficulty");
    }

    // number
    if (!header.number) {
        push(items, "0x", "number"); // 空字符串
    } else {
        // 检查是否为负数
        if (BigInt(header.number) < 0n) {
            throw new Error("ErrNegativeBigInt: number cannot be negative");
        }
        push(items, formatNumberForRlp(header.number), "number");
    }

    // gasLimit、gasUsed、timestamp - 直接作为 uint64 编码
    push(items, formatNumberForRlp(header.gasLimit || 0), "gasLimit");
    push(items, formatNumberForRlp(header.gasUsed || 0), "gasUsed");
    push(items, formatNumberForRlp(header.timestamp || 0), "timestamp");

    // extraData
    push(items, header.extraData || "0x", "extraData");

    // mixHash、nonce
    push(items, header.mixHash, "mixHash");
    push(items, header.nonce, "nonce");

    // 判断是否需要添加扩展字段
    const hasbaseFeePerGas = header.baseFeePerGas != null;
    const haswithdrawalsHash = header.withdrawalsHash != null;
    const hasblobgasUsed = header.blobgasUsed != null;
    const hasexcessBlobGas = header.excessBlobGas != null;
    const hasparentBeaconhash = header.parentBeaconhash != null;
    const hasRequestsHash = header.RequestsHash != null;

    // baseFeePerGas (EIP-1559)
    if (hasbaseFeePerGas || haswithdrawalsHash || hasblobgasUsed ||
        hasexcessBlobGas || hasparentBeaconhash || hasRequestsHash) {

        if (!hasbaseFeePerGas) {
            push(items, "0x", "baseFeePerGas"); // 空字符串
        } else {
            // 检查是否为负数
            if (BigInt(header.baseFeePerGas) < 0n) {
                throw new Error("ErrNegativeBigInt: baseFeePerGas cannot be negative");
            }
            push(items, formatNumberForRlp(header.baseFeePerGas), "baseFeePerGas");
        }
    }

    // withdrawalsHash (Shanghai/EIP-4895)
    if (haswithdrawalsHash || hasblobgasUsed ||
        hasexcessBlobGas || hasparentBeaconhash || hasRequestsHash) {

        if (!haswithdrawalsHash) {
            push(items, "0x", "withdrawalsHash"); // 空字符串 0x80
        } else {
            push(items, header.withdrawalsHash, "withdrawalsHash");
        }
    }

    // blobgasUsed (Cancun/EIP-4844)
    if (hasblobgasUsed || hasexcessBlobGas ||
        hasparentBeaconhash || hasRequestsHash) {

        if (!hasblobgasUsed) {
            push(items, "0x", "blobgasUsed"); // 空字符串
        } else {
            push(items, formatNumberForRlp(header.blobgasUsed), "blobgasUsed");
        }
    }

    // excessBlobGas (Cancun/EIP-4844)
    if (hasexcessBlobGas || hasparentBeaconhash || hasRequestsHash) {
        if (!hasexcessBlobGas) {
            push(items, "0x", "excessBlobGas"); // 空字符串
        } else {
            push(items, formatNumberForRlp(header.excessBlobGas), "excessBlobGas");
        }
    }

    // parentBeaconhash (Cancun/EIP-4788)
    if (hasparentBeaconhash || hasRequestsHash) {
        if (!hasparentBeaconhash) {
            push(items, "0x", "parentBeaconhash"); // 空字符串
        } else {
            push(items, header.parentBeaconhash, "parentBeaconhash");
        }
    }

    // RequestsHash (Prague)
    if (hasRequestsHash) {
        if (!hasRequestsHash) {
            push(items, "0x", "RequestsHash"); // 空字符串
        } else {
            push(items, header.RequestsHash, "RequestsHash");
        }
    }

    // console.log("items", items);

    // RLP 编码整个列表
    const encoded = ethers.encodeRlp(items);
    // console.log("encoded", encoded);
    return encoded;
}

// 使用示例
function calculateBlockHash(header) {
    const { ethers } = require("ethers");

    // 使用我们的 encodeHeaderRLP 函数进行 RLP 编码
    const encodedHeader = encodeHeaderRLP(header);

    // 计算 Keccak-256 哈希
    return ethers.keccak256(encodedHeader);
}


module.exports = {
    encodeHeaderRLP,
    calculateBlockHash
}

// test
if (require.main === module) {
    // 测试用例
    const header = {
        "author": "0x13c9f0ae8a79df8cd3bc18301477ae6376dba8d0",
        "baseFeePerGas": "0x1",
        "difficulty": "0x4",
        "espaceGasLimit": "0x0",
        "extraData": "0x",
        "gasLimit": "0x1c9c380",
        "gasUsed": "0x0",
        "hash": "0x70f4f584669b71767a306d631a3208f9fa87182df262a1ff8e90bcb7dcd65fa3",
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "miner": "0x13c9f0ae8a79df8cd3bc18301477ae6376dba8d0",
        "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "nonce": "0xf9d9fd8fa8b128b1",
        "number": "0x333e4",
        "parentHash": "0xbb440e6739a2b63eb655fdf0fd777091868d66da4aa7c7f0baf0ac4521c9ad23",
        "receiptsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
        "size": "0x0",
        "stateRoot": "0xdc8cb6475f3ebc6a0149c1d426ec67b8f0f3c20df51d49030de73fb8b1426b35",
        "timestamp": "0x67dd28ce",
        "totalDifficulty": "0x0",
        "transactions": [],
        "transactionsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        "uncles": []
    }


    console.log("Block Hash:", calculateBlockHash(header));
    console.log("encodeRlp('0x'):", encodeRlp("0x"))
    console.log("encodeRlp('0x00'):", encodeRlp("0x00"))
}
