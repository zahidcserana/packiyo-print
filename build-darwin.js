const createDMG = require('electron-installer-dmg');
const path = require('path');

console.log("Please wait. Packaging app..");

createDMG({
    appPath: './dist/PackiyoPrintingService-darwin-x64/PackiyoPrintingService.app',
    name: 'PackiyoPrintingService',
    out: './release-builds',
    icon: path.resolve(__dirname, 'assets/images/icon.icns'),
    iconSize: 80,
    background: path.resolve(__dirname, 'assets/images/packiyo-dmg.png'),
    title: 'Packiyo Printing Service',
    contents: [
        { x: 388, y: 200, type: 'link', path: '/Applications' },
        { x: 142, y: 210, type: 'file', path: path.resolve(__dirname, 'dist/PackiyoPrintingService-darwin-x64/PackiyoPrintingService.app') }
    ],
    overwrite: true
}).then(() => {
    console.log("The installers of your application were succesfully created!");
}, (e) => {
    console.log(`Well, sometimes you are not so lucky: ${e.message}`)
});