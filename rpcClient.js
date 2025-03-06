const axios = require('axios');

const TARGET_URL = process.env.JSONRPC_URL;

module.exports = async function request (method, params = []) {
    const id = Date.now() + Math.random();
    const req = {
        jsonrpc: "2.0",
	    method,
        params,
	    id,
    };
    const {data} = await axios.post(TARGET_URL, req);
    return data;
}