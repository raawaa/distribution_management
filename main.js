const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const url = require('url')
const _ = require('lodash')
const Promise = require('bluebird')

const TEST_DB_NAME = "database_test.db";
const DB_DIRNAME = "DATA";
const DATA_SOURCE_DIRNAME = "data_source";
const STATION_DIRNAME = "station";
const DISTRIBUTION_ROOM_DIRNAME = "distribution_room";

console.log(app.getPath('userData'));

const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, DB_DIRNAME, TEST_DB_NAME)
        // filename:path.join(app.getPath('userData'),TEST_DB_NAME)
    },
    useNullAsDefault: true
});
let win;

const createWindow = () => {
    win = new BrowserWindow({
        width: 600,
        height: 300,
        minWidth: 500,
        minHeight: 200,
        acceptFirstMouse: true,
        webPreferences:{
            devTools:true
        }
    });
    win.webContents.openDevTools();
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src', 'index.html'),
        protocol: 'file',
        slashes: true
    }));

    win.on('closed', () => {
        win = null;
    })
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
})

ipcMain.on('search', (event, arg) => {
    knex.select().from('device_node').where('name', 'like', '%' + arg + '%').orWhere('tag_name', 'like', '%' + arg + '%').timeout(2000).then(res => {
        event.sender.send('search-result', res);
    })
})

ipcMain.on('getItemDetail', (event, arg) => {
    // console.log(arg);
    // knex.select().from('device_node').where({ id: arg.id }).timeout(2000)

    //     .then(res => {
    //         let detailWin = new BrowserWindow({
    //             title: res.name
    //         });
    //         detailWin.loadURL(url.format({
    //             pathname: path.join(__dirname, 'src', 'detail.html'),
    //             protocol: "file",
    //             slashes: true
    //         }));
    //         detailWin.webContents.on('did-finish-load', () => {
    //             detailWin.webContents.send('itemDetail', res);
    //         });
    //     })

    let detailWin = new BrowserWindow({
        title: "detail"
    });
    detailWin.loadURL(url.format({
        pathname: path.join(__dirname, 'src', 'detail.html'),
        protocol: "file",
        slashes: true
    }));
    detailWin.webContents.on('did-finish-load', () => {
        // bfsUp(arg.id).then(res => {
        //     console.log('res: ', res);
        //     detailWin.webContents.send('itemDetail', res);
        // })
        console.log('start bfs');
        knex.select().from('device_node').where({ id: arg.id }).timeout(2000).then((res) => {
            return bfsUp(arg.id).then((dagDataUp) => {
                return bfsDown(arg.id).then(dagDataDown => {
                    // console.log('dataFromChannel:', data);
                    console.log('downData',dagDataDown);
                    detailWin.webContents.send('itemDetail',
                        {
                            deviceInfo: res[0], dagData: {
                                nodes: _.concat(dagDataUp.nodes, dagDataDown.nodes),
                                edges: _.concat(dagDataUp.edges, dagDataDown.edges)
                            }
                        });
                });
            });
        });
    });
});

function bfsUp(startId) {

    let queue = [startId];
    let nodeIds = [startId];
    let edges = [];
    let nodes = [];

    function doG(id) {
        return knex.select().from('edges').where({ end: id }).timeout(2000)
            .then(res => {
                // console.log(res)
                if (_.isEmpty(res)) {
                    // console.log('no parents')
                    return null;
                } else {
                    edges = _.concat(edges, res);
                    nodeIds = _.concat(nodeIds, _.map(res, x => x.start));
                    // console.log('nodes:', nodeIds);
                    return Promise.map(res, edge => doG(edge.start));
                }
            })
            .then(() => {
                // console.log('end of bfs');
                // console.log({ nodeIds, edges });
                return { nodeIds, edges };
            })
            .then(() => {
                return Promise.map(nodeIds, nodeId => {
                    return knex.select().from('device_node').where({ id: nodeId }).timeout(2000)
                        .then(res => {
                            nodes.push(res[0]);
                        });
                });
            })
            .then(() => {
                console.log(nodes, edges);
                return { nodes, edges };
            });
    }
    return doG(startId);
};


function bfsDown(startId) {

    let queue = [startId];
    let nodeIds = [startId];
    let edges = [];
    let nodes = [];

    function doG(id) {
        return knex.select().from('edges').where({ start: id }).timeout(2000)
            .then(res => {
                // console.log(res)
                if (_.isEmpty(res)) {
                    // console.log('no parents')
                    return null;
                } else {
                    edges = _.concat(edges, res);
                    nodeIds = _.concat(nodeIds, _.map(res, x => x.end));
                    // console.log('nodes:', nodeIds);
                    return Promise.map(res, edge => doG(edge.end));
                }
            })
            .then(() => {
                // console.log('end of bfs');
                // console.log({ nodeIds, edges });
                return { nodeIds, edges };
            })
            .then(() => {
                return Promise.map(nodeIds, nodeId => {
                    return knex.select().from('device_node').where({ id: nodeId }).timeout(2000)
                        .then(res => {
                            nodes.push(res[0]);
                        });
                });
            })
            .then(() => {
                console.log(nodes, edges);
                return { nodes, edges };
            });
    }
    return doG(startId);
};

