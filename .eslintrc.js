module.exports = {
    "parserOptions": {
        "ecmaVersion": 6,
    },
    "env": {
        "node": true,
    },
    // "extends": "auth0-base",
    "rules": {
       "indent": ["warn", 4],
       "global-require": 0,
       "camelcase": 0,
       "curly": 0,
       "no-undef": ["error"],
       "no-unused-vars": ["warn"],
    }
};