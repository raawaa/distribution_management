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
    }
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

// console.log(stationDeviceObjs);
// parse station #1 rows
function parseRow1(row) {
    let compactRow = _.tail(row);
    return {
        name: '1-' + compactRow[0] || null,
        original_name: compactRow[1],
        tag_name: compactRow[3],
        position: '1#变电站'
    }
}

function parseRow2(row) {
    return {
        name: '2-' + row[2],
        original_name: row[3],
        tag_name: row[4],
        breaker_type: row[6],
        rated_current: row[7],
        ct_ratio: row[8],
        position: '2#变电站'
    }
}


// Parse 强电间数据
const distributionPanelFiles = fs.readdirSync(path.join(__dirname, DATA_SOURCE_DIRNAME, DISTRIBUTION_ROOM_DIRNAME)).map(filename => path.join(__dirname, DATA_SOURCE_DIRNAME, DISTRIBUTION_ROOM_DIRNAME, filename));
const distributionPanelObjs = fp.flow(
    fp.map(file => xlsx.parse(file)),
    _.flatten,
    fp.map(sheetObj => sheetObj.data),
    fp.reject(_.isEmpty),                               // rm empty sheets
    fp.map(sheet => sheet.map(row => _.compact(row))),  // rm empty cells
    fp.map(sheet => _.reject(sheet, _.isEmpty)),        // rm empty rows
    fp.map(sheet => _.take(sheet, 4)),                  // take rows containing panel info only
    fp.map(sheet => ({ name: sheet[0][0] || null, position: sheet[1][1] || null, breaker: sheet[3][1] || null }))
)(distributionPanelFiles);
// TODO: regulate panel name

knex.schema.hasTable('distribution_panels')
    .then(function (exists) {
        if (!exists) {
            return knex.schema.createTable('distribution_panels', function (table) {
                table.increments();
                table.string('name');
                table.string('breaker');
                table.string('position');
            });
        }
    })
    .then(() => knex('distribution_panels').insert(distributionPanelObjs))
    .then(res => console.log(res));

