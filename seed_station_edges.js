

const TEST_DB_NAME = "database_test.db";
const DB_DIRNAME = "DATA";
const DATA_SOURCE_DIRNAME = "data_source";
const STATION_DIRNAME = "station";
const DISTRIBUTION_ROOM_DIRNAME = "distribution_room";

const Promise = require('bluebird');
const _ = require('lodash');
const fp = require('lodash/fp');
const xlsx = require('node-xlsx');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, DB_DIRNAME, TEST_DB_NAME)
    },
    useNullAsDefault: true
});

const station_edges_files = fs.readdirSync(path.join(__dirname, DATA_SOURCE_DIRNAME, 'station_edges'))
    .map(file => path.join(__dirname, DATA_SOURCE_DIRNAME, 'station_edges', file));
const station_edges_objs = fp.flow(
    fp.map(file => xlsx.parse(file)),
    // console.log
    fp.flatten,                  // flatten to array of sheet objs
    fp.map(sheet => sheet.data),    // convert to array of sheet data
    fp.map(sheet => _.tail(sheet)),   // remove first row of every sheet
    fp.flatten,                    // flatten to array of rows
    fp.filter(row => !_.isEmpty(row[0])),
    fp.compact,                     // remove empty rows
    fp.map(row => ({ start: row[0], end: row[1], is_backup: row[2] })),  // convert row to edge obj
    // console.log
)(station_edges_files)


// let edgeObjs = fp.flow(
//     fp.map(x => ({ start: _.split(x.panelInfo.parents, /\s{2,}/), end: x.panelInfo.name, isBackup: null })),
//     fp.map(edge => {
//         let res = [];
//         _.forEach(edge.start, s => {
//             res.push({ start: s, end: edge.end })
//         });
//         return res;
//     }),
//     fp.flatten,
//     fp.map(e => {
//         e.start = e.start.replace('#站', '-').replace(/\s/, '');
//         if (_.includes(e.start, '备')) {
//             return {
//                 start: _.replace(e.start, /[\(（]备[）)]/, ''),
//                 end: e.end,
//                 isBackup: true
//             }
//         }
//         else if (_.includes(e.start, '主')) {
//             return {
//                 start: _.replace(e.start, /[\(（]主[）)]/, ''),
//                 end: e.end,
//                 isBackup: false
//             }
//         } else return e;
//     })
// )(distributionPanelObjs);

Promise.map(station_edges_objs, function (e) {
    return knex('device_node').where({ name: e.start }).select('id')
        .then(function (startIds) {
            return knex('device_node').where({ name: e.end }).select('id')
                .then(function (endIds) {
                    if (_.isEmpty(startIds) || _.isEmpty(endIds))
                        return null;
                    else
                        return {
                            start: startIds[0]['id'],
                            end: endIds[0]['id'],
                            is_backup: e.isBackup
                        }
                });
        });
})
    .then(function (res) {
        return knex.batchInsert('edges', _.compact(res), 100)
            .then(() => {
                console.log('seeding complete!!!');
                process.exit();
            })
            .catch(e => console.error(e));
    });