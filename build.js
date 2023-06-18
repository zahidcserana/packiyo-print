var electronInstaller = require('electron-winstaller');
const path = require('path');

console.log("Please wait. Packaging app..");

electronInstaller.createWindowsInstaller({
    appDirectory: './dist/Packiyo Printing Service-win32-x64',
    outputDirectory: './release-builds',
    authors: 'Packiyo Developers',
    exe: 'Packiyo Printing Service.exe',
    iconUrl: 'https://packiyo.com/icon.ico',
    loadingGif: path.resolve(__dirname, 'assets/images/loading.gif'),
}).then(() => {
    console.log("The installers of your application were succesfully created!");
}, (e) => {
    console.log(`Well, sometimes you are not so lucky: ${e.message}`)
});