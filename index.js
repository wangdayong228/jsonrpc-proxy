const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const winston = require('winston');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.JSONRPC_URL;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.File({ filename: 'proxy.log' })
    ]
});

// 使用 morgan 进行日志记录
app.use(morgan('combined'));

// 解析 JSON 请求体
app.use(bodyParser.json());

// 不支持 batch 请求
app.post('/', async (req, res) => {
    try {
        const method = req.body.method;

        // 记录请求
        console.log('Request:', req.body);
         // 记录请求
        logger.info(`Request: ${JSON.stringify(req.body)}`);

        // eth_call 适配
        if (method === 'eth_call') {
            if (req.body.params[0] && req.body.params[0].input) {
                req.body.params[0].data = req.body.params[0].input;
            }
        }

        // 将请求转发到目标 JSON-RPC 服务器
        const {data} = await axios.post(TARGET_URL, req.body);

        // handle yParity and v is not same
        if (method === 'eth_getTransactionByHash') {
            if (data.result) {
                data.result.v = data.result.yParity;
            }
        }

        if (method === 'eth_getBlockByHash' || method === 'eth_getBlockByNumber') {
            if (data.result && data.result.transactions.length > 0 && typeof data.result.transactions[0] === 'object') {
                for(let i = 0; i < data.result.transactions.length; i++) {
                    data.result.transactions[i].v = data.result.transactions[i].yParity;
                }
            }
        }

        // 记录响应
        console.log('Response:', data);
        logger.info(`Response: ${JSON.stringify(data)}`);

        // 返回响应给客户端
        res.json(data);
    } catch (error) {
        console.error('Error:', error.message || error);
        logger.error(`Error: ${error.message || error}`);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`JSON-RPC proxy server is running on port ${PORT}`);
});