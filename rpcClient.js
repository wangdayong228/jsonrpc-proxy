const axios = require("axios");

const TARGET_URL = process.env.JSONRPC_URL;

module.exports = async function request(method, params = []) {
    const id = Date.now() + Math.random();
    const req = { jsonrpc: "2.0", method, params, id };
    try {
        const { data } = await axios.post(TARGET_URL, req);
        return data;
    } catch (e) {
        console.error(`rpcClient request error: ${e?.message || "network error"}`);
        return { jsonrpc: "2.0", id, error: { code: -32603, message: e?.message || "network error" } };
    }
};
