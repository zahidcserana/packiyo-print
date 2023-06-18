
// 1. Import Modules
const { MSICreator } = require('electron-wix-msi');
const path = require('path');


const APP_DIR = path.resolve(__dirname, './dist/PackiyoPrintingService-win32-x64');

const OUT_DIR = path.resolve(__dirname, './output');

// 3. Instantiate the MSICreator
const msiCreator = new MSICreator({
    appDirectory: APP_DIR,
    description: 'Packiyo Printing Services',
    exe: 'PackiyoPrintingService.exe',
    name: 'PackiyoPrintingService',
    manufacturer: 'Packiyo Developers',
    version: '1.0.5',
    outputDirectory: OUT_DIR,

    // Configure installer User Interface
    ui: {
        chooseDirectory: true
    },
});

// 4. Create a .wxs template file
msiCreator.create().then(function(){

    // Step 5: Compile the template to a .msi file
    msiCreator.compile();
});