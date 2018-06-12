/**
 * ABRelay
 *
 * Interface for communicating with the MobileCommCenter (MCC).
 *
 */

var RP = require('request-promise-native');
var _ = require('lodash');
var crypto = require('crypto');

// setup a timed request to poll for MCC data to process:

module.exports = {

    _formatRequest:function(method, dataField, opt) {

        var url = opt.url || '/';
        if (url[0] == '/') {
            url = sails.config.appbuilder.mcc.url + url;
        }

        var options = {
            method: method,
            uri: url,
            headers: {
                'authorization': sails.config.appbuilder.mcc.accessToken
            },
            json: true // Automatically stringifies the body to JSON
        };

        var data = opt.data || {};
        options[dataField] = data;

        return options;
    },


    get:function(opt) {

        var options = this._formatRequest('GET', 'qs', opt);
        return RP(options);
    },


    post:function(opt) {
         
        var options = this._formatRequest('POST', 'body', opt);
        return RP(options);
    },



    /**
     * _formatServerRequest
     * create the parameters necessary for us to pass the request on
     * to the CoreServer:
     * @param {obj} opt  the passed in request options
     * @param {ABRelayUser} relayUser the relayUser making this request.
     * @return {obj}
     */
    _formatServerRequest:function(opt, relayUser) {

        var method = opt.type || opt.method || 'GET';
        var dataField = 'body';

        switch(method) {
            case 'GET':
                dataField = 'qs';
                break;
            case 'POST':
                dataField = 'body';
                break;
        }

        var url = opt.url || '/';
        if (url[0] == '/') {
            url = sails.config.appbuilder.baseURL + url;
        }

        var options = {
            method: method,
            uri: url,
            headers: {
                'authorization': relayUser.publicAuthToken
            },
            json: true // Automatically stringifies the body to JSON
        };

        var data = opt.data || {};
        options[dataField] = data;

        return options;
    },


    /**
     * encrypt
     * return an AES encrypted blob of the stringified representation of the given
     * data.
     * @param {obj} data
     * @param {string} key  the AES key to use to encrypt this data
     * @return {string}
     */
    encrypt: function(data, key) {

        var encoded = "";

        if (data && key) {

            // Encrypt data
            var plaintext = JSON.stringify(data);
            var iv = crypto.randomBytes(16).toString('hex');

            var cipher = crypto.createCipheriv(
                'aes-256-cbc',
                Buffer.from(key, 'hex'),
                Buffer.from(iv, 'hex')
            );
            var ciphertext = cipher.update(plaintext, 'utf8', 'base64');
            ciphertext += cipher.final('base64');

            // <base64 encoded cipher text>:::<hex encoded IV>
            encoded = ciphertext.toString() + ':::' + iv;

        }

        return encoded;
    },


    /**
     * decrypt
     * return a javascript obj that represents the data that was encrypted
     * using our AES key.
     * @param {string} data
     * @return {obj}
     */
    decrypt: function(data, key) {

        var finalData = null;

        // Expected format of encrypted data:
        // <base64 encoded ciphertext>:::<hex encoded IV>
        var dataParts = data.split(':::');
        var ciphertext = dataParts[0];
        var iv = dataParts[1];

        try {
            
            var decipher = crypto.createDecipheriv(
                'aes-256-cbc', 
                Buffer.from(key, 'hex'), 
                Buffer.from(iv, 'hex')
            );
            var plaintext = decipher.update(ciphertext, 'base64', 'utf8');
            plaintext += decipher.final('utf8');
            
            // Parse JSON
            try {
                finalData = JSON.parse(plaintext);
            } catch (err) {
                finalData = plaintext;
            }


        } catch (err) {
            // could not decrypt
            sails.log.error('Unable to decrypt AES', err);
        }


        return finalData;

    },



    pollMCC:function() {
        return new Promise((resolve, reject)=>{

            // 1) get any key resolutions and process them
            ABRelay.get({url:'/mcc/initresolve'})
            .then((response)=>{

                var all = [];
                response.data.forEach((entry)=>{
                    all.push(ABRelay.resolve(entry))
                })

                return Promise.all(all)
            })

            // 2) get any message requests and process them
            .then(()=>{

                return ABRelay.get({url:'/mcc/relayrequest'})
                .then((response)=>{

                    var all = [];
                    response.data.forEach((request)=>{
                        all.push(ABRelay.request(request));
                    })
                    return Promise.all(all)
                })

            })
            .then(resolve)
            .catch((err)=>{

                // if err was related to a timeout :
                // var error = new Error('Server Timeout')
                // error.error = err;
                // error.code = 'E_SERVER_TIMEOUT'
                // reject(error);

                reject(err);
            });

        })
    },


    resolve:function(entry) {

        return Promise.resolve()
        // make sure we don't already have an entry with the same .appUUID
        // there should be only one, so don't add a duplicate:
        .then(()=>{

            return ABRelayAppUser.findOne({appUUID:entry.appUUID})
        })

        // find the ABRelayUser
        .then((existingAppUser)=>{

            // if we had an existing AppUser, PASS
            if (existingAppUser) {
                return null;
            }

            // otherwise continue on
            if (entry.user) {
                return ABRelayUser.findOne({user:entry.user});
            } else {
                return null;
            }
        })
        .then((relayUser)=>{
            if (relayUser) {

                var key = relayUser.rsa_private_key;
                try {
                    var plaintext = crypto.privateDecrypt(
                        {
                            key: key,
                            //padding: crypto.constants.RSA_NO_PADDING
                            padding: crypto.constants.RSA_PKCS1_PADDING
                            //padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
                        },
                        Buffer.from(entry.rsa_aes, 'base64')
                    );
                    if (plaintext) {
                        return { relayUser:relayUser, aes:plaintext.toString() };
                    } else {
                        return null;
                    }
                } catch (err) {
                    // could not decrypt
                    sails.log.error('Unable to decrypt RSA', err);
                    return null;
                }

            } else {

                return null;
            }

        })

        // Now create an AppUser entry connected to relayUser
        .then((values)=>{
            if (values) {

                var newAppUser = {
                    aes:JSON.parse(values.aes).aesKey,
                    appUUID:entry.appUUID,
                    appID:entry.appID
                }

                var relayUser = values.relayUser;
                relayUser.appUser.add(newAppUser);

                // I wish .save() was a promise
                return new Promise((resolve, reject)=>{

                    relayUser.save((err)=>{
                        if (err) {
                            ADCore.error.log('AppBuilder:ABRelay:.resolve():Unable to save New App User entry.', {error:err, newAppUser:newAppUser });
                            reject(err);
                            return;
                        }

                        resolve();
                    })
                });
            }
        })
    },



    request: function(request) {

        var appUser = null;
        var relayUser = null;

        return Promise.resolve()

        // 1) get the RelayAppUser from the given appUUID
        .then(()=>{

            return ABRelayAppUser.findOne({appUUID:request.appUUID})
            .populate('relayUser')
            .then((entry)=>{
                appUser = entry;
                relayUser = entry.relayUser;
// return entry;
            })
        })

        // 2) Decode the data:
        .then(()=>{

            return this.decrypt(request.data, appUser.aes);

        })

        // 3) use data to make server call:
        .then((params) => {

            // params should look like:
            // {
            //     type:'GET',
            //     url:'/path/to/url',
            //     data:{ some:data }
            // }

// Question:  should we also include :
//  .headers: { authorization:accessToken }  ??
    
            var options = this._formatServerRequest(params, relayUser);
            return RP(options);

        })

        // 4) encrypt the response:
        .then((response)=>{

            return this.encrypt(response, appUser.aes);
        })

        // 5) update MCC with the response for this request:
        .then((encryptedData)=>{

            var returnPacket = {
                appUUID:request.appUUID,
                data:encryptedData,
                jobToken:request.jobToken
            }
            return ABRelay.post({ url:'/mcc/relayrequest', data:returnPacket })
        })

        // that's it?
        
    }
   

};