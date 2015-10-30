var format = require('pg-format');
var _ = require('lodash');


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
