const { remote, ipcRenderer } = require('electron')
const Menu = remote.Menu
const MenuItem = remote.MenuItem

const Vue = require('vue')

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
      let title = event.currentTarget.dataset.devicename;
      let detailWin = new remote.BrowserWindow({
        title,
        autoHideMenuBar: true
      });

      // alert('clicked');
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
