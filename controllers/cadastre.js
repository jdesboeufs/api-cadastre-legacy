'use strict';
const format = require('pg-format');
const _ = require('lodash');
const _s = require('underscore.string');


function prepareProperties(row) {
    const properties = {};
    properties.id = row.id_cadastre;
    properties.section = row.id_cadastre.substr(8, 2);
    properties.numero = row.id_cadastre.substr(10, 4);
    properties.surface = row.surface;
    return properties;
}

// Alternative implementation for performance test purpose
function parcellesStream(req, res, next) {
    const query = req.pgClient.query(format(`
        SELECT id_cadastre, numero, voie_cadastre, surface, ST_AsGeoJSON(geometrie, 7) AS geom
        FROM parcelles
        WHERE insee_com = '%s';`
    , req.codeInsee));

    query.on('error', err => {
        req.pgEnd();
        return next(err);
    });

    let first = true;

    const onSuccess = _.once(() => {
        res.type('json');
        res.write('{"type": "FeatureCollection", "features": [');
    });

    query.on('row', row => {
        onSuccess();
        res.write(`${first ? '' : ','}{"type":"Feature","geometry":`);
        res.write(row.geom);
        res.write(',"properties":');
        res.write(JSON.stringify(prepareProperties(row)));
        res.write('}');
        first = false;
    });

    query.on('end', () => {
        req.pgEnd();
        res.write(']}');
        res.end();
    });
}

function parcelles(req, res, next) {
    const conditions = [`insee_com = '${req.codeInsee}'`];

    if (req.query.section || req.query.numero) {
        let pattern = '%';
        pattern = req.query.section ? pattern + _s.lpad(req.query.section, 2, '0') : '__';
        pattern = req.query.numero ? pattern + _s.lpad(req.query.numero, 4, '0') : '____';
        conditions.push(`id_cadastre LIKE '${pattern}'`);
    }

    req.pgClient.query(`
        SELECT DISTINCT id_cadastre, surface, ST_AsGeoJSON(geometrie, 7) AS geom
        FROM parcelles
        WHERE ${conditions.join(' AND ')};
    `, (err, result) => {
        req.pgEnd();
        if (err) return next(err);

        return res.send({
            type: 'FeatureCollection',
            features: result.rows.map(row => ({
                type: 'Feature',
                geometry: JSON.parse(row.geom),
                properties: prepareProperties(row),
            })),
        });
    });
}

function preview(req, res) {
    res.redirect(`http://umap.fluv.io/fr/map/new/?dataUrl=${encodeURIComponent(`${process.env.ROOT_URL}/commune/${req.params.communeInsee}`)}`);
}

module.exports = { parcellesStream, preview, parcelles };
