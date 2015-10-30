var express = require('express');
var cors = require('cors');
var compression = require('compression');
var pg = require('pg').native;
var morgan = require('morgan');
var cadastre = require('./controllers/cadastre');

var app = express();
var port = process.env.PORT || 5000;

app.use(compression());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'short' : 'dev'));

/* Middlewares */
function pgClient(req, res, next) {
    pg.connect(process.env.PG_URI, function (err, client, done) {
        if (err) return next(err);
        req.pgClient = client;
        req.pgEnd = done;
        next();
    });
}

function pgEnd(req, res, next) {
    if (req.pgEnd) req.pgEnd();
    next();
}

/* Routes */
app.get('/commune/:communeInsee', pgClient, cadastre.commune, pgEnd);

/* Ready! */
app.listen(port, function () {
    console.log('Start listening on port %d', port);
});
