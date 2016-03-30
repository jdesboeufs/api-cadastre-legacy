'use strict';
const format = require('pg-format');
const _ = require('lodash');
const _s = require('underscore.string');


function prepareProperties(row) {
    return _.pick(row, 'id_cadastre', 'numero', 'voie_cadastre', 'surface');
}

// Alternative implementation for performance test purpose
function communeStream(req, res, next) {
    const query = req.pgClient.query(format(`
        SELECT id_cadastre, numero, voie_cadastre, surface, ST_AsGeoJSON(geometrie, 7) AS geom
        FROM parcelles
        WHERE insee_com = '%s';`
    , req.params.communeInsee));

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

function commune(req, res, next) {
    req.pgClient.query(format(`
            SELECT DISTINCT id_cadastre, surface, ST_AsGeoJSON(geometrie, 7) AS geom
            FROM parcelles
            WHERE insee_com = '%s';
        `, req.params.communeInsee), (err, result) => {
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

function parcelles(req, res, next) {
    const conditions = [`insee_com = '${req.params.communeInsee}'`];

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

module.exports = { communeStream, commune, preview, parcelles };
