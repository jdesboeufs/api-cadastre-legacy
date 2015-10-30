var format = require('pg-format');
var _ = require('lodash');


exports.commune = function(req, res, next) {
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
