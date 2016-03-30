'use strict';
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const pg = require('pg').native;
const morgan = require('morgan');
const cadastre = require('./controllers/cadastre');

const app = express();
const port = process.env.PORT || 5000;

app.use(compression());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'short' : 'dev'));

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
app.get('/api/commune/:communeInsee', pgClient, cadastre.parcelles, pgEnd);
app.get('/api/commune/:communeInsee/parcelles', pgClient, cadastre.parcelles);
app.get('/api/commune/:communeInsee/stream', pgClient, cadastre.parcellesStream, pgEnd);

app.get('/commune/:communeInsee/preview', cadastre.preview);

/* Ready! */
app.listen(port, () => {
    console.log('Start listening on port %d', port);
});
