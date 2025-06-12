module.exports = async function (ctx, next) {
    // 设置允许的源
    ctx.set('Access-Control-Allow-Origin', '*');
    // 允许的请求方法
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // 允许的请求头
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // 允许携带凭证信息（如 Cookie）
    ctx.set('Access-Control-Allow-Credentials', 'true');
    // 预检请求的缓存时间（秒）
    ctx.set('Access-Control-Max-Age', '600');

    // 处理 OPTIONS 预检请求
    if (ctx.method === 'OPTIONS') {
        ctx.status = 204; // No Content
        return;
    }

    await next();
}