var Express = require('express');
var Joi = require('joi'); // I know that this is not on sandbox. Let webpack bundle it for webtask usage.
var Package = require('../package.json'); // Test of loading json


var app = Express();
var router = Express.Router();

// Set up any middleware
app.use(router);


router.all('*', handleRoot);


module.exports = app;



function handleRoot(req, res) {
    res.send('<h1>Webtask? Heroku? Does it matter anymore?</h1>');
}

