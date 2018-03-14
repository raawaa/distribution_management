const path = require('path');
const { remote, ipcRenderer } = require('electron');
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

const Vue = require('vue').default;

const app = new Vue({
  el: '#app',
  data: {
    message: 'lellajsdfasdf',
    searchResults: null
  },
  methods: {
    fetchData: function (event) {
      ipcRenderer.send('search', event.target.value)
    },
    getItemDetail: function (event) {
      event.preventDefault();
      let name = event.currentTarget.dataset.devicename;
      let id = event.currentTarget.dataset.deviceid;
      let itemData = { id, name };
      // detailWin.loadURL(`file://${__dirname}/detail.html`)
      ipcRenderer.send('getItemDetail', itemData);

    }
  }
})

ipcRenderer.on('search-result', (event, arg) => {
  app.searchResults = arg;
})

// Build our new menu
var menu = new Menu()
menu.append(new MenuItem({
  label: 'Delete',
  click: function () {
    // Trigger an alert when menu item is clicked
    alert('Deleted')
  }
}))
menu.append(new MenuItem({
  label: 'More Info...',
  click: function () {
    // Trigger an alert when menu item is clicked
    alert('Here is more information')
  }
}))

// Add the listener
window.addEventListener('contextmenu', e => {
  e.preventDefault();
  menu.popup(remote.getCurrentWebContents())
}, false)
