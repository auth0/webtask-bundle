module.exports = (ctx, cb) => {
    cb(null, {
        'Object.keys': Object.keys(ctx),
        'JSON.stringify': JSON.stringify(ctx.secrets),
    });
}