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

function resultNull(ctx) {
    ctx.body = {
        jsonrpc: '2.0',
        id: ctx.request.body.id,
        result: null
    }
}

module.exports = {
    headerForHashNotFound,
    resultNull
}