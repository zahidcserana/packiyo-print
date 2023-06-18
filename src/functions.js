const fs = require('fs');
const axios = require('axios');
const http = require('follow-redirects').http;
const printer = require('@thiagoelg/node-printer');
const configs = require('../configs.js');
const https = require('follow-redirects').https;
const os = require('os');
const { execFile } = require('child_process');
const Store = require('electron-store');
const store = new Store();
const userData = store.get('userData') + '/';

module.exports = {
    jobsCompletedIds: [],
    jobsInQueueIds: [],

    getPrintersData: function() {
        return printer.getPrinters().map(printer => {
            printer.hostname = os.hostname();

            return printer;
        });
    },
    getPrinterNames: function() {
        return module.exports.getPrintersData().map(printer => {
            return printer.name;
        })
    },
    sendPrintersData: function(printersStr) {
        document.getElementById('progress').innerHTML = 'Updating your printers data...';
        module.exports.saveLog('(>>) Updating printers data...');

        axios
            .post(localStorage.getItem('apiURL') + '/printers/import',{
                    printers: printersStr,
                    customer_id: localStorage.getItem('userCustomer')
                },
                {
                    headers: JSON.parse(localStorage.getItem('axiosHeaders'))
                })
            .then(res => {
                setInterval(function() {
                    module.exports.getPrintJobs();
                }, configs.requestInterval);
            })
            .catch(error => {
                module.exports.saveLog(error)
            });
    },
    getPrintJobs: function () {
        document.getElementById('progress').innerHTML = 'Getting print jobs...';
        module.exports.saveLog('(<<) Getting print jobs...');
        axios.get(
            localStorage.getItem('apiURL') + '/printers/userPrintersAndJobs',
            {
                headers: JSON.parse(localStorage.getItem('axiosHeaders'))
            }
        )
        .then(res => {
            module.exports.printJobs(res.data.data);
        })
        .catch(error => {
            module.exports.saveLog(error)
        });
    },
    printJobs: function (printersAndJobs) {
        module.exports.showPrinterJobStats();

        printersAndJobs.map(function(data) {
            let hostname = data.attributes.hostname;
            let printerName = data.attributes.name;
            let printerJobs = data.attributes.jobs;

            if (hostname == os.hostname() && module.exports.getPrinterNames().includes(printerName)) {
                module.exports.saveLog('(OK) Printer: '+printerName + ', Jobs: ' + printerJobs.length);

                printerJobs.forEach(function (job) {
                    let jobStatus = job.status;

                    if (jobStatus != configs.jobFinishedStatus) {
                        module.exports.setJobInQueue(job.id);
                    }
                });

                printerJobs.map(function (job) {
                    let printerJobId = job.id;
                    let printerJobJobStart = job.job_start;
                    let printerJobSystemId = job.job_id_system;
                    let jobStatus = job.status;
                    let jobType = job.type;

                    if (!jobType) {
                        jobType = 'pdf';
                    }

                    let filePath = job.url;

                    module.exports.saveLog('(OK) Job id ' + printerJobId + ' ' + filePath + ' ' + printerName);

                    if (printerJobJobStart == null) {
                        document.getElementById('progress').innerHTML = 'Copying the file';
                        module.exports.saveLog('(<<) Copying the file: ', filePath);
                        module.exports.copyFileThenPrint(filePath, configs.wmsFolder + '/' + configs.printFilesFolder + '/' + printerJobId + '.' + jobType, printerName, printerJobId, jobType);
                    } else {
                        if (jobStatus != configs.jobFinishedStatus) {
                            document.getElementById('progress').innerHTML = 'Updating job status ' + printerJobSystemId;
                            module.exports.saveLog('(<<) Checking the job status: printer=' + printerName + ' - job id=' + printerJobSystemId);

                            try {
                                let printJobSystemData = printer.getJob(printerName, parseInt(printerJobSystemId));
                                jobStatus = printJobSystemData.status[0];
                            } catch (error) {
                                // on windows the jobs are removed after being done.
                                console.error('(!) Job status error', '#' + printerJobSystemId + ' Printer job not found. Must be finished');
                                jobStatus = configs.jobFinishedStatus;
                            }

                            module.exports.saveLog('(>>) Setting job status ', jobStatus);
                            module.exports.setPrinterJobStatus(printerJobId, jobStatus);
                        }
                    }
                });
            }

            document.getElementById('progress').innerHTML = 'Done';
        });
    },

    copyFileThenPrint: function (fromPath, toPath, printerName, printerJobId, jobType) {
        const lockPath = toPath + '.lock';

        if (fs.existsSync(userData + lockPath)) {
            module.exports.saveLog('Lock file exists, skipping');

            return;
        }

        fs.writeFileSync(userData + lockPath, '');
        module.exports.saveLog('(<<) Trying to download the file ' + fromPath);

        downloadCallback = function(response) {
            if (response.statusCode === 200) {
                let file = fs.createWriteStream(userData + toPath);
                file.on('close', function() {
                    module.exports.saveLog('(OK) ' + fromPath + ' downloaded to ' + toPath);
                    module.exports.printTheFile(printerName, toPath, printerJobId, jobType);
                });
                response.pipe(file);
            } else {
                module.exports.saveLog('(!) Failed with the code '+response.statusCode);
            }
        };

        if (fromPath.startsWith('https')) {
            https.get(fromPath, downloadCallback);
        } else {
            http.get(fromPath, downloadCallback);
        }
    },

    setPrinterJobStatus: function(jobId, jobStatus) {
        let jobFinished = 0;

        if (jobStatus == configs.jobFinishedStatus) {
            jobFinished = 1;
        }

        module.exports.saveLog('(>>) Setting the printer job (' + jobId + ') status to ' + jobStatus);
        axios
            .post(localStorage.getItem('apiURL') + '/printers/jobs/' + jobId + '/status',{
                status: jobStatus,
                job_end: jobFinished
            }, {
                headers: JSON.parse(localStorage.getItem('axiosHeaders'))
            })
            .then(res => {
                module.exports.saveLog('(OK) Done setting status');
            })
            .catch(error => {
                module.exports.saveLog(error)
            });
    },

    printTheFile: function (printerName, fileName, printerJobId, jobType) {
        document.getElementById('progress').innerHTML = 'Creating the print job...';
        module.exports.saveLog('[P] Trying to print file: ' + fileName + ' on ' + printerName);

        if (process.platform != 'win32') {
            module.exports.saveLog('Printing using printFile: ' + fileName + ' on ' + printerName);

            printer.printFile(
                {
                    filename: userData + fileName,
                    printer: printerName,
                    success: function(jobID) {
                        document.getElementById('progress').innerHTML = 'Printing the file...';
                        module.exports.saveLog('(<<) Sent to printer with local ID: ' + jobID);
                        module.exports.setPrinterJobStart(printerJobId, jobID);
                    },
                    error: function(err) {
                        module.exports.saveLog('Got error: ' + err);
                    }
                }
            );
        } else if (jobType == 'zpl') {
            module.exports.saveLog('Printing using printDirect: ' + fileName + ' on ' + printerName);

            printer.printDirect({
                data: fs.readFileSync(userData + fileName),
                printer: printerName,
                success: function(jobID) {
                    document.getElementById('progress').innerHTML = 'Printing the file...';
                    module.exports.saveLog('(<<) Sent to printer with local ID: ' + jobID);
                    module.exports.setPrinterJobStart(printerJobId, jobID);
                },
                error: function(err) {
                    module.exports.saveLog('Got error: ' + err);
                }
              });
        } else {
            module.exports.saveLog('Printing using sumatrapdf: ' +  __dirname + '/../third_party/sumatrapdf.exe --print-to ' + printerName + ' ' + userData + fileName);

            document.getElementById('progress').innerHTML = 'Printing the file...';

            let sumatrapdfPath = __dirname + '/../third_party/sumatrapdf.exe';

            execFile(sumatrapdfPath, ['-print-to', printerName, userData + fileName], (error, stdout, sterr) => {
                module.exports.saveLog('Error: ' + error);
                module.exports.saveLog('Stdout: ' + stdout);
                module.exports.saveLog('Stderr: ' + sterr);
            });

            module.exports.setPrinterJobStart(printerJobId, -1);
        }
    },

    setPrinterJobStart: function (jobId, jobIdSystem) {
        module.exports.setJobCompleted(jobId);

        module.exports.saveLog('(>>) Setting the printer job ' + jobId + ' start date');
        axios
            .post(localStorage.getItem('apiURL') + '/printers/jobs/' + jobId + '/start',{
                job_id_system: jobIdSystem
            }, {
                headers: JSON.parse(localStorage.getItem('axiosHeaders'))
            })
            .then(res => {
                module.exports.saveLog('(OK) Done setting start date');
            })
            .catch(error => {
                module.exports.saveLog(error)
            });
    },

    showPrinterJobStats: function () {
        document.getElementById('jobs-in-queue-stat').innerHTML = 'Print jobs in queue: ' + module.exports.jobsInQueueIds.length;
        document.getElementById('jobs-completed-stat').innerHTML = 'Total print jobs completed: ' + module.exports.jobsCompletedIds.length;
    },

    setJobInQueue: function (jobId) {
        if (module.exports.jobsInQueueIds.indexOf(jobId) == -1 && module.exports.jobsCompletedIds.indexOf(jobId) == -1) {
            module.exports.jobsInQueueIds.push(jobId);
        }

        module.exports.showPrinterJobStats();
    },

    setJobCompleted: function (jobId) {
        let jobIndex = module.exports.jobsInQueueIds.indexOf(jobId);
        if (jobIndex > -1) {
            module.exports.jobsInQueueIds.splice(jobIndex, 1);
        }

        jobIndex = module.exports.jobsCompletedIds.indexOf(jobId);
        if (jobIndex == -1) {
            module.exports.jobsCompletedIds.push(jobId);
        }

        module.exports.showPrinterJobStats();
    },

    saveLog : function (message) {
        console.log(message);
        const date = new Date();
        const filename = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, 0) + '-' + String(date.getDate()).padStart(2, 0) + '.log';
        const filepath = userData + configs.wmsFolder + '/' + configs.logsFolder + '/' + filename;

        fs.appendFile(filepath, '[' + date.toISOString() + ']' + ' ' + message + '\r\n', function() {

        });
    }
};
