const fs = require('fs');
const axios = require('axios');
const configs = require('../configs.js');
const functions = require('./functions');
const Store = require('electron-store');
const store = new Store();
const userData = store.get('userData') + '/';

module.exports = {
    logout: function () {
        console.log('Logging out and deleting the folder ' + userData + configs.wmsFolder);
        fs.rmSync(userData + configs.wmsFolder, {recursive: true, force: true});
        localStorage.removeItem('userToken');
        window.location.replace("index.html");
    },
    back: function () {
        window.location.replace("customers.html");
    },
    setUrl: function(){
        const urlInput = document.getElementById("url").value;

        let url = urlInput.trim().toLowerCase();

        if (!url) {
            document.getElementById("error-message").innerHTML = '<p>Enter tenant name.</p>';
            document.getElementById("error-message").classList.add('fail');
            return;
        }

        if (!url.startsWith('http')) {
            if (configs.env == 'production') {
                url = 'https://' + url;
            } else {
                url = 'http://' + url;
            }
        }

        if (url.slice(-1) == '/') {
            url = url.slice(0, -1);
        }

        if (configs.env == 'production' && !url.includes(configs.projectDomain)) {
            url += '.' + configs.projectDomain;
        }

        localStorage.setItem('projectURL', url);
        localStorage.setItem('apiURL', url + '/api');

        window.location.replace("login.html");
    },
    login: function() {
        let email = document.getElementById("email").value;
        let password = document.getElementById("password").value;
        let source = configs.source;

        if (!email || !password) {
            document.getElementById("error-message").innerHTML = '<p>Enter email and password.</p>';
            document.getElementById("error-message").classList.add('fail');

            return;
        }

        axios
            .post(localStorage.getItem('apiURL') + '/login',{
                email: email,
                password: password,
                source: source
            }, {

            })
            .then(res => {
                let accessToken = res.data.user.access_token;

                localStorage.setItem('userToken', accessToken);
                localStorage.setItem('axiosHeaders', JSON.stringify(module.exports.setAxiosHeaders(accessToken)));

                window.location.replace("customers.html");
            })
            .catch(error => {
                if (!error) {
                    document.getElementById("error-message").innerHTML = '<p>Network error. Check if correct tenant name is entered.</p>';
                    document.getElementById("error-message").classList.add('fail');
                } else {
                    document.getElementById("error-message").innerHTML = '<p>Check if credentials are correct.</p>';
                    document.getElementById("error-message").classList.add('fail');
                }
            });
    },
    setAxiosHeaders: function(userToken){
        return {
            'Accept': 'application/json,application/vnd.api+json',
            'cache-control': 'no-cache',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + userToken
        };
    },
    runSetup: function(){
        if (localStorage.getItem('userToken') !== null) {
            window.location.replace("setup.html");
        }
    },
    askCustomer : function () {
        console.log('(<<) Getting customers...');

        axios.get(localStorage.getItem('apiURL') + '/customers',
            {
                headers: JSON.parse(localStorage.getItem('axiosHeaders'))
            }
        )
        .then(res => {
            let customers = [];
            let html = '';

            res.data.data.map(function(customer) {
                if (!customer.attributes.parent) {
                    customers.push(customer);
                }
            });

            if (customers.length > 1) {
                customers.map(function(customer) {
                    let id = customer.id;
                    let attributes = customer.attributes;
                    let contactInformation = attributes.contact_information;
                    let name = 'ID: ' + id + ' (no name)';

                    if (contactInformation !== null) {
                        name = contactInformation.name;
                    }

                    html += '<div class="row"><div class="col col-xxl-100 margin-bottom-15"><a class="customer-button button white-button small-button col-xxl-100" data-id="' + id + '">' + name + '</a></div></div>'
                });

                document.getElementById("customers").innerHTML = html;
            } else {
                module.exports.saveUserCustomer(customers[0].id);
            }
        })
        .catch(error => {
            console.log(error);
        });
    },
    saveUserCustomer : function(customerId) {
        console.log('(<<) Customer received, saving...');

        localStorage.setItem('userCustomer', customerId);
        window.location.replace("setup.html");
    },
    setupComplete : function() {
        console.log('(OK) Setup completed, running application');
        let printersData = functions.getPrintersData();
        functions.sendPrintersData(printersData);
    },
}
//
// logoutButton.addEventListener('clicked',
//     (checked) => {
//         alert('Clicked logout');
//         //module.exports.logout(win);
//     }
// );
