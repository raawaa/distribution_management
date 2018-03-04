const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const url = require('url')

const TEST_DB_NAME = "database_test.db";
const DB_DIRNAME = "DATA";
const DATA_SOURCE_DIRNAME = "data_source";
const STATION_DIRNAME = "station";
const DISTRIBUTION_ROOM_DIRNAME = "distribution_room";
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, DB_DIRNAME, TEST_DB_NAME)
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
        acceptFirstMouse: true
    });
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
    knex.select().from('device_node').where('name', 'like', '%' + arg + '%').timeout(2000).then(res => {
        event.sender.send('search-result', res);
    })
})