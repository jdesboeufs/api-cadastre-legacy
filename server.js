'use strict';
const express = require('express');
const cors = require('cors');
const pg = require('pg');
const morgan = require('morgan');
const cadastre = require('./controllers/cadastre');

const app = express();
const port = process.env.PORT || 5000;
const production = process.env.NODE_ENV === 'production';

if (production) {
    app.set('trust proxy', true);
}

app.use(cors());
app.use(morgan(production ? 'short' : 'dev'));

/* Middlewares */
function pgClient(req, res, next) {
    pg.connect(process.env.PG_URI, (err, client, done) => {
        if (err) return next(err);
        req.pgClient = client;
        req.pgEnd = done;
        return next();
    });
}

function pgEnd(req, res, next) {
    if (req.pgEnd) req.pgEnd();
    return next();
}

/* Routes */
app.param('codeCommune', require('./lib/codeCommune').paramExtractor);

app.get('/commune/:codeCommune', pgClient, cadastre.parcelles, pgEnd);
app.get('/commune/:codeCommune/preview', cadastre.preview);

/* OpenAPI definition */
app.get('/definition.yml', function (req, res) {
    res.sendFile(__dirname + '/definition.yml');
});

/* Ready! */
app.listen(port);
