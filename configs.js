module.exports = {
    env: 'development', // production, development
    projectDomain: 'packiyo.com',

    jobFinishedStatus: 'PRINTED',
    jobInQueueStatus: '',
    jobCanceledStatus: 'CANCELLED',

    wmsFolder: '/data',
    userIdFile: 'user_id.txt',
    userTokenFile: 'user_token.txt',
    userCustomerFile: 'user_customer.txt',
    wmsUrlFile: 'wms_url.txt',
    printFilesFolder: 'print',
    logsFolder: 'logs',
    requestInterval: 2000,
    source: 'printing'
};
