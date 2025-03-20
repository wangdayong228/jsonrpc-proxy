function headerForHashNotFound(ctx) {
    ctx.body = {
        jsonrpc: '2.0',
        id: ctx.request.body.id,
        error: {
            code: -32000,
            message: 'header for hash not found'
        }
    }
}

module.exports = {
    headerForHashNotFound
}