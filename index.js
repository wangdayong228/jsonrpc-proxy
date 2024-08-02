const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.JSONRPC_URL;

// 使用 morgan 进行日志记录
app.use(morgan('combined'));

// 解析 JSON 请求体
app.use(bodyParser.json());

app.post('/', async (req, res) => {
    try {
        // 记录请求
        console.log('Request:', req.body);

        // 将请求转发到目标 JSON-RPC 服务器
        const response = await axios.post(TARGET_URL, req.body);

        // 记录响应
        console.log('Response:', response.data);

        // 返回响应给客户端
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`JSON-RPC proxy server is running on port ${PORT}`);
});