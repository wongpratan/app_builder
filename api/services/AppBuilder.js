/**
 * Generate models and controllers for AppBuilder apps.
 */

var fs = require('fs');
var path = require('path');
var AD = require('ad-utils');
var _ = require('lodash');
var moment = require('moment');
var uuid = require('node-uuid');

var reloadTimeLimit = 10 * 1000 * 60; // 10 minutes
var cliCommand = 'appdev';  // use the global appdev command


var appsBuildInProgress = {};  // a hash of deferreds for apps currently being built.
// {  ABApplication.id : dfd }


var __dfdBuildDirectoryCreated = null;


var DataFields = {};


function importDataFields(next) {
    var dataFieldPath = path.join(__dirname, 'data_fields');

    DataFields = {};

    var ignoreFiles = ['.DS_Store', 'dataFieldTemplate.js'];

    fs.readdir(dataFieldPath, function (err, files) {

        if (err) {
            ADCore.error.log('Service:AppBuilder:Error reading in Data Fields.', { error: err, path: dataFieldPath });
            next(err);
            return;
        }

        files.forEach(function (file) {

            // if not one of our ignored files:
            if (ignoreFiles.indexOf(file) == -1) {
                DataFields[path.parse(file).name] = require(path.join(dataFieldPath, file));
            }
        });

        next();

    })

}


function notifyToClients(reloading, step, action, options) {
    var data = {
        reloading: reloading
    };

    if (step)
        data.step = step;

    if (action)
        data.action = action;

    if (options)
        data.options = options;

    sails.sockets.blast('server-reload', data);
}

function getObjectModel(objectId) {
    var dfd = AD.sal.Deferred();
    ABObject.findOne({ id: objectId })
        .fail(function (err) { dfd.reject(err); })
        .then(function (result) { dfd.resolve(result); });

    return dfd;
}

function getPageKey(appName, pageName) {
    return ['opstools', appName, pageName.toLowerCase()].join('.'); // appName.pageName
}

module.exports = {

    buildDirectory: {

        init: function () {
            if (!__dfdBuildDirectoryCreated) {
                __dfdBuildDirectoryCreated = AD.sal.Deferred();
            }


            var bd = require('./build_directory/build_directory.js');
            bd(function (err) {
                sails.log.info('AppBuilder:buildDirectory:init()   started.');
                if (err) {
                    // console.log('... rejected!');
                    ADCore.error.log('AppBuilder:buildDirectory.init(): exited with an error', {
                        error: err,
                        message: err.message || 'no message provided',
                        stack: err.stack || ['no stack trace ']
                    });
                    __dfdBuildDirectoryCreated.reject(err);
                } else {
                    // console.log('... resolved.');
                    sails.log.info('AppBuilder:buildDirectory:init()  completed.');
                    __dfdBuildDirectoryCreated.resolve();
                }
            })


        },

        ready: function () {
            if (!__dfdBuildDirectoryCreated) {
                __dfdBuildDirectoryCreated = AD.sal.Deferred();
            }
            return __dfdBuildDirectoryCreated;
        }
    },

    /**
     * AppBuilder.paths
     *
     * methods to return specific paths for common items:
     */
    paths: {

        sailsBuildDir: function () {
            return path.join(sails.config.appPath, 'data', 'app_builder', 'sailsAlter');
        }
    },


    routes: {

        /**
         * @method AppBuilder.routes.verifyAndReturnObject
         * pulls the current ABApplication and ABObject from the provided input url parameters:
         * @param {request} req  sails.req object
         * @param {response} res sails.res object
         * @return {Promise}  .resolve( {ABObject} )
         */
        verifyAndReturnObject: function (req, res) {

            return new Promise(
                (resolve, reject) => {

                    var appID = req.param('appID', -1);
                    var objID = req.param('objID', -1);

                    sails.log.verbose('... appID:' + appID);
                    sails.log.verbose('... objID:' + objID);

                    // Verify input params are valid:
                    var invalidError = null;

                    if (appID == -1) {
                        invalidError = ADCore.error.fromKey('E_MISSINGPARAM');
                        invalidError.details = 'missing application.id';
                    } else if (objID == -1) {
                        invalidError = ADCore.error.fromKey('E_MISSINGPARAM');
                        invalidError.details = 'missing object.id';
                    }
                    if (invalidError) {
                        sails.log.error(invalidError);
                        res.AD.error(invalidError, 400);
                        reject();
                    }


                    ABApplication.findOne({ id: appID })
                        .then(function (app) {

                            if (app) {

                                var Application = app.toABClass();
                                var object = Application.objects((o) => { return o.id == objID; })[0];

                                if (object) {

                                    resolve(object);

                                } else {

                                    // error: object not found!
                                    var err = ADCore.error.fromKey('E_NOTFOUND');
                                    err.message = "Object not found.";
                                    err.objid = objID;
                                    sails.log.error(err);
                                    res.AD.error(err, 404);
                                    reject();
                                }

                            } else {

                                // error: couldn't find the application
                                var err = ADCore.error.fromKey('E_NOTFOUND');
                                err.message = "Application not found.";
                                err.appID = appID;
                                sails.log.error(err);
                                res.AD.error(err, 404);
                                reject();
                            }

                        })
                        .catch(function (err) {
                            ADCore.error.log('ABApplication.findOne() failed:', { error: err, message: err.message, id: appID });
                            res.AD.error(err);
                            reject();
                        });

                }
            )

        }

    },


    /**
     * AppBuilder.rules
     *
     * A set of rules for AppBuilder objects.
     */
    rules: {

        /**
         * AppBuilder.rules.nameFilter
         *
         * return a properly formatted name for an AppBuilder object.
         *
         * @param {string} name  The name of the object we are conditioning.
         * @return {string}
         */
        nameFilter: function (name) {
            return String(name).replace(/[^a-z0-9]/gi, '');
        },


        /**
         * AppBuilder.rules.toApplicationNameFormat
         *
         * return a properly formatted Application Name
         *
         * @param {string} name  The name of the Application we are conditioning.
         * @return {string}
         */
        toApplicationNameFormat: function (name) {
            return 'AB_' + AppBuilder.rules.nameFilter(name);
        },


        /**
         * AppBuilder.rules.toObjectNameFormat
         *
         * return a properly formatted Object/Table Name
         *
         * @param {string} appName  The name of the Application for this object
         * @param {string} objectName  The name of the Object we are conditioning.
         * @return {string}
         */
        toObjectNameFormat: function (appName, objectName) {
            return (appName + '_' + AppBuilder.rules.nameFilter(objectName));
        },


        /**
         * AppBuilder.rules.toSQLDateTime
         *
         * return a properly formatted DateTime string for MYSQL 5.7
         *
         * @param {string} date  String of a date you want converted
         * @return {string}
         */
        toSQLDateTime: function (date) {
            return moment.utc(date).format('YYYY-MM-DD HH:mm:ss');
        },


        /**
         * AppBuilder.rules.SQLDateTimeRegExp
         * 
         * property is a regular expression to validate SQL DateTime format
         */
        SQLDateTimeRegExp: '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$',

        /**
         * AppBuilder.rules.toFieldRelationFormat
         *
         * This function uses for define relation name of Knex Objection
         * return a relation name of column
         *
         * @param {string} colName  The name of the Column
         * @return {string}
         */
        toFieldRelationFormat: function (colName) {
            return AppBuilder.rules.nameFilter(colName) + '__relation';
        },


        /**
         * AppBuilder.rules.toJunctionTableNameFormat
         * 
         * return many-to-many junction table name
         * 
         * @param {string} appName  The name of the Application for this object
         * @param {string} sourceTableName  The name of the source object we are conditioning.
         * @param {string} targetTableName  The name of the target object we are conditioning.
         * @param {string} colName
         * @return {string}
         */
        toJunctionTableNameFormat: function (appName, sourceTableName, targetTableName, colName) {
            // The maximum length of a table name in MySql is 64 characters
            appName = this.toApplicationNameFormat(appName);
            if (appName.length > 17)
                appName = appName.substring(0, 17);

            if (sourceTableName.length > 15)
                sourceTableName = sourceTableName.substring(0, 15);

            if (targetTableName.length > 15)
                targetTableName = targetTableName.substring(0, 15);

            colName = this.nameFilter(colName);
            if (colName.length > 14)
                colName = colName.substring(0, 14);

            return '{appName}_{sourceName}_{targetName}_{colName}'
                .replace('{appName}', appName)
                .replace('{sourceName}', sourceTableName)
                .replace('{targetName}', targetTableName)
                .replace('{colName}', colName);
        }
    },


    // getApplicationName: function (name) {
    //     return 'AB_' + AppBuilder.rules.nameFilter(name);
    // },

    /**
     * Reload Sails controllers, routes, and models.
     *
     * @return Deferred
     */
    reload: function (appID) {
        var dfd = AD.sal.Deferred();

        var timeout = setTimeout(function () {
            dfd.reject(new Error('reload timed out'));
        }, reloadTimeLimit);

        var env1 = sails.config.environment,
            env2 = process.env.NODE_ENV;

        var appFolders = [];

        // Notify all clients that the server is reloading
        notifyToClients(true);

        async.auto({


            // lift sails in our new build directory:
            alterModels: ['setup', function (next) {


                var cwd = process.cwd();
                process.chdir(AppBuilder.paths.sailsBuildDir());

                // collect any errors that might be posted in the process:
                var errors = [];


                AD.spawn.command({
                    command: 'sails',
                    options: ['lift'],
                    shouldEcho: false,
                    onStdErr: function (data) {

                        if (data.indexOf('Error:') != -1) {
                            var lines = data.split('\n');
                            lines.forEach(function (line) {
                                if (line.indexOf('Error:') != -1) {
                                    errors.push(line);
                                }
                            })
                        }
                    }
                    // exitTrigger:'Server lifted'
                })
                    .fail(function (err) {
                        AD.log.error('<red> sails lift exited with an error</red>');
                        AD.log(err);
                        process.chdir(cwd);
                        next(err);
                    })
                    .then(function (code) {
                        // console.log('... exited with code:', code);
                        var error = undefined;

                        if (code > 0) {
                            error = new Error(errors.join(''));
                        }
                        process.chdir(cwd);
                        next(error);
                    });


            }],


            find: function (next) {
                notifyToClients(true, 'findApplication', 'start');

                ABApplication.find({ id: appID })
                    .then(function (list) {
                        if (!list || !list[0]) {
                            throw new Error('no apps found');
                        }
                        for (var i = 0; i < list.length; i++) {
                            appFolders.push('ab_' + AppBuilder.rules.nameFilter(list[i].name).toLowerCase());
                        }
                        next();

                        notifyToClients(true, 'findApplication', 'done');

                        return null;
                    })
                    .catch(next);
            },

            // Run setup.js for every AB application
            setup: ['find', function (next) {
                notifyToClients(true, 'prepareFolder', 'start');

                var cwd = process.cwd();
                async.eachSeries(appFolders, function (folder, ok) {
                    try {
                        process.chdir(path.join(cwd, 'node_modules', folder));
                    } catch (err) {
                        console.log('Folder not found: ' + folder);
                        return ok();
                    }

                    // Can't just require() it, because it's not guaranteed to
                    // execute after the first time, due to caching.
                    AD.spawn.command({
                        command: 'node',
                        options: [
                            path.join('setup', 'setup.js')
                        ]
                    })
                        .fail(ok)
                        .done(function () {
                            ok();
                        })

                }, function (err) {
                    process.chdir(cwd);

                    if (err) next(err);
                    else {
                        notifyToClients(true, 'prepareFolder', 'done');
                        next();
                    }
                });
            }],

            controllers: ['setup', function (next) {
                sails.log('Reloading controllers');

                notifyToClients(true, 'reloadControllers', 'start');

                sails.hooks.controllers.loadAndRegisterControllers(function () {
                    notifyToClients(true, 'reloadControllers', 'done');

                    next();
                });
            }],

            /*
            i18n: ['controllers', function(next) {
                sails.log('Reloading i18n');
                sails.hooks.i18n.initialize(function() {
                    next();
                });
            }],

            services: ['controllers', function(next) {
                sails.log('Reloading services');
                sails.hooks.services.loadModules(function() {
                    next();
                });
            }],
            */

            orm: ['setup', 'alterModels', function (next) {
                sails.log('Reloading ORM');

                notifyToClients(true, 'reloadORM', 'start');

                // Temporarily set environment to development so Waterline will
                // respect the migrate:alter setting

                // NOTE: now we manuall lift sails in another process to do this:
                // sails.config.environment = 'development';
                // process.env.NODE_ENV = 'developement';

                sails.hooks.orm.reload();
                sails.once('hook:orm:reloaded', function () {
                    // Restore original environment
                    // sails.config.environment = env1;
                    // process.env.NODE_ENV = env2;

                    notifyToClients(true, 'reloadORM', 'done');

                    next();
                });
            }],

            blueprints: ['controllers', 'orm', function (next) {
                sails.log('Reloading blueprints');
                notifyToClients(true, 'reloadBlueprints', 'start');

                clearTimeout(timeout);
                sails.hooks.blueprints.extendControllerMiddleware();
                sails.router.flush();
                sails.hooks.blueprints.bindShadowRoutes();

                notifyToClients(true, 'reloadBlueprints', 'done');
                next();
            }]

        }, function (err) {
            sails.log('End reload');

            if (err) {

                notifyToClients(true, '', 'fail', {
                    error: err.message.replace('Error:', '').replace('error:', ''),
                    requestData: { appID: appID }
                });

                dfd.reject(err);
            }
            else {

                //// FIX: somewhere in the process of reloading controllers or blueprints,
                //// our client's socket looses connection with the server.  It is possible
                //// that this notification is sent during that disconnected state and the
                //// Client remains unaware of the updated status.
                //// Here we set a timeout to give the client a chance to reconnect before
                //// we send the message.
                setTimeout(function () {
                    notifyToClients(false, '', 'finish');
                }, 3000);

                dfd.resolve();
            }
        });

        return dfd;
    },


    /**
     * Generate the application directory structure
     */
    //     buildApplication: function (appID) {
    //         var dfd = AD.sal.Deferred();
    //         var cwd = process.cwd();

    //         var pluginExists = false;

    //         var appName, moduleName, areaName, areaKey;

    //         var Application = null;

    //         // if we are currently building it:
    //         if (appsBuildInProgress[appID]) {
    //             // console.log('... App Build in progress : waiting!');
    //             return appsBuildInProgress[appID];
    //         }


    //         // if we get here, we start building this app:
    //         // So mark that it is in progress:
    //         appsBuildInProgress[appID] = dfd;

    //         async.series([
    //             function (next) {
    //                 ABApplication.find({ id: appID })
    //                     .populate('translations')
    //                     .then(function (list) {
    //                         if (!list || !list[0]) {
    //                             throw new Error('Application not found');
    //                         }
    //                         var obj = list[0];
    //                         // Only numbers and alphabets will be used
    //                         Application = obj;
    //                         appName = AppBuilder.rules.toApplicationNameFormat(obj.name);
    //                         moduleName = appName.toLowerCase();
    //                         next();
    //                         return null;
    //                     })
    //                     .catch(function (err) {
    //                         next(err);
    //                         return null;
    //                     });

    //             },

    //             // Check if plugin already exists
    //             function (next) {
    //                 process.chdir('node_modules'); // sails/node_modules/
    //                 fs.stat(moduleName, function (err, stat) {
    //                     if (!err) {
    //                         pluginExists = true;
    //                     }
    //                     next();
    //                 });
    //             },

    //             // Create opstool plugin with appdev-cli
    //             function (next) {

    //                 if (pluginExists) {
    //                     // Skip this step if plugin already exists
    //                     return next();
    //                 }
    //                 AD.spawn.command({
    //                     command: cliCommand,
    //                     options: [
    //                         'opstoolplugin',
    //                         appName,
    //                         '1' // isOPView
    //                     ],
    //                     shouldEcho: true,
    //                     responses: {
    //                         'unit test capabilities': 'no\n',
    //                         'author': 'AppBuilder\n',
    //                         'description': '\n',
    //                         'version': '\n',
    //                         'repository': '\n',
    //                     }
    //                 })
    //                     .fail(next)
    //                     .done(function () {
    //                         next();
    //                     });
    //             },

    //             // Delete old .adn file
    //             function (next) {
    //
    //                 process.chdir(moduleName); // sails/node_modules/ab_{appName}/
    //                 async.each(['.adn'], function (target, ok) {
    //                     // Delete file if it exists
    //                     fs.unlink(target, function (err) {
    //                         // Ignore errors. If file does not exist, that's fine.
    //                         ok();
    //                     });
    //                 }, function (err) {
    //                     next();
    //                 });
    //             },

    //             // Symlink the .adn file
    //             function (next) {
    //                 fs.symlink(path.join(cwd, '.adn'), '.adn', next);
    //             },


    //             // make sure OpsPortal navigation has an area for this application defined:
    //             function (next) {

    //                 // if this was our first time to create the App,
    //                 // then create an area.
    //                 // Dont keep creating one since they might want to remove it using the
    //                 // Live Navigation Editor
    //                 if (!pluginExists) {

    //                     var areaName = Application.name;
    //                     var areaKey = Application.areaKey();
    //                     var label = areaName;  // default if no translations provided
    //                     Application.translations.some(function (trans) {
    //                         if (label == areaName) {
    //                             label = trans.label;
    //                             return true;  // stops the looping.
    //                         }
    //                     })
    //                     var defaultArea = {
    //                         key: areaKey,
    //                         icon: 'fa-cubes',
    //                         isDefault: false,
    //                         label: label,
    //                         context: areaKey
    //                     }

    //                     // Note: this will only create it if it doesn't already exist.
    //                     OPSPortal.NavBar.Area.create(defaultArea, function (err, area) {

    //                         // area is null if already existed,
    //                         // not null if just created:

    //                         next(err);
    //                     })

    //                 } else {
    //                     next();
    //                 }

    //             }

    //         ], function (err) {
    //             process.chdir(cwd);
    //             if (err) dfd.reject(err);
    //             else dfd.resolve({});

    //             // now remove our flag:
    //             // console.log('... App Build finished!');
    //             delete appsBuildInProgress[appID];
    //         });

    //         return dfd;
    //     },



    registerNavBarArea: function (appID) {

        return new Promise(
            (resolve, reject) => {

                var Application = null;


                // if we get here, we start building this app:
                // So mark that it is in progress:
                // appsBuildInProgress[appID] = dfd;

                async.series([
                    function (next) {
                        ABApplication.find({ id: appID })
                            .populate('translations')
                            .then(function (list) {

                                if (!list || !list[0]) {
                                    var err = new Error('Application not found');
                                    ADCore.error.log('Application not found ', { error: err, appID: appID });
                                    next(err);
                                    return;
                                }


                                var obj = list[0];
                                // Only numbers and alphabets will be used
                                Application = obj;
                                next();
                                return null;
                            })
                            .catch(function (err) {
                                next(err);
                                return null;
                            });

                    },


                    // make sure OpsPortal navigation has an area for this application defined:
                    function (next) {

                        // if this was our first time to create the App,
                        // then create an area.
                        // Dont keep creating one since they might want to remove it using the
                        // Live Navigation Editor


                        var areaName = Application.name;
                        var areaKey = Application.areaKey();
                        var label = areaName;  // default if no translations provided

                        // now take the 1st translation we find:
                        Application.translations.some(function (trans) {
                            if (label == areaName) {
                                label = trans.label;
                                return true;  // stops the looping.
                            }
                        })

                        var defaultArea = {
                            key: areaKey,
                            icon: 'fa-cubes',
                            isDefault: false,
                            label: label,
                            context: areaKey
                        }

                        // Note: this will only create it if it doesn't already exist.
                        OPSPortal.NavBar.Area.create(defaultArea, function (err, area) {

                            // area is null if already existed,
                            // not null if just created:

                            next(err);
                        })


                    }

                ], function (err) {

                    if (err) reject(err);
                    else resolve({});
                });

            }
        )


    },


    /**
     * Update NavBar.area label
     */
    updateNavBarArea: function (appID) {

        return new Promise(
            (resolve, reject) => {
                var Application;

                async.series([
                    function (next) {
                        ABApplication.find({ id: appID })
                            .populate('translations')
                            .then(function (list) {
                                if (!list || !list[0]) {
                                    throw new Error('Application not found');
                                }
                                var obj = list[0];
                                // Only numbers and alphabets will be used
                                Application = obj;
                                appName = AppBuilder.rules.toApplicationNameFormat(obj.name);

                                next();
                                return null;
                            })
                            .catch(function (err) {
                                next(err);
                                return null;
                            });

                    },
                    function (next) {
                        var areaName = Application.name;
                        var areaKey = Application.areaKey();
                        var label = areaName;  // default if no translations provided
                        Application.translations.some(function (trans) {
                            if (label == areaName) {
                                label = trans.label;
                                return true;  // stops the looping.
                            }
                        })
                        var updateArea = {
                            key: areaKey,
                            label: label,
                        }

                        OPSPortal.NavBar.Area.exists(areaKey)
                            .then(function (exists) {

                                if (exists) {

                                    OPSPortal.NavBar.Area.update(updateArea)
                                        .then(function (err) {
                                            next(err);
                                        })

                                }
                                else {

                                    AppBuilder.registerNavBarArea(appID)
                                        .then(function () {
                                            next();
                                        })
                                        .catch(next);

                                }

                            }, next);


                    }
                ], function (err) {
                    if (err) reject(err);
                    else resolve();
                });

            }
        );

    },


    updateNavView: function (application, page) {

        if (!page) return Promise.reject(new Error('invalid page'));

         // find page name
         var pageLabel;
         page.translations.forEach((trans) => {
             if (trans.language_code == 'en') {
                pageLabel = AppBuilder.rules.nameFilter(trans.label);
             }
         });

        var appID = application.id,
            appName = AppBuilder.rules.toApplicationNameFormat(application.name),
            pageName = AppBuilder.rules.nameFilter(page.name),
            pageKey = getPageKey(appName, pageName),
            toolKey = _.kebabCase(pageKey),
            toolLabel = pageLabel,
            pagePermsAction = pageKey + '.view',
            pagePerms = 'adcore.admin,' + pagePermsAction,
            controllerIncludes = [
                {
                    // Switching to the new ABLiveTool controller:
                    key: 'opstools.BuildApp.ABLiveTool',
                    path: 'opstools/BuildApp/controllers/ABLiveTool.js',
                    init: {
                        app: application.id,
                        page: page.urlPointer()
                    }
                }
            ];

        var roles = [];
        var objectIncludes = [];
        var pages = {};
        var modelNames = [];

        return Promise.resolve()

            // Create Page's permission action
            .then(() => {
                return new Promise((resolve, reject) => {

                    // var page = pages[pageID];
                    // page.permissionActionKey = pagePermsAction;

                    Permissions.action.create({
                        key: pagePermsAction,
                        description: 'Allow the user to view the ' + appName + "'s " + pageName + ' page',
                        language_code: 'en'
                    })
                        .always(function () {
                            // If permission action already exists, that's fine.
                            resolve();
                        });

                });
            })

            // Find assign roles
            .then(() => {
                return new Promise((resolve, reject) => {

                    // 'opstools.' + appName + '.view';
                    var action_key = application.actionKeyName();

                    Permissions.getRolesByActionKey(action_key)
                        .then(function (result) {

                            roles = result;

                            resolve();
                        }, reject);

                });
            })

            // Assign Page's permission action to assign roles
            .then(() => {
                return new Promise((resolve, reject) => {

                    var assignActionTasks = [];

                    roles.forEach(function (r) {
                        assignActionTasks.push(function (callback) {
                            Permissions.assignAction(r.id, pagePermsAction)
                                .fail(function (err) { callback(err); })
                                .then(function () { callback(); });
                        });
                    });

                    async.parallel(assignActionTasks, function (err) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });

                });
            })

            // Create OPView entry
            .then(() => {
                return new Promise((resolve, reject) => {
                    OPSPortal.View.createOrUpdate(
                        pageKey,
                        objectIncludes,
                        controllerIncludes
                    )
                        .fail(reject)
                        .done(function () {
                            resolve();
                        });
                });
            })

            // create a Tool Definition for the OP Portal Navigation
            .then(() => {
                return new Promise((resolve, reject) => {
                    // sails.log('create tool definition')
                    var areaName = application.name;
                    var areaKey = application.areaKey();

                    var def = {
                        key: toolKey,
                        permissions: pagePerms,
                        icon: page.icon,
                        label: toolLabel,
                        // context: pageKey,
                        controller: 'OPView',
                        isController: false,
                        options: { url: '/opsportal/view/' + pageKey },
                        version: '0'
                    }

                    OPSPortal.NavBar.ToolDefinition.create(def, function (err, toolDef) {
                        if (err) reject(err);
                        else resolve();
                    })

                });
            })

            // make sure our ToolDefinition is linked to our Area Definition.
            .then(() => {

                return new Promise((resolve, reject) => {
                    // sails.log('... todo: link tooldef to area');

                    OPSPortal.NavBar.Area.link({
                        keyArea: application.areaKey(),
                        keyTool: toolKey,
                        instance: {
                            icon: 'fa-cube',
                            permissions: pagePerms,
                            options: {
                                is: 'there'
                            }
                        }
                    }, function (err) {
                        if (err) {
                            if (err.code == 'E_AREANOTFOUND') {
                                sails.log.info('... Area[' + application.areaKey() + '] not found.  Move along ... ');
                                // this probably means that they deleted this default area
                                // using the Navigation Editor.
                                // no problem here:
                                resolve();
                                return;
                            }

                            reject(err);
                        }

                        resolve();
                    });

                });

            });

    },



    removeNavView: function (application, pageName) {

        if (!pageName) return Promise.reject(new Error('invalid page'));

        pageName = AppBuilder.rules.nameFilter(pageName);

        var appID = application.id,
            appName = AppBuilder.rules.toApplicationNameFormat(application.name),
            pageKey = getPageKey(appName, pageName),
            toolKey = _.kebabCase(pageKey),
            pagePermsAction = pageKey + '.view';

        return Promise.resolve()

            .then(() => {

                return new Promise((resolve, reject) => {

                    OPConfigTool.destroy({ key: toolKey })
                        .then(function (result) {
                            resolve();
                        }, reject);

                });
            })
            .then(() => {

                // Remove OPView entry
                return new Promise((resolve, reject) => {

                    OPSPortal.View.remove(pageKey)
                        .then(function () {
                            resolve();
                        }, reject);

                });
            })
            .then(() => {

                // Remove a Tool Definition for the OP Portal Navigation
                return new Promise((resolve, reject) => {

                    OPSPortal.NavBar.ToolDefinition.remove(toolKey)
                        .then(function () {
                            resolve();
                        }, reject);
                });
            })
            .then(() => {

                // Remove permissions of pages
                return new Promise((resolve, reject) => {

                    Permissions.action.destroyKeys([pagePermsAction])
                        .then(function (data) {
                            resolve();
                        }, reject);

                });

            });

    },



    /**
     * Generate the models and controllers for a given AB Object.
     *
     * @param integer objectID
     *      The ABObject primary key ID.
     * @return Deferred
     */
    buildObject: function (objectID) {
        var dfd = AD.sal.Deferred();

        var obj;
        var appName, moduleName;
        var objName, fullName;
        var pages = [];
        var columns = [];

        //var modelsPath = sails.config.paths.models;
        var modelsPath = path.join('api', 'models'); // in the submodule

        var fullPath, fullPathTrans, clientPath, baseClientPath;
        var cwd = process.cwd();

        async.series([

            // make sure our dataFields have been imported:
            importDataFields,


            // Find object info
            function (next) {
                ABObject.find({ id: objectID })
                    .populate('columns')
                    .populate('application')
                    .then(function (list) {
                        obj = list[0];
                        if (!obj) throw new Error('invalid object id: ' + objectID);

                        next();
                    })
                    .catch(function (err) {
                        next(err);
                    });
            },

            // Get base of import object
            function (next) {
                // Ignore if object is not imported object.
                if (!obj.isImported) {
                    next();
                    return null;
                }

                var importFromObjectId = obj.importFromObject;

                if (importFromObjectId) {
                    // Get base of import object
                    ABObject.find({ id: importFromObjectId })
                        .populate('columns')
                        .populate('application')
                        .then(function (list) {
                            // Use import object to sync
                            obj = list[0];
                            if (!obj) throw new Error('invalid import object id: ' + importFromObjectId);
                            else next();
                        })
                        .catch(function (err) {
                            next(err);
                        });
                }
                else {
                    // Imported objects should not be synced to the server
                    next('IMPORTED OBJECT');
                }
            },

            // Get all associated columns of object
            function (next) {
                ABObject.find({ importFromObject: obj.id })
                    .populate('columns', { type: 'connectObject' })
                    .then(function (list) {
                        list.forEach(function (childObj) {
                            childObj.columns.forEach(function (col) {

                                if (obj.columns.filter(function (c) { return c.id == col.id }).length < 1) {
                                    obj.columns.push(col);
                                }

                            });
                        });

                        next();
                    })
                    .catch(function (err) {
                        next(err);
                    });
            },

            // Populate object info
            function (next) {
                // Only numbers and alphabets will be used
                appName = AppBuilder.rules.toApplicationNameFormat(obj.application.name);
                moduleName = appName.toLowerCase();

                objName = AppBuilder.rules.nameFilter(obj.name);
                columns = obj.columns;
                fullName = AppBuilder.rules.toObjectNameFormat(appName, objName);

                fullPath = path.join(modelsPath, fullName) + '.js';
                fullPathTrans = path.join(modelsPath, fullName) + 'Trans.js';
                clientPath = path.join('assets', 'opstools', appName, 'models', fullName + '.js');
                baseClientPath = path.join('assets', 'opstools', appName, 'models', 'base', fullName + '.js');

                next();
            },

            // Delete old model definition files
            function (next) {
                process.chdir(path.join('node_modules', moduleName)); // sails/node_modules/ab_{appName}/
                async.each([fullPath, fullPathTrans, clientPath, baseClientPath], function (target, ok) {
                    // Delete file if it exists
                    fs.unlink(target, function (err) {
                        // Ignore errors. If file does not exist, that's fine.
                        ok();
                    });
                }, function (err) {
                    next();
                });
            },

            // Generate model definitions with appdev-cli
            function (next) {
                var cliParams = [
                    'resource', // appdev-cli command
                    path.join('opstools', appName), // client side location
                    fullName, // server side location
                    'connection:appBuilder', // Sails connection name
                    'tablename:' + fullName.toLowerCase(),
                    'preventNull:true'
                ];

                async.series([
                    // Define columns
                    function (callback) {
                        async.eachSeries(columns, function (col, ok) {

                            var colString = '',
                                isDefinedLabel = false,
                                field = DataFields[col.fieldName];

                            if (!field) {
                                ok('System could not found this field type: ' + col.fieldName);
                                return;
                            }

                            field.getFieldString(col)
                                .fail(ok)
                                .then(function (colStr) {
                                    colString = colStr;

                                    if (!isDefinedLabel &&
                                        ((colString.indexOf(':string:') > -1)
                                            || (colString.indexOf(':text:') > -1))) {

                                        colString += ':label';
                                        isDefinedLabel = true;
                                    }

                                    cliParams.push(colString);

                                    ok();
                                });
                        }, callback);
                    }
                ], function (err) {
                    if (err) {
                        next(err);
                        return;
                    }

                    AD.spawn.command({
                        command: cliCommand,
                        options: cliParams
                    })
                        .fail(next)
                        .done(function () {
                            next();
                        });
                });
            },

            // Patch model definition
            function (next) {
                async.each([fullPath, fullPathTrans], function (target, ok) {
                    fs.readFile(target, 'utf8', function (err, data) {
                        // Ignore errors. If file does not exist, that's fine.
                        if (err) {
                            ok();
                        } else {
                            var newData = data.replace(
                                /module.exports = {/i,
                                "module.exports = {\n" +
                                "  migrate: 'alter',"
                            );
                            fs.writeFile(target, newData, ok);
                        }
                    });
                }, function (err) {
                    next();
                });
            },


            // add build links for this and any connected models:
            function (next) {

                // hash of currently existing models:  'modelName' => modelDescription
                var hashCurrModels = {};

                var pathModelDir = path.join(AppBuilder.paths.sailsBuildDir(), 'api', 'models');


                // given a model filename, read in the model and store in our hashCurrModels
                function importModel(file) {
                    var modelRef = file.replace('.js', '');
                    hashCurrModels[modelRef] = require(path.join(pathModelDir, file));
                }


                ////  calculate the relative offset for our original (live) model file:
                function calcOffsetPath(fileName, currPath) {

                    ////  calculate the relative offset for our original (live) model file:
                    var offsetDir = currPath.replace(sails.config.appPath + path.sep, '');
                    // console.log('... offsetDir:'+offsetDir);

                    var parts = offsetDir.split(path.sep);

                    // remove the final model name and have only the path now.
                    if (parts[parts.length - 1].indexOf('.js') != -1) {
                        parts.pop();
                    }

                    // for each path directory, add a '..' offset
                    var offsets = [];
                    parts.forEach(function () {
                        offsets.push('..');
                    })

                    // add the actual path to the model.
                    offsets.push(fileName);
                    return offsets.join(path.sep);

                }

                // create the symlink for a given model name (not file name)
                function linkModel(name, cb) {

                    // find the build destination path for this model:
                    var destPath = path.join(AppBuilder.paths.sailsBuildDir(), 'api', 'models', name + '.js')
                    // console.log('... symlink for: '+ destPath);


                    var livePath = calcOffsetPath(path.join(modelsPath, name) + '.js', destPath);
                    // console.log('... livePath:'+livePath);
                    // console.log('... cwd:', process.cwd() );

                    var currLivePath = calcOffsetPath(path.join(modelsPath, name) + '.js', process.cwd());
                    // console.log('... currLivePath:'+currLivePath);


                    // if livePath Exists:
                    fs.readFile(currLivePath, function (err, data) {
                        if (!err) {
                            // console.log('    +++ making symlink!');
                            // now make the symlink:
                            fs.symlink(livePath, destPath, function (err) {
                                cb(err);
                            });
                        } else {
                            // console.log('... no symlink.  err:', err);
                            cb();
                        }
                    })

                }

                // function forceCrash(name, cb) {

                //     var currLivePath = calcOffsetPath(path.join(modelsPath, name)+'.js', process.cwd());

                //     fs.readFile(currLivePath, 'utf8', function(err, data){
                //         if (!err) {
                //             var code = [
                //                 "attributes: {",
                //                 "something:{ model:'notThere' },"
                //             ].join('\n');

                //             data = data.replace(/attributes\s*:\s*{/g, code);
                //             // now make the symlink:
                //             fs.writeFile(currLivePath, data, function(err){
                //                 cb(err);
                //             });
                //         } else {
                //             cb();
                //         }
                //     })
                // }

                //// TODO:
                // sails is lowercasing all our models info in .collection and .model references.
                // we need to be able to revert to the proper upper case for our FileNames.
                // the current lowercase versions work on MacOS, but not on Linux.

                // until it is fixed:  just attempt model and modelTrans:
                linkModel(fullName, function (err) {
                    linkModel(fullName + 'Trans', function (err) {

                        // forceCrash(fullName, function(err){
                        next();
                        // })

                    })
                });


                //// This should work once we fix the fileNames and be able to handle
                //// any embedded model associations:

                //                 async.series([

                //                     // find the current models in the directory:
                //                     function(ok){

                //                         // scan this directory:
                //                         fs.readdir(pathModelDir, function(err, files){

                //                             if (err) {
                //                                 ok(err);
                //                                 return;
                //                             }

                //                             files.forEach(function(file){

                //                                 importModel(file);

                //                             })
                // console.log('... hashCurrModels:', _.keys(hashCurrModels));

                //                             ok();
                //                         });
                //                     },

                //                     function(ok){


                //                         // check the current model name
                //                         // make sure it is linked, then find any associated models
                //                         // and make sure they are linked.
                //                         // when the current model is fully processed, call cb().
                //                         function checkModel(name, cb) {

                //                             // if not already linked LINK IT and try again:
                //                             if (!hashCurrModels[name]) {

                //                                 // add link
                //                                 linkModel(name, function(err){
                //                                     if (err) {
                //                                         cb(err);
                //                                     } else{

                //                                         importModel(name+'.js'); // <-- use file name

                //                                         // try it again.
                //                                         checkModel(name,cb);
                //                                     }
                //                                 })

                //                             } else {

                //                                 // scan attributes for additional models to import:
                //                                 // each found model is .push() into associatedModels
                //                                 var model = hashCurrModels[name];
                //                                 var associatedModels = [];
                //                                 for(var a in model.attributes) {
                //                                     var field = model.attributes[a];
                //                                     if (field.collection) {
                //                                         associatedModels.push(field.collection);
                //                                     }
                //                                     if (field.model) {
                //                                         associatedModels.push(field.model);
                //                                     }
                //                                 }


                //                                 // recursively process associatedModels and make sure
                //                                 // they are also linked.
                //                                 function processModel(models, pm_cb) {
                //                                     if (models.length == 0) {
                //                                         pm_cb();
                //                                     } else {

                //                                         var model = models.shift();
                //                                         if (hashCurrModels[model]) {
                //                                             // we can skip this one:
                //                                             processModel(models, pm_cb);
                //                                         } else {
                //                                             checkModel(model, function(err){

                //                                                 // that model is now done.  So try the next:
                //                                                 processModel(models, pm_cb);
                //                                             })
                //                                         }
                //                                     }
                //                                 }
                // console.log('... associatedModels:', associatedModels);
                //                                 processModel(associatedModels, function(err){

                //                                     // all our associated models have been checked:
                //                                     // we're done:
                //                                     cb(err);
                //                                 })


                //                             }

                //                         } // end checkModel()

                //                         // kick the process off with the current model :
                //                         // NOTE: lower case our model name for our build files.
                //                         checkModel(fullName, function(err){
                //                             ok(err);
                //                         })

                //                     }], function(err){
                //                     next(err);

                //                 }) // end async.series()

            }


        ], function (err) {
            process.chdir(cwd);
            if (err) {
                if (err == 'IMPORTED OBJECT') {
                    // Build was skipped because object was imported.
                    dfd.resolve();
                }
                else dfd.reject(err);
            }
            else dfd.resolve();
        });

        return dfd;
    },


    /**
     * Generate the client side controller for a root page
     *
     * @param integer pageID
     * @return Deferred
     */
    buildPage: function (pageID) {
        var dfd = AD.sal.Deferred();
        var cwd = process.cwd();


        var appID, appName, pageName, pageKey, pagePerms, toolLabel;
        var roles = [];
        var objectIncludes = [];
        var controllerIncludes = [];

        var Application = null;

        var pages = {};
        var modelNames = [];

        async.series([
            // Find basic page info
            function (next) {
                ABPage.findOne({ id: pageID })
                    .populate('application')
                    .populate('components')
                    .populate('translations')
                    .then(function (page) {
                        if (!page) return next(new Error('invalid page id'));

                        if (page.parent > 0) throw new Error('not a root page');

                        appID = page.application.id;
                        appName = AppBuilder.rules.toApplicationNameFormat(page.application.name);
                        pageName = AppBuilder.rules.nameFilter(page.name);
                        toolLabel = pageName;
                        page.translations.some(function (trans) {
                            if (toolLabel == pageName) {
                                toolLabel = trans.label;
                                return true;
                            }
                        })

                        // Only numbers and alphabets will be used
                        Application = page.application;

                        pageKey = getPageKey(appName, pageName);
                        pagePerms = 'adcore.admin,' + pageKey + '.view';

                        // Switching to the new ABLiveTool controller:
                        controllerIncludes.push({
                            key: 'opstools.BuildApp.ABLiveTool',
                            path: 'opstools/BuildApp/controllers/ABLiveTool.js',
                            init: {
                                app: appID,
                                page: pageID
                            }
                        });

                        pages[pageID] = page;

                        next();
                        return null;
                    })
                    .catch(function (err) {
                        next(err);
                        return null;
                    });
            },

            // Find assign roles
            function (next) {
                var action_key = Application.actionKeyName(); // 'opstools.' + appName + '.view';

                Permissions.getRolesByActionKey(action_key)
                    .then(function (result) {
                        roles = result;

                        next();
                    }, next);
            },

            // Find all sub-pages
            function (next) {
                var pageQueue = [pageID];
                var completed = [];

                async.whilst(
                    function () { return (pageQueue.length > 0) },
                    function (ok) {
                        var pID = pageQueue.pop();
                        ABPage.find()
                            .where({ parent: pID })
                            .populate('components')
                            .then(function (list) {
                                completed.push(pID);
                                if (list && list[0]) {
                                    list.forEach(function (page) {
                                        if (completed.indexOf(page.id) < 0) {
                                            pageQueue.push(page.id);
                                        }
                                        pages[page.id] = page;
                                    });
                                }
                                ok();
                                return null;
                            })
                            .catch(function (err) {
                                ok(err);
                                return null;
                            });
                    },
                    function (err) {
                        if (err) next(err);
                        else next();
                    }
                );

            },

            // Create Page's permission action
            function (next) {
                var page = pages[pageID];
                page.permissionActionKey = pageKey + '.view';
                Permissions.action.create({
                    key: page.permissionActionKey,
                    description: 'Allow the user to view the ' + appName + "'s " + pageName + ' page',
                    language_code: 'en'
                })
                    .always(function () {
                        // If permission action already exists, that's fine.
                        next();
                    });
            },

            // Assign permission actions to assign roles
            function (next) {
                var assignActionTasks = [];

                roles.forEach(function (r) {
                    assignActionTasks.push(function (callback) {
                        Permissions.assignAction(r.id, pageKey + '.view')
                            .fail(function (err) { callback(err); })
                            .then(function () { callback(); });
                    });
                });

                async.parallel(assignActionTasks, function (err) {
                    if (err) {
                        next(err);
                        return null;
                    }

                    next();
                });
            },

            // Create OPView entry
            function (next) {
                OPSPortal.View.createOrUpdate(
                    pageKey,
                    objectIncludes,
                    controllerIncludes
                )
                    .fail(next)
                    .done(function () {
                        next();
                    });
            },

            // create a Tool Definition for the OP Portal Navigation
            function (next) {
                // sails.log('create tool definition')
                var areaName = Application.name;
                var areaKey = Application.areaKey();

                var def = {
                    key: _.kebabCase(pageKey),
                    permissions: pagePerms,
                    icon: 'fa-lock', // TODO: get this from Page Definition.
                    label: toolLabel,
                    // context: pageKey,
                    controller: 'OPView',
                    isController: false,
                    options: { url: '/opsportal/view/' + pageKey },
                    version: '0'
                }
                OPSPortal.NavBar.ToolDefinition.create(def, function (err, toolDef) {

                    next(err);
                })
            },

            // make sure our ToolDefinition is linked to our Area Definition.
            function (next) {
                // sails.log('... todo: link tooldef to area');

                OPSPortal.NavBar.Area.link({
                    keyArea: Application.areaKey(),
                    keyTool: _.kebabCase(pageKey),
                    instance: {
                        icon: 'fa-cube',
                        permissions: pagePerms,
                        options: {
                            is: 'there'
                        }
                    }
                }, function (err) {
                    if (err) {
                        if (err.code == 'E_AREANOTFOUND') {
                            console.log('... Area[' + Application.areaKey() + '] not found.  Move along ... ');
                            // this probably means that they deleted this default area
                            // using the Navigation Editor.
                            // no problem here:
                            next();
                            return;
                        }
                    }
                    next(err);
                });

            }


        ], function (err) {
            if (err) dfd.reject(err);
            else {
                var page = pages[pageID];

                // save any updates to our page instance.
                page.save(function (err) {
                    // should we pay attention to this error?

                    dfd.resolve({});
                })

            }
        });

        return dfd;
    },


    /**
     * Remove pages
     *
     * @param [ABPage] deleted pages
     * @return Deferred
     */
    removePages: function (deletedPages) {
        var dfd = AD.sal.Deferred(),
            applications = {}, // { appId: application }
            removeTasks = [];

        if (!deletedPages || deletedPages.length < 1) {
            dfd.resolve();
            return dfd
        }

        deletedPages.forEach(function (page) {
            removeTasks.push(function (ok) {
                var appName, pageName, pageKey;

                async.series(
                    [
                        // Get application info
                        function (next) {

                            function pullData() {
                                appName = AppBuilder.rules.toApplicationNameFormat(applications[page.application].name);
                                pageName = AppBuilder.rules.nameFilter(page.name);
                                pageKey = _.kebabCase(getPageKey(appName, pageName));

                                next();
                            }
                            if (applications[page.application]) {
                                pullData();
                            }
                            else {
                                ABApplication.findOne({ id: page.application })
                                    .then(function (result) {
                                        if (result) {
                                            applications[page.application] = result;

                                            pullData();
                                        }
                                        else {
                                            var err = new Error('Could not find application ( id:' + page.application + ')');
                                            next(err);
                                        }
                                        return null;
                                    }, next);
                            }
                        },

                        function (next) {
                            OPConfigTool.destroy({ key: pageKey })
                                .then(function (result) {
                                    next();
                                }, next);
                        },

                        // Remove OPView entry
                        function (next) {
                            OPSPortal.View.remove(pageKey)
                                .then(function () {
                                    next();
                                }, next);
                        },

                        // Remove a Tool Definition for the OP Portal Navigation
                        function (next) {
                            OPSPortal.NavBar.ToolDefinition.remove(pageKey)
                                .then(function () {
                                    next();
                                }, next);
                        },

                        // Remove permissions of pages
                        function ABPage_AfterDelete_RemovePermissions(next) {
                            Permissions.action.destroyKeys([page.permissionActionKey])
                                .then(function (data) {
                                    next();
                                }, next);
                        }

                    ], ok);
            });
        });

        async.parallel(removeTasks, function (err) {
            if (err)
                dfd.reject(err);
            else
                dfd.resolve();
        });

        return dfd;
    },


    /**
     * Generate the client side controller for a root page
     *
     * @param integer pageID
     * @return Deferred
     */
    exportPage: function (pageID) {
        var dfd = AD.sal.Deferred();
        var cwd = process.cwd();


        var appID, appName, pageName, pageKey, pagePerms, toolLabel;
        var roles = [];
        var objectIncludes = [];
        var controllerIncludes = [];

        var Application = null;

        var pages = {};
        var modelNames = [];

        async.series([
            // Find basic page info
            function (next) {
                ABPage.find({ id: pageID })
                    .populate('application')
                    .populate('components')
                    .populate('translations')
                    .then(function (list) {
                        if (!list || !list[0]) {
                            var err = new Error('invalid page id');
                            next(err);
                            return;
                        }
                        var page = list[0];
                        if (page.parent > 0) throw new Error('not a root page');

                        appID = page.application.id;
                        appName = AppBuilder.rules.toApplicationNameFormat(page.application.name);
                        pageName = AppBuilder.rules.nameFilter(page.name);
                        toolLabel = pageName;
                        page.translations.some(function (trans) {
                            if (toolLabel == pageName) {
                                toolLabel = trans.label;
                                return true;
                            }
                        })

                        // Only numbers and alphabets will be used
                        Application = page.application;

                        pageKey = getPageKey(appName, pageName);
                        pagePerms = 'adcore.admin,' + pageKey + '.view';

                        controllerIncludes.push({
                            key: 'opstools.' + appName + '.' + pageName,
                            path: 'opstools/' + appName + '/controllers/'
                            + pageName + '.js'
                        });

                        pages[pageID] = page;

                        next();
                        return null;
                    })
                    .catch(function (err) {
                        next(err);
                        return null;
                    });
            },

            // Find assign roles
            function (next) {
                var action_key = Application.actionKeyName(); // 'opstools.' + appName + '.view';

                Permissions.getRolesByActionKey(action_key)
                    .fail(function (err) {
                        next(err);
                        return null;
                    })
                    .then(function (result) {
                        roles = result;

                        next();
                    });
            },

            // Find all sub-pages
            function (next) {
                var pageQueue = [pageID];
                var completed = [];

                async.whilst(
                    function () { return (pageQueue.length > 0) },
                    function (ok) {
                        var pID = pageQueue.pop();
                        ABPage.find()
                            .where({ parent: pID })
                            .populate('components')
                            .then(function (list) {
                                completed.push(pID);
                                if (list && list[0]) {
                                    list.forEach(function (page) {
                                        if (completed.indexOf(page.id) < 0) {
                                            pageQueue.push(page.id);
                                        }
                                        pages[page.id] = page;
                                    });
                                }
                                ok();
                                return null;
                            })
                            .catch(function (err) {
                                ok(err);
                                return null;
                            });
                    },
                    function (err) {
                        if (err) next(err);
                        else next();
                    }
                );

            },

            // // Prepare additional component metadata
            // function (next) {
            //     async.forEachOf(pages, function (page, pageID, pageDone) {
            //         async.each(page.components, function (item, itemDone) {
            //             switch (item.component.toLowerCase()) {
            //                 case 'grid':
            //                     // Add a `columns` property
            //                     item.columns = [];
            //                     if (!Array.isArray(item.setting.columns)) {
            //                         sails.log('Unknown `setting` format:', item.setting);
            //                         itemDone();
            //                         return;
            //                     }
            //                     async.each(item.setting.columns, function (col, colDone) {
            //                         var colID;
            //                         if (typeof col == 'string' || typeof col == 'number') {
            //                             // Old format
            //                             colID = col;
            //                         }
            //                         else if (col.dataId) {
            //                             // New format
            //                             colID = col.dataId;
            //                         }
            //                         else if (col.id && col.id == 'appbuilder_trash') {
            //                             item.columns.push('trash');
            //                             colDone();
            //                             return;
            //                         }
            //                         else {
            //                             sails.log('Unexpected column format:', col);
            //                             colDone();
            //                             return;
            //                         }
            //                         ABColumn.find({ id: colID })
            //                             .populate('object')
            //                             .populate('translations')
            //                             .then(function (list) {
            //                                 if (list && list[0]) {
            //                                     item.modelName = appName + '_' + AppBuilder.rules.nameFilter(list[0].object.name);
            //                                     item.columns.push({
            //                                         id: AppBuilder.rules.nameFilter(list[0].name),
            //                                         header: list[0].translations[0].label
            //                                     });
            //                                 }
            //                                 colDone();
            //                                 return null;
            //                             })
            //                             .catch(function (err) {
            //                                 colDone(err);
            //                                 return null;
            //                             });
            //                     }, function (err) {
            //                         if (err) itemDone(err);
            //                         else itemDone();
            //                     });
            //                     break;

            //                 default:
            //                     itemDone();
            //                     break;
            //             }
            //         }, function (err) {
            //             if (err) pageDone(err);
            //             else pageDone();
            //         });
            //     }, function (err) {
            //         if (err) next(err);
            //         else next();
            //     });
            // },

            // Find related objects
            function (next) {
                ABObject.find({ application: appID })
                    .then(function (list) {
                        for (var i = 0; i < list.length; i++) {
                            var obj = list[i];
                            objectIncludes.push({
                                key: 'opstools.' + appName + '.'
                                + appName + '_' + AppBuilder.rules.nameFilter(obj.name),
                                path: 'opstools/' + appName + '/models/'
                                + appName + '_' + AppBuilder.rules.nameFilter(obj.name) + '.js'
                            });

                            modelNames.push(AppBuilder.rules.nameFilter(obj.name));
                        }
                        next();
                        return null;
                    })
                    .catch(function (err) {
                        next(err);
                        return null;
                    });
            },

            // Generate the client side controller for the app page
            function (next) {
                sails.renderView(path.join('app_builder', 'page_controller'), {
                    layout: false,
                    appId: appID,
                    appName: appName,
                    pageName: pageName,
                    pages: pages,
                    models: modelNames,
                    rootPageID: pageID,
                    domID: function (pid) {
                        pid = pid || '';
                        return 'abpage-' + appName + '-' + pageName + '-' + pid;
                    }
                }, function (err, output) {
                    if (err) next(err);
                    else {
                        fs.writeFile(
                            path.join(
                                'assets', 'opstools', appName,
                                'controllers', pageName + '.js'
                            ),
                            output,
                            function (err) {
                                if (err) next(err);
                                else next();
                            }
                        );
                    }
                });
                /*
                AD.spawn.command({
                    command: cliCommand,
                    options: [
                        'controllerUI',
                        path.join('opstools', appName),
                        pageName
                    ],
                    shouldEcho: true
                })
                .fail(next)
                .done(function() {
                    next();
                });
                */
            },

            // Create Page's permission action
            function (next) {
                var page = pages[pageID];
                page.permissionActionKey = pageKey + '.view';
                Permissions.action.create({
                    key: page.permissionActionKey,
                    description: 'Allow the user to view the ' + appName + "'s " + pageName + ' page',
                    language_code: 'en'
                })
                    .always(function () {
                        // If permission action already exists, that's fine.
                        next();
                    });
            },

            // Assign permission actions to assign roles
            function (next) {
                var assignActionTasks = [];

                roles.forEach(function (r) {
                    assignActionTasks.push(function (callback) {
                        Permissions.assignAction(r.id, pageKey + '.view')
                            .fail(function (err) { callback(err); })
                            .then(function () { callback(); });
                    });
                });

                async.parallel(assignActionTasks, function (err) {
                    if (err) {
                        next(err);
                        return null;
                    }

                    next();
                });
            },

            // Create OPView entry
            function (next) {
                OPSPortal.View.createOrUpdate(
                    pageKey,
                    objectIncludes,
                    controllerIncludes
                )
                    .fail(next)
                    .done(function () {
                        next();
                    });
            },

            // create a Tool Definition for the OP Portal Navigation
            function (next) {
                // sails.log('create tool definition')
                var areaName = Application.name;
                var areaKey = Application.areaKey();

                var def = {
                    key: _.kebabCase(pageKey),
                    permissions: pagePerms,
                    icon: 'fa-lock', // TODO: get this from Page Definition.
                    label: toolLabel,
                    // context: pageKey,
                    controller: 'OPView',
                    isController: false,
                    options: { url: '/opsportal/view/' + pageKey },
                    version: '0'
                }
                OPSPortal.NavBar.ToolDefinition.create(def, function (err, toolDef) {

                    next(err);
                })
            },


            // make sure our ToolDefinition is linked to our Area Definition.
            function (next) {
                // sails.log('... todo: link tooldef to area');

                OPSPortal.NavBar.Area.link({
                    keyArea: Application.areaKey(),
                    keyTool: _.kebabCase(pageKey),
                    instance: {
                        icon: 'fa-cube',
                        permissions: pagePerms,
                        options: {
                            is: 'there'
                        }
                    }
                }, function (err) {
                    if (err) {
                        if (err.code == 'E_AREANOTFOUND') {
                            console.log('... Area[' + Application.areaKey() + '] not found.  Move along ... ');
                            // this probably means that they deleted this default area
                            // using the Navigation Editor.
                            // no problem here:
                            next();
                            return;
                        }
                    }
                    next(err);
                });

            }


        ], function (err) {
            if (err) dfd.reject(err);
            else {
                var page = pages[pageID];

                // save any updates to our page instance.
                page.save(function (err) {
                    // should we pay attention to this error?

                    dfd.resolve({});
                })

            }
        });

        return dfd;
    },


    /**
     * Imports an existing object for use in an AB application.
     * An AB object will be created for that model.
     *
     * @param integer sourceAppID
     * @param integer targetAppID
     * @param uuid objectID
     * @param array [{
     *      id: uuid,
     *      isHidden: bool
     * }] columns
     * @param string currLangCode
     * @return Promise
     *     Resolves with the data of the new imported object
     */
    importObject: function (sourceAppID, targetAppID, objectID, columns, currLangCode) {

        var sourceApp,
            targetApp,
            object;

        return Promise.resolve()
            .then(() => {

                return new Promise((resolve, reject) => {
                    
                    ABApplication.find({ id: [sourceAppID, targetAppID] })
                    .exec(function (err, list) {
                        if (err) {
                            reject(err);
                        }
                        else if (!list || !list[0]) {
                            reject(new Error('application not found: ' + sourceAppID));
                        }
                        else {
                            sourceApp = list.filter(function(a) { return a.id == sourceAppID; })[0];
                            targetApp = list.filter(function(a) { return a.id == targetAppID; })[0];

                            if (sourceApp == null) reject(new Error('application not found: ' + sourceAppID));
                            else if (targetApp == null) reject(new Error('application not found: ' + targetAppID));
                            else  resolve();
                        }
                    });
    
                });

            })
            .then(() => {

                return new Promise((resolve, reject) => {

                    // pull an object
                    var sourceAppClass = sourceApp.toABClass();
                    object = sourceAppClass.objectByID(objectID);
                    if (object == null) reject(new Error('object not found: ' + objectID));

                    // copy fields of the source object
                    var fields = [];
                    object.fields().forEach(f => {

                        // TODO: if application has link object, then it should have this column too
                        if (f.key == 'connectObject') return;

                        var fieldImport = f.toObj();
                        fieldImport.isImported = 1;

                        fields.push(fieldImport);

                    });

                    // pull hidden fields
                    var hiddenFields = [];
                    var hiddenFieldIds = columns
                                        .filter(col => col.isHidden)
                                        .map(col => col.id);

                    hiddenFieldIds.forEach(fId => {
                        var field = fields.filter(col => col.id == fId)[0];
                        if (field)
                            hiddenFields.push(field.columnName);
                    });

                    // create a new clone object
                    var newObjId = uuid.v4();
                    var newObject = {
                        id: newObjId,
                        name: object.name,
                        labelFormat: object.labelFormat,
                        urlPath: object.urlPath,
                        isImported: 1,
                        importFromObject: object.urlPointer(true),
                        // NOTE: store table name of import object to ignore async
                        tableName: object.dbTableName(),
                        translations: object.translations, // copy label of object
                        fields: fields,
                        objectWorkspace: {
                            hiddenFields: hiddenFields
                        },
                    };

                    // add to object list and save
                    targetApp.json.objects.push(newObject);
                    targetApp.save()
                        .fail(reject)
                        .done(function() {
                            resolve(newObjId);
                        });

                });

            });
    }



};
