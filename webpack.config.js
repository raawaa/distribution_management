const path = require('path');
module.exports = {
    target: "electron-renderer",
    entry: {
        menu: "./src/menu.js",
        index: './src/index.js',
        detail: './src/detail.js'
    },
    // devtool: 'source-map',
    node: {
        __dirname: false
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue.esm.js'
        }
    }

};