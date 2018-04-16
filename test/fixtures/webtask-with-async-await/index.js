module.exports = async (ctx, cb) => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    cb(null, {
        'Object.keys': Object.keys(ctx),
        'JSON.stringify': JSON.stringify(ctx.secrets),
    });
}
