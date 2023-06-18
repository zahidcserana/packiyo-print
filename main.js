const {app, BrowserWindow, Menu, Tray, shell } = require('electron');
const path = require('path');

if (handleSquirrelEvent()) {
    return;
}

function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            app.quit();
            return true;
    }
}

const AutoLaunch = require('auto-launch');
const Store = require('electron-store');
const configs = require("./configs");
const iconUrl = __dirname + '/assets/images/icon.png';
const iconSmallUrl = __dirname + '/assets/images/icon-small.png';
const userData = app.getPath('userData');
const store = new Store();
const isProduction = app.isPackaged;

let mainWindow = null;

const gotTheLock = app.requestSingleInstanceLock();

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: iconUrl
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', function (event) {
        if(!app.isQuiting && process.platform === 'win32'){
            event.preventDefault();
            mainWindow.hide();
        }

        return false;
    });

    store.set('userData', userData);

    buildMenu();
    toggleAutostart();
    buildTray();
}

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        });
    })
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

const buildTray = () => {
    let tray = new Tray(iconSmallUrl);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show', click: function () {
                mainWindow.show()
            }
        },
        {
            label: 'Quit', click: function () {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Packiyo Printing Service');
    tray.setContextMenu(contextMenu)
};

const toggleAutostart = (enable = null) => {
    if (!isProduction) return;

    if (enable === true) {
        store.set('autostartEnabled', 1)
    }

    if (enable === false) {
        store.delete('autostartEnabled')
    }

    const autostartEnabled = store.get('autostartEnabled');

    let autoLaunch = new AutoLaunch({
        name: 'Packiyo Printing Service',
        path: app.getPath('exe'),
    });

    autoLaunch.isEnabled().then((isEnabled) => {
        if (autostartEnabled) {
            if (!isEnabled) autoLaunch.enable();
        } else {
            if (isEnabled) autoLaunch.disable();
        }
    });
};

const buildMenu = () => {
    const autostartEnabled = store.get('autostartEnabled');

    const template = [
        {
            label: 'Menu',
            submenu: [
                {
                    label: 'Show log folder',
                    click: function() {
			let dir = userData + configs.wmsFolder + '/' + configs.logsFolder;
			dir = dir.replaceAll('/', path.sep);

                        return shell.openPath(dir);
                    }
                },
                isProduction ?
                    !autostartEnabled ? {
                        label: 'Enable Autostart',
                        click: function () {
                            toggleAutostart(true);
                        }
                    } : {
                        label: 'Disable Autostart',
                        click: function () {
                            toggleAutostart(false);
                        }
                    }
                : {
                    label: 'Dev Tools',
                    click: () => mainWindow.webContents.openDevTools()
                }
                ,
                { role: 'minimize' },
                {
                    label: 'Quit',
                    click: function () {
                        app.isQuiting = true;
                        app.quit();
                    }
                }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};
