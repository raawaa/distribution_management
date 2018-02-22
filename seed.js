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


const xlsx = require('node-xlsx'); 
const path = require('path');
const fs = require('fs');
const mkdirp=require('mkdirp');
// const sqlite3 =require('sqlite3').verbose;
const knex = require('knex')({
    dialect: 'sqlite3',
    connection: {
        filename: path.join(__dirname, DB_DIRNAME, TEST_DB_NAME)
    }
});


mkdirp(path.join(__dirname,DATA_SOURCE_DIRNAME,STATION_DIRNAME),function mkDataSourceDirStation(err,made) {
    if(err) console.error(`Error when creating data source dir (station).`);
    else console.log(`Data source dir(station) created!`); 
});

mkdirp(path.join(__dirname,DATA_SOURCE_DIRNAME,DISTRIBUTION_ROOM_DIRNAME),function mkDataSourceDirDistribution(err,made) {
    if(err) console.error(`Error when creating data source dir (distribution).`);
    else console.log(`Data source dir(distribution) created!`); 
});

try { fs.accessSync(path.join(__dirname, DB_DIRNAME)) }
catch (err) {
    console.log(`数据库文件夹不存在，将自动创建。`);
    fs.mkdir(path.join(__dirname, DB_DIRNAME),err=>{
        if (err) {
           console.error(`新建数据库文件夹出错：`,err); 
        }
        console.log(`新建数据库文件夹：`,path.join(__dirname,DB_DIRNAME));
    });
}

// 删除现有测试数据库

// Parse 变电站数据

// Parse 强电间数据