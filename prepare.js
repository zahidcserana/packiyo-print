const fs = require("fs");
const printerJsPath = 'node_modules/@thiagoelg/node-printer/lib/printer.js';

let fileContents = fs.readFileSync(printerJsPath).toString();
fileContents = fileContents.replace("if(fs.existsSync(binding_path)) {\n" +
    "    printer_helper = require(binding_path);\n" +
    "} else {\n" +
    "    printer_helper = require('./node_printer_'+process.platform+'_'+process.arch+'.node');\n" +
    "}", "printer_helper = require('./node_printer.node');");

fs.writeFileSync(printerJsPath, fileContents);