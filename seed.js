// data and data source folders:
// - DB_DIRNAME
// - DATA_SOURCE_DIRNAME
//   + STATION_DIRNAME
//   + DISTRIBUTION_ROOM_DIRNAME

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
// const sqlite3 =require('sqlite3').verbose;

// 删除现有测试数据库
try {
    fs.unlinkSync(path.join(__dirname, DB_DIRNAME, TEST_DB_NAME));
} catch (error) {
    if (error.code !== 'ENOENT') {
        console.error(`Error when delete existed test db: `, error);
        process.exit(1);
    }
}

const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, DB_DIRNAME, TEST_DB_NAME)
    },
    useNullAsDefault: true
});

mkdirp.sync(path.join(__dirname, DATA_SOURCE_DIRNAME, STATION_DIRNAME));

mkdirp.sync(path.join(__dirname, DATA_SOURCE_DIRNAME, DISTRIBUTION_ROOM_DIRNAME));

try { fs.accessSync(path.join(__dirname, DB_DIRNAME)) }
catch (err) {
    console.log(`数据库文件夹不存在，将自动创建。`);
    fs.mkdir(path.join(__dirname, DB_DIRNAME), err => {
        if (err) {
            console.error(`新建数据库文件夹出错：`, err);
        }
        console.log(`新建数据库文件夹：`, path.join(__dirname, DB_DIRNAME));
    });
}


// Parse 变电站数据

const stationFiles = fs.readdirSync(path.join(__dirname, DATA_SOURCE_DIRNAME, STATION_DIRNAME)).map(file => path.join(__dirname, DATA_SOURCE_DIRNAME, STATION_DIRNAME, file));
const stationDeviceSheetObjs = fp.flow(
    fp.map(file => xlsx.parse(file)),
    fp.flatten,                             // to array of sheets
    // fp.slice(0)(2)
    // JSON.stringify,
    // console.log
)(stationFiles);

const stationDeviceObjs = fp.flow(
    fp.map(sheetObj => {
        if (sheetObj.name == "一号站") return fp.flow(fp.tail, fp.map(parseRow1))(sheetObj.data);
        else if (sheetObj.name == '二号站') return fp.flow(fp.tail, fp.map(parseRow2))(sheetObj.data);
        else return null;
    }),
    fp.compact,
    fp.flatten)(stationDeviceSheetObjs);

function parseRow1(row) {
    let compactRow = _.tail(row);
    return {
        name: '1-' + compactRow[0] || null,
        original_name: compactRow[1] || null,
        tag_name: compactRow[3] || null,
        position: '1#变电站'
    }
}

function parseRow2(row) {
    return {
        name: '2-' + row[2] || null,
        original_name: row[3] || null,
        tag_name: row[4] || null,
        breaker_type: row[6] || null,
        rated_current: row[7] || null,
        ct_ratio: row[8] || null,
        position: '2#变电站'
    }
}


// Parse 强电间数据
const distributionPanelFiles = fs.readdirSync(path.join(__dirname, DATA_SOURCE_DIRNAME, DISTRIBUTION_ROOM_DIRNAME)).map(filename => path.join(__dirname, DATA_SOURCE_DIRNAME, DISTRIBUTION_ROOM_DIRNAME, filename));
let distributionPanelObjs = fp.flow(
    fp.map(file => xlsx.parse(file)),
    _.flatten,
    fp.map(sheetObj => sheetObj.data),
    fp.reject(_.isEmpty),                               // rm empty sheets
    fp.map(sheet => sheet.map(row => _.compact(row))),  // rm empty cells
    fp.map(sheet => _.reject(sheet, _.isEmpty)),        // rm empty rows
    // fp.map(sheet => _.take(sheet, 4)),                  // take rows containing panel info only
    fp.map(sheet => {
        // console.debug(sheet);
        return {
            panelInfo: {
                name: sheet[0][0] || null,
                position: sheet[1][1] || null,
                breaker_type: sheet[3][1] || null,
                parents: sheet[2][1] || null
            },
            panelMcbs: _.drop(sheet, 6).map(row => {
                return {
                    name: row[0],
                    breaker_type: row[1],
                    tag_name: row[2],
                    position: sheet[0][0]
                }
            })
        }
    })
)(distributionPanelFiles);
// TODO: regulate panel name


/* parse edges
edge obj:
{
    start: device node name,
    end: panel name
} */

let edgeObjs = fp.flow(
    fp.map(x => ({ start: _.split(x.panelInfo.parents, /\s{2,}/), end: x.panelInfo.name, isBackup: null })),
    fp.map(edge => {
        let res = [];
        _.forEach(edge.start, s => {
            res.push({ start: s, end: edge.end })
        });
        return res;
    }),
    fp.flatten,
    fp.map(e => {
        e.start = e.start.replace('#站', '-').replace(/\s/, '');
        if (_.includes(e.start, '备')) {
            return {
                start: _.replace(e.start, /[\(（]备[）)]/, ''),
                end: e.end,
                isBackup: true
            }
        }
        else if (_.includes(e.start, '主')) {
            return {
                start: _.replace(e.start, /[\(（]主[）)]/, ''),
                end: e.end,
                isBackup: false
            }
        } else return e;
    })
)(distributionPanelObjs);

distributionPanelObjs = distributionPanelObjs.map(val => {
    let mcbs = [];
    val.panelMcbs.map(v => {
        if (_.includes(v.name, '-')) {
            re = /\s*Q(\d+)-Q?(\d+)\s*/i;
            let found = v.name.match(re);
            let start = _.toNumber(found[1]);
            let end = _.toNumber(found[2]);
            let range = _.range(start, end + 1).map(n => {
                let tmp = { ...v };
                tmp.name = 'Q' + n + '@' + v.position;
                mcbs.push(tmp);
            })
        } else {
            let tmp = { ...v };
            tmp.name = tmp.name + '@' + tmp.position;
            mcbs.push(tmp);
        }
    });
    return {
        panelInfo: val.panelInfo,
        panelMcbs: mcbs
    }
});


edgeObjs = _.concat(edgeObjs, _.reduce(distributionPanelObjs, (res, val, key) => {
    return _.concat(res, _.map(val.panelMcbs, x => ({
        start: x.position,
        end: x.name,
        is_backup: false

    })))
}, []));


// // seeding database
// knex.schema.hasTable('distribution_panels')
//     .then(function (exists) {
//         if (!exists) {
//             return knex.schema.createTable('distribution_panels', function (table) {
//                 table.increments();
//                 table.string('name');
//                 table.string('breaker');
//                 table.string('position');
//             });
//         }
//     })
//     .then(() => knex('distribution_panels').insert(distributionPanelObjs.map(x => ({
//         name: x.name,
//         breaker: x.breaker,
//         position: x.position
//     }))))
//     .then(
//         () => {
//         }

//     );


knex.schema.hasTable('device_node')
    .then(exists => {
        if (!exists) {
            return knex.schema.createTable('device_node', table => {
                table.increments();
                table.string('name');
                table.string('original_name');
                table.string('tag_name');
                table.string('breaker_type');
                table.string('rated_current');
                table.string('ct_ratio');
                table.string('position');
            });
        }
    })
    .then(() => {
        // console.debug('table created: device_node');
        // let inserting = knex('device_node').insert(stationDeviceObjs);
        return knex.batchInsert('device_node', stationDeviceObjs, 100);
    })
    .then(() => {
        return knex.batchInsert('device_node', _.map(distributionPanelObjs, x => ({
            name: x.panelInfo.name,
            tag_name: x.panelInfo.name,
            breaker_type: x.panelInfo.breaker_type,
            position: x.panelInfo.position
        })), 100);
    })
    .then(() => {
        return knex.batchInsert('device_node',
            _.reduce(distributionPanelObjs, (res, val, key) => {
                return _.concat(res, val.panelMcbs);
            }, []), 100);
    })
    .then(() => {
        Promise.map(edgeObjs, function (e) {
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
        }).then(function (res) {
            return knex.schema.hasTable('edges')
                .then(function (has) {
                    if (!has)
                        return knex.schema.createTable('edges', function (t) {
                            t.increments();
                            t.string('start');
                            t.string('end');
                            t.boolean('is_backup');
                        }).then(function () {
                            // return knex('edges').select();
                            return knex.batchInsert('edges', _.compact(res), 100)
                                .then(() => {
                                    console.log('seeding complete!!!');
                                    process.exit();
                                })
                                .catch(e => console.error(e));
                            // return knex.insert(res).into('edges').then();

                        });
                });
        });
    });