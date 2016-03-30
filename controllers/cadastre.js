var format = require('pg-format');
var _ = require('lodash');


// Alternative implementation for performance test purpose
exports.communeStream = function(req, res, next) {
    var query = req.pgClient.query(format(`
        SELECT id_cadastre, numero, voie_cadastre, surface, ST_AsGeoJSON(geometrie, 7) AS geom
        FROM parcelles
        WHERE insee_com = '%s';`
    , req.params.communeInsee));

    query.on('error', err => {
        req.pgEnd();
        return next(err);
    });

    var first = true;

    var onSuccess = _.once(() => {
        res.type('json');
        res.write('{"type": "FeatureCollection", "features": [');
    });

    query.on('row', row => {
        onSuccess();
        res.write((first ? '' : ',') + '{"type":"Feature","geometry":');
        res.write(row.geom);
        res.write(',"properties":');
        res.write(JSON.stringify(_.pick(row, 'id_cadastre', 'numero', 'voie_cadastre', 'surface')));
        res.write('}');
        first = false;
    });

    query.on('end', () => {
        req.pgEnd();
        res.write(']}');
        res.end();
    });
};

exports.commune = function(req, res, next) {
    req.pgClient.query(format(`
            SELECT id_cadastre, numero, voie_cadastre, surface, ST_AsGeoJSON(geometrie, 7) AS geom
            FROM parcelles
            WHERE insee_com = '%s';
        `, req.params.communeInsee), function (err, result) {
        req.pgEnd();
        if (err) return next(err);

        return res.send({
            type: 'FeatureCollection',
            features: result.rows.map(function (row) {
                return {
                    type: 'Feature',
                    geometry: JSON.parse(row.geom),
                    properties: _.pick(row, 'id_cadastre', 'numero', 'voie_cadastre', 'surface')
                };
            })
        });
    });
};

exports.preview = function (req, res) {
    res.redirect('http://umap.fluv.io/fr/map/new/?dataUrl=' + encodeURIComponent(process.env.ROOT_URL + '/commune/' + req.params.communeInsee));
};
