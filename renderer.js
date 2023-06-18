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
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            app.quit();
            return true;
    }
}

const setupFunctions = require('./src/setup-functions');
const fs = require("fs");
const configs = require("./configs");
const Store = require('electron-store');
const store = new Store();
const userData = store.get('userData') + '/';

fs.mkdir(userData + configs.wmsFolder, { recursive: true }, (err) => {
    if (err) throw err;
    console.log('(OK) App folder created successfully.');
});

fs.mkdir(userData + configs.wmsFolder + '/' + configs.printFilesFolder, { recursive: true }, (err) => {
    if (err) throw err;
    console.log('(OK) Files folder created successfully.');
});

fs.mkdir(userData + configs.wmsFolder + '/' + configs.logsFolder, { recursive: true }, (err) => {
    if (err) throw err;
    console.log('(OK) Logs folder created successfully.');
});

const tenantForm = document.getElementById("tenantForm");

if (tenantForm) {
    tenantForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setupFunctions.setUrl();
    });
    setupFunctions.runSetup();
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setupFunctions.login();
    })
}

const customers = document.getElementById("customers");

if (customers) {
    setupFunctions.askCustomer();
}

const logoutButton = document.getElementById("logout-button");

if (logoutButton) {
    logoutButton.addEventListener("click", async (event) => {
        event.preventDefault();
        setupFunctions.logout();
    })
}

const backButton = document.getElementById("back-button");

if (backButton) {
    backButton.addEventListener("click", async (event) => {
        event.preventDefault();
        setupFunctions.back();
    })
}

const customerButton = document.getElementsByClassName("customer-button");

if (document.body.addEventListener){
    document.body.addEventListener('click',handleCustomerButton,false);
}

function handleCustomerButton(e){
    if (e.target.dataset['id'])
    {
        setupFunctions.saveUserCustomer(e.target.dataset['id']);
    }
}

const setup = document.getElementById("setup");

if (setup) {
    setupFunctions.setupComplete();
}

