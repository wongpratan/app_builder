require("../../data/ABApplication");
let ABApplicationCore = require("../core/ABApplicationCore");
let ABDataCollection = require("./ABDataCollection");
let ABObject = require("./ABObject");
let ABObjectQuery = require("./ABObjectQuery");
let ABMobileApp = require("./ABMobileApp");
let ABViewManager = require("./ABViewManager");
let ABViewPage = require("./views/ABViewPage");

const ABDefinition = require("./ABDefinition");

const ABProcessTaskManager = require("../core/process/ABProcessTaskManager");
const ABProcessParticipant = require("./process/ABProcessParticipant");
const ABProcessLane = require("./process/ABProcessLane");

const ABProcess = require("./ABProcess");

var _AllApplications = [];
var __AllObjects = {
   /* ABObject.id : ABObject */
};
// {obj} : a hash of all ABObjects in our system.

var __AllQueries = {
   /* ABQuery.id : ABObjectQuery */
};
// {obj} : a hash of all ABObjectQueriess in our system.

var __AllDatacollections = {
   /* ABDatacollection.id : ABDataCollection */
};
// {obj} : a hash of all ABDataCollection in our system.

var _AllUserRoles = [];
// an array of {id:, lable:} of the ABRoles the current User has assigned

var dfdReady = null;

function L(key, altText) {
   return AD.lang.label.getLabel(key) || altText;
}

function toArray(DC) {
   var ary = [];

   var id = DC.getFirstId();
   while (id) {
      var element = DC.getItem(id);
      ary.push(element);
      id = DC.getNextId(id);
   }

   return ary;
}

// export to ABLiveTool
// window.ABApplication = ABApplication;
module.exports = window.ABApplication = class ABApplication extends ABApplicationCore {
   constructor(attributes) {
      super(attributes);

      // Live display passes data collections on load
      let newDatacollections = [];
      (attributes.json.datacollections || []).forEach((datacollection) => {
         // prevent processing of null values.
         if (datacollection) {
            newDatacollections.push(this.datacollectionNew(datacollection));
         }
      });
      this._datacollections = newDatacollections;

      // instance keeps a link to our Model for .permissions and views;
      this.Model = OP.Model.get("opstools.BuildApp.ABApplication");

      // [fix] prevent crash if no model was returned
      // NOTE: this is actually a pretty big error!  What should we do here?
      if (this.Model) this.Model.Models(ABApplication);
   }

   ///
   /// Static Methods
   ///
   /// Available to the Class level object.  These methods are not dependent
   /// on the instance values of the Application.
   ///

   /**
    * @function allApplications
    *
    * return a DataCollection that contains all the ABApplications this user
    * can see (based upon server side permissions);
    *
    * NOTE: this manages the results in the _AllApplications dataCollection
    * store.  Any future .create(), .destroy(), .updates() modify values in
    * that collection.
    *
    * Any webix ui components synced to that collection will be automatically
    * updated.
    *
    * @return {Promise}
    */
   // static allApplications() {
   //    debugger;

   //    return new Promise((resolve, reject) => {
   //       var ModelApplication = OP.Model.get("opstools.BuildApp.ABApplication");
   //       ModelApplication.Models(ABApplication); // set the Models  setting.

   //       ModelApplication.findAll()
   //          .then(function(data) {
   //             // NOTE: data is already a DataCollection from .findAll()
   //             _AllApplications = data;

   //             resolve(data);
   //          })
   //          .catch(reject);
   //    });
   // }

   static allCurrentApplications() {
      return new Promise((resolve, reject) => {
         resolve(_AllApplications);
      });
   }

   /**
    * @function applicationInfo
    * Get id and label of all applications
    *
    * @return {Promise}
    */
   static applicationInfo() {
      return new Promise((resolve, reject) => {
         // NOTE: make sure all ABDefinitions are loaded before
         // pulling our Applications ...
         ABDefinition.loadAll()
            .then((allDefinitions) => {
               let apps = [];
               // debugger;
               allDefinitions.forEach((def) => {
                  if (def.type == "application") {
                     apps.push(new ABApplication(def.json));
                  }
               });

               _AllApplications = new webix.DataCollection({
                  data: apps || []
               });

               resolve(_AllApplications);

               if (dfdReady) {
                  dfdReady.__resolve();
               }
            })
            .catch((err) => {
               reject(err);
               if (dfdReady) {
                  dfdReady.__reject(err);
               }
            });
      });
   }

   static isReady() {
      if (!dfdReady) {
         dfdReady = Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
               setTimeout(() => {
                  dfdReady.__resolve = resolve;
                  dfdReady.__reject = reject;
               }, 0);
            });
         });
      }
      return dfdReady;
   }

   /**
    * @function get
    * Get an application
    *
    * @param {uuid} appID
    *
    * @return {Promise}
    */
   static get(appID) {
      return new Promise((resolve, reject) => {
         var app = _AllApplications.getItem(appID);
         if (app) {
            resolve(app);
         } else {
            app = ABDefinition.definition(appID);
            if (app) resolve(new ABApplication(app));
            else resolve();
         }
      });
   }

   /**
    * @function create
    *
    * take the initial values and create an instance of ABApplication.
    *
    * @return {Promise}
    */
   static create(values) {
      var newApp = new ABApplication(values);
      return newApp.save();

      //// TODO: redo this as an ABDefinition!
      // debugger;
      // return new Promise(function(resolve, reject) {
      //    var newApp = {};
      //    OP.Multilingual.unTranslate(
      //       values,
      //       newApp,
      //       ABApplication.fieldsMultilingual()
      //    );
      //    values.json = newApp;
      //    newApp.name = values.name;

      //    var ModelApplication = OP.Model.get("opstools.BuildApp.ABApplication");
      //    ModelApplication.create(values)
      //       .then(function(app) {
      //          // return an instance of ABApplication
      //          var App = new ABApplication(app);

      //          _AllApplications.add(App, 0);
      //          resolve(App);
      //       })
      //       .catch(reject);
      // });
   }

   //// TODO: Refactor isValid() to ignore op and not error if duplicateName is own .id

   static isValid(op, values) {
      var validator = OP.Validation.validator();

      // during an ADD operation
      if (op == "add") {
         // label/name must be unique:
         var arrayApplications = toArray(_AllApplications);

         var nameMatch = values.label
            .trim()
            .replace(/ /g, "_")
            .toLowerCase();
         var matchingApps = arrayApplications.filter(function(app) {
            return app.name.trim().toLowerCase() == nameMatch;
         });
         if (matchingApps && matchingApps.length > 0) {
            validator.addError(
               "label",
               L(
                  "ab_form_application_duplicate_name",
                  "*Name (#name#) is already in use"
               ).replace("#name#", nameMatch)
            );
            // var errors = OP.Form.validationError({
            // 	name:'label',
            // 	message:L('ab_form_application_duplicate_name', "*Name (#name#) is already in use").replace('#name#', nameMatch),
            // }, errors);
         }
      }

      // Check the common validations:
      // TODO:
      // if (!inputValidator.validate(values.label)) {
      // 	_logic.buttonSaveEnable();
      // 	return false;
      // }

      return validator;
   }

   /**
    * @method objectFromRef
    *
    * @param {string} resolveUrl - resolve url that include application id
    * @return {Promise}
    */
   static objectFromRef(resolveUrl) {
      debugger;
      // #/3/_objects/6eb3121b-1208-4c49-ae45-fcf722bd6db1
      var parts = resolveUrl.split("/");

      // get id of application
      var appId = parts.splice(1, 1)[0];

      // pull an application
      var app = _AllApplications.find(function(a) {
         return a.id == appId;
      })[0];

      // the url of object that exclude application id
      var objectUrl = parts.join("/");

      return app.urlResolve(objectUrl);
   }

   ///
   /// Instance Methods
   ///

   languageDefault() {
      return AD.lang.currentLanguage || super.languageDefault() || "en";
   }

   uuid() {
      return OP.Util.uuid();
   }

   cloneDeep(value) {
      return _.cloneDeep(value);
   }

   userRoles(roles) {
      if (roles) {
         _AllUserRoles = roles;
         return;
      }
      return _AllUserRoles;
   }

   /// ABApplication data methods

   /**
    * @method destroy()
    *
    * destroy the current instance of ABApplication
    *
    * also remove it from our _AllApplications
    *
    * @return {Promise}
    */
   destroy() {
      return super
         .destroy()
         .then(() => {
            // TODO:
            // go through any Application Unique objects and
            // make sure they are destroyed as well, like:
            // - interface objects
            // ...

            return Promise.resolve();
         })
         .then(() => {
            _AllApplications.remove(this.id);
         });
   }

   /**
    * @method save()
    *
    * persist the current instance of ABApplication to the DB
    *
    * Also, keep the values in _AllApplications up to date.
    *
    * @return {Promise}
    */
   save() {
      return super.save().then(() => {
         var currEntry = _AllApplications.getItem(this.id);
         if (currEntry) {
            _AllApplications.updateItem(this.id, this);
         } else {
            _AllApplications.add(this, 0);
         }
         return this;
      });
   }

   /**
    * @method toObj()
    *
    * properly compile the current state of this ABApplication instance
    * into the values needed for saving to the DB.
    *
    * Most of the instance data is stored in .json field, so be sure to
    * update that from all the current values of our child fields.
    *
    * @return {json}
    */
   // toObj() {
   //    //// TODO: isn't this an MLObject?

   //    OP.Multilingual.unTranslate(
   //       this,
   //       this.json,
   //       ABApplication.fieldsMultilingual()
   //    );

   //    return super.toObj();
   // }

   /// ABApplication info methods

   /**
    * @method updateInfo()
    *
    * Update label/description of ABApplication
    *
    * @param {array} translations	an array of translations
    *
    * @return {Promise}
    */
   // updateInfo() {
   //    debugger;
   //    return this.save();
   /*
      var values = this.toObj();
      values.json = values.json || {};
      values.json.translations = values.json.translations || [];

      return this.Model.staticData.updateInfo(this.id, {
         isAdminApp: values.isAdminApp,
         isAccessManaged: values.isAccessManaged,
         accessManagers: values.accessManagers,
         translations: values.json.translations
      });
      */
   // }

   /// ABApplication Permission methods

   /**
    * @method assignPermissions()
    *
    * Make sure the current ABApplication permissions match the given
    * array of permissions.
    *
    * @param {array} permItems	an array of role assignments that this
    * 							ABApplication should match.
    * @return {Promise}
    */
   assignPermissions(permItems) {
      return this.Model.staticData.assignPermissions(this.id, permItems);
   }

   /**
    * @method getPermissions()
    *
    * Return an array of role assignments that are currently assigned to this
    * ABApplication.
    *
    * @return {Promise} 	resolve(list) : list {array} Role assignments
    */
   getPermissions() {
      return this.Model.staticData.getPermissions(this.id);
   }

   /**
    * @method createPermission()
    *
    * Create a Role in the system after the name of the current ABApplication.
    *
    * @return {Promise}
    */
   createPermission() {
      // TODO: need to take created role and store as : .json.applicationRole = role.id

      return this.Model.staticData.createPermission(this.id);
   }

   /**
    * @method deletePermission()
    *
    * Remove the Role in the system of the current ABApplication.
    * (the one created by  .createPermission() )
    *
    * @return {Promise}
    */
   deletePermission() {
      // TODO: need to remove created role from : .json.applicationRole

      return this.Model.staticData.deletePermission(this.id);
   }

   ///
   /// Objects
   ///

   objectsAll() {
      return ABDefinition.allObjects().map((d) => {
         return __AllObjects[d.id] ? __AllObjects[d.id] : this.objectNew(d);
      });
   }

   /**
    * @method objectNew()
    *
    * return an instance of a new (unsaved) ABObject that is tied to this
    * ABApplication.
    *
    * NOTE: this new object is not included in our this.objects until a .save()
    * is performed on the object.
    *
    * @return {ABObject}
    */
   objectNew(values) {
      var obj = super.objectNew(values);
      obj.on("destroyed", () => {
         delete __AllObjects[obj.id];
      });
      __AllObjects[obj.id] = obj;
      return obj;
   }

   /**
    * @method objectRemove()
    *
    * remove the current ABObject from our list of .objectIDs.
    * NOTE: this method persists the changes to the server.
    * @param {ABObject} object
    * @return {Promise}
    */
   objectRemove(object) {
      var begLen = this.objectIDs.length;
      this.objectIDs = this.objectIDs.filter((id) => {
         return id != object.id;
      });
      // if there was a change then save this.
      if (begLen != this.objectIDs.length) {
         return this.save();
      }
      return Promise.resolve();
   }

   /**
    * @method objectSave()
    *
    * persist the current ABObject in our list of .objectIDs.
    *
    * @param {ABObject} object
    * @return {Promise}
    */
   objectSave(object) {
      // we need to make sure this object is included in our .objectIDs
      var isIncluded = this.objectIDs.indexOf(object.id) != -1;
      if (!isIncluded) {
         this.objectIDs.push(object.id);
         // Save our own Info:
         return this.save();
      }

      // nothing changed, so nothing to do:
      return Promise.resolve();
   }

   /**
    * @method objectInsert()
    *
    * persist the current ABObject in our list of .objectIDs.
    *
    * @param {ABObject} object
    * @return {Promise}
    */
   objectInsert(object) {
      var isIncluded = this.objectIDs.indexOf(object.id) != -1;
      if (!isIncluded) {
         this.objectIDs.push(object.id);
         // Save our own Info:
         return this.save();
      }
      return Promise.resolve();
   }

   objectGet(id) {
      console.error("ABApplication.objectGet(): refactor this!");

      return new Promise((resolve, reject) => {
         debugger;
         this.Model.staticData
            .objectGet(id)
            .catch(reject)
            .then((object) => {
               if (object) {
                  resolve(this.objectNew(object, this));
               } else {
                  resolve(null);
               }
            });
      });
   }

   objectFind(cond) {
      console.error("ABApplication.objectFind(): refactor this!");

      return new Promise((resolve, reject) => {
         debugger;
         this.Model.staticData
            .objectFind(cond)
            .catch(reject)
            .then((objects) => {
               if (objects && objects.forEach) {
                  let result = [];

                  objects.forEach((obj) => {
                     if (obj) result.push(this.objectNew(obj, this));
                  });

                  resolve(result);
               } else {
                  resolve(null);
               }
            });
      });
   }

   objectInfo(cond) {
      return new Promise((resolve, reject) => {
         debugger;
         this.Model.staticData
            .objectInfo(cond)
            .catch(reject)
            .then((objects) => {
               let result = [];

               (objects || []).forEach((obj) => {
                  result.push(this.objectNew(obj));
               });

               resolve(result);
            });
      });
   }
   /*
   objectImport(objectId) {
      return new Promise((resolve, reject) => {
         debugger;
         this.Model.staticData
            .objectImport(this.id, objectId)
            .catch(reject)
            .then((newObj) => {
               let refreshTasks = [];

               // add connect field to exist objects
               // (newObj.fields || []).forEach((f) => {
               (newObj.fieldIDs || []).forEach((id) => {
                  var f = ABDefinition.definition(id);

                  if (f && f.key == "connectObject") {
                     let linkObject = this.objects(
                        (obj) => obj.id == f.settings.linkObject
                     )[0];
                     if (linkObject) {
                        refreshTasks.push(this.objectRefresh(linkObject.id));
                     }
                  }
               });

               Promise.all(refreshTasks)
                  .catch(reject)
                  .then(() => {
                     // add to list
                     var newObjClass = this.objectNew(newObj);
                     this._objects.push(newObjClass);

                     resolve(newObjClass);
                  });
            });
      });
   }

   objectExclude(objectId) {
      debugger;
      return new Promise((resolve, reject) => {
         // this.Model.staticData
         //     .objectExclude(this.id, objectId)
         //     .catch(reject)
         //     .then(() => {
         // exclude object from application
         // let remainObjects = this.objects((o) => o.id != objectId);
         // this._objects = remainObjects;
         this.objectIDs = this.objectIDs.filter((id) => {
            return id != objectId;
         });

         // exclude conected fields who link to this object
         // this.objects().forEach((obj) => {
         //     let remainFields = obj.fields((f) => {
         //         if (
         //             f.key == "connectObject" &&
         //             f.settings &&
         //             f.settings.linkObject == objectId
         //         ) {
         //             return false;
         //         } else {
         //             return true;
         //         }
         //     }, true);
         //     obj._fields = remainFields;
         // });

         resolve();
         // });
      });
   }
*/
   objectRefresh(objectId) {
      return new Promise((resolve, reject) => {
         debugger;
         this.Model.staticData
            .objectGet(objectId)
            .catch(reject)
            .then((object) => {
               this.objects().forEach((obj, index) => {
                  if (obj.id == objectId) {
                     this._objects[index] = this.objectNew(object);
                  }
               });

               resolve();
            });
      });
   }

   ///
   /// Fields
   ///

   ///
   /// Pages
   ///

   /**
    * @method pageNew()
    *
    * return an instance of a new (unsaved) ABViewPage that is tied to this
    * ABApplication.
    *
    * NOTE: this new page is not included in our this.pages until a .save()
    * is performed on the page.
    *
    * @return {ABViewPage}
    */
   pageNew(values) {
      // make sure this is an ABViewPage description
      values.key = ABViewPage.common().key;

      return new ABViewManager.newView(values, this, null);
   }

   /**
    * @method viewNew()
    *
    * return an ABView based upon the given values.
    *
    *
    * @param {obj} values  an object (containing setup info) for the view you
    *						are requesting.
    *						values.key {string}  the unique key for which view
    * @param {ABApplication} application  the current ABApplication instance for
    *						this application.
    * @param {ABView} parent  the ABView that is the parent of this view you are
    * 						requesting.
    * @return {ABView}
    */
   viewNew(values, application, parent) {
      return ABViewManager.newView(values, application, parent);
   }

   /**
    * @method viewAll()
    *
    * return a list of all the views available.
    *
    * @return {array} of ABView objects
    */
   viewAll() {
      return ABViewManager.allViews();
   }

   /**
    * @method viewDestroy()
    *
    * remove the current ABView from our list of ._pages or ._views.
    *
    * @param {ABView} view
    * @return {Promise}
    */
   viewDestroy(view) {
      // return this.save();

      var resolveUrl = view.urlPointer();

      return this.Model.staticData.viewDestroy(this.id, resolveUrl).then(() => {
         // TODO : Should update _AllApplications in
      });
   }

   /**
    * @method viewSave()
    *
    * persist the current ABView in our list of ._pages or ._views.
    *
    * @param {ABView} view
    * @param {Boolean} includeSubViews
    * @param {Boolean} ignoreUiUpdate
    *
    * @return {Promise}
    */
   viewSave(view, includeSubViews = false, updateUi = true) {
      // var isIncluded = (this.pages(function (p) { return p.id == page.id }).length > 0);
      // if (!isIncluded) {
      // 	this._pages.push(page);
      // }

      var resolveUrl = view.urlPointer(),
         data = view.toObj();

      // return this.save();
      return this.Model.staticData
         .viewSave(this.id, resolveUrl, data, includeSubViews)
         .then(() => {
            // TODO : Should update _AllApplications in

            // Trigger a update event to the live display page
            let rootPage = view.pageRoot();
            if (rootPage && updateUi) {
               AD.comm.hub.publish("ab.interface.update", {
                  rootPageId: rootPage.id
               });
            }
         });
   }

   /**
    * @method viewReorder()
    *
    * save order of ._views.
    *
    * @param {ABView} view
    * @return {Promise}
    */
   viewReorder(view) {
      let resolveUrl = view.urlPointer(),
         data = (view.views() || []).map((v) => {
            return {
               id: v.id,
               position: v.position
            };
         });

      return this.Model.staticData
         .viewReorder(this.id, resolveUrl, data)
         .then(() => {
            // TODO : Should update _AllApplications in

            // Trigger a update event to the live display page
            let rootPage = view.pageRoot();
            if (rootPage) {
               AD.comm.hub.publish("ab.interface.update", {
                  rootPageId: rootPage.id
               });
            }
         });
   }

   /**
    * @method urlPage()
    * return the url pointer for pages in this application.
    * @return {string}
    */
   urlPage() {
      return this.urlPointer() + "_pages/";
   }

   ///
   /// Queries
   ///

   queriesAll() {
      return ABDefinition.allQueries().map((d) => {
         return __AllQueries[d.id] ? __AllQueries[d.id] : this.queryNew(d);
      });
   }

   // queryLoad() {
   //    if (this.loadedQueries) return Promise.resolve();
   //    debugger;
   //    //// REFACTOR THIS:

   //    return new Promise((resolve, reject) => {
   //       this.Model.staticData
   //          .queryLoad(this.id)
   //          .catch(reject)
   //          .then((queries) => {
   //             this.loadedQueries = true;

   //             var newQueries = [];
   //             (queries || []).forEach((query) => {
   //                // prevent processing of null values.
   //                if (query) {
   //                   newQueries.push(this.queryNew(query));
   //                }
   //             });
   //             this._queries = newQueries;

   //             resolve();
   //          });
   //    });
   // }

   // queryGet(id) {
   //    debugger;
   //    // REFACTOR THIS!!

   //    return new Promise((resolve, reject) => {
   //       var query = this.queries((q) => {
   //          return q.id == id;
   //       })[0];

   //       resolve(query);
   //    });
   // }

   // queryFind(cond) {
   //    debugger;
   //    //// REFACTOR THIS???
   //    return new Promise((resolve, reject) => {
   //       this.Model.staticData
   //          .queryFind(cond)
   //          .catch(reject)
   //          .then((queries) => {
   //             if (queries && queries.forEach) {
   //                let result = [];

   //                queries.forEach((q) => {
   //                   if (q) result.push(this.queryNew(q, this));
   //                });

   //                resolve(result);
   //             } else {
   //                resolve(null);
   //             }
   //          });
   //    });
   // }

   // queryInfo(cond) {
   //    debugger;
   //    // REFACTOR THIS!!!

   //    return this.Model.staticData.queryInfo(cond);
   // }

   /**
    * @method queryNew()
    *
    * return an instance of a new (unsaved) ABObjectQuery that is tied to this
    * ABApplication.
    *
    * NOTE: this new object is not included in our this.objects until a .save()
    * is performed on the object.
    *
    * @return {ABObjectQuery}
    */
   queryNew(values) {
      var query = new ABObjectQuery(values, this);
      query.on("destroyed", () => {
         delete __AllQueries[query.id];
      });
      __AllQueries[query.id] = query;
      return query;
   }

   /**
    * @method queryRemove()
    *
    * remove the current ABObjectQuery from our list of .queryIDs.
    *
    * @param {ABObject} query
    * @return {Promise}
    */
   queryRemove(query) {
      var begLen = this.queryIDs.length;
      this.queryIDs = this.queryIDs.filter((id) => {
         return id != query.id;
      });
      // if there was a change then save this.
      if (begLen != this.queryIDs.length) {
         return this.save();
      }
      return Promise.resolve();
   }

   /**
    * @method queryInsert()
    *
    * persist the current ABObjectQuery in our list of ._queries.
    *
    * @param {ABObjectQuery} query
    * @return {Promise}
    */
   queryInsert(query) {
      var isIncluded = this.queryIDs.indexOf(query.id) != -1;
      if (!isIncluded) {
         this.queryIDs.push(query.id);
         // Save our own Info:
         return this.save();
      }
      return Promise.resolve();
   }

   // queryImport(queryId) {
   //    debugger;
   //    // REFACTOR THIS!

   //    return new Promise((resolve, reject) => {
   //       this.Model.staticData
   //          .queryImport(this.id, queryId)
   //          .catch(reject)
   //          .then((newQuery) => {
   //             let newQueryClass = this.queryNew(newQuery);

   //             // add to list
   //             var isIncluded =
   //                this.queries((q) => q.id == newQuery.id).length > 0;
   //             if (!isIncluded) {
   //                this._queries.push(newQueryClass);
   //             }

   //             resolve(newQueryClass);
   //          });
   //    });
   // }

   // queryExclude(queryId) {
   //    debugger;
   //    // REFACTOR THIS!!!

   //    return new Promise((resolve, reject) => {
   //       this.Model.staticData
   //          .queryExclude(this.id, queryId)
   //          .catch(reject)
   //          .then(() => {
   //             // remove query from list
   //             this._queries = this.queries((q) => q.id != queryId);

   //             resolve();
   //          });
   //    });
   // }

   ///
   /// Data collections
   ///

   datacollectionLoad() {
      debugger;
      if (this.loadedDatacollection) return Promise.resolve();

      return new Promise((resolve, reject) => {
         this.Model.staticData
            .datacollectionLoad(this.id)
            .catch(reject)
            .then((datacollections) => {
               this.loadedDatacollection = true;

               var newDatacollections = [];
               (datacollections || []).forEach((datacollection) => {
                  // prevent processing of null values.
                  if (datacollection) {
                     newDatacollections.push(
                        this.datacollectionNew(datacollection)
                     );
                  }
               });
               this._datacollections = newDatacollections;

               // Initial data views
               this.datacollections().forEach((datacollection) => {
                  if (datacollection) datacollection.init();
               });

               resolve();
            });
      });
   }

   datacollectionFind(cond) {
      return new Promise((resolve, reject) => {
         this.Model.staticData
            .datacollectionFind(cond)
            .catch(reject)
            .then((datacollections) => {
               var result = [];

               (datacollections || []).forEach((datacollection) => {
                  // prevent processing of null values.
                  if (datacollection) {
                     result.push(this.datacollectionNew(datacollection, this));
                  }
               });

               resolve(result);
            });
      });
   }

   datacollectionInfo(cond) {
      return this.Model.staticData.datacollectionInfo(cond);
   }

   datacollectionsAll() {
      return ABDefinition.allDatacollections().map((d) => {
         return __AllDatacollections[d.id]
            ? __AllDatacollections[d.id]
            : this.datacollectionNew(d);
      });
   }

   datacollectionNew(values) {
      var dc = new ABDataCollection(values, this);
      dc.on("destroyed", () => {
         delete __AllDatacollections[dc.id];
      });
      __AllDatacollections[dc.id] = dc;
      return dc;
   }

   /**
    * @method datacollectionInsert()
    * persist the current ABDatacollection in our list of .datacollectionIDs.
    * @param {ABDatacollection} datacollection
    * @return {Promise}
    */
   datacollectionInsert(datacollection) {
      var isIncluded = this.datacollectionIDs.indexOf(datacollection.id) != -1;
      if (!isIncluded) {
         this.datacollectionIDs.push(datacollection.id);
         // Save our own Info:
         return this.save();
      }
      return Promise.resolve();
   }

   /**
    * @method datacollectionRemove()
    *
    * remove the current ABDataCollection from our list of .datacollectionIDs.
    *
    * @param {ABObject} datacollection
    * @return {Promise}
    */
   datacollectionRemove(datacollection) {
      var begLen = this.datacollectionIDs.length;
      this.datacollectionIDs = this.datacollectionIDs.filter((id) => {
         return id != datacollection.id;
      });
      // if there was a change then save this.
      if (begLen != this.datacollectionIDs.length) {
         return this.save();
      }
      return Promise.resolve();
   }

   /**
    * @method datacollectionDestroy()
    *
    * remove the current ABDatacollection from our list of ._datacollections.
    *
    * @param {ABDatacollection} datacollection
    * @return {Promise}
    */
   datacollectionDestroy(datacollection) {
      var remaininDatacollections = this.datacollections(
         (dView) => dView.id != datacollection.id
      );
      this._datacollections = remaininDatacollections;

      return this.Model.staticData.datacollectionDestroy(datacollection.id);
   }

   /**
    * @method datacollectionSave()
    *
    * persist the current ABDatacollection in our list of ._datacollections.
    *
    * @param {ABDatacollection} datacollection
    * @return {Promise}
    */
   datacollectionSave(datacollection) {
      var isIncluded =
         this.datacollections((dView) => dView.id == datacollection.id).length >
         0;
      if (!isIncluded) {
         this._datacollections.push(datacollection);
      }

      return this.Model.staticData.datacollectionSave(
         this.id,
         datacollection.toObj()
      );
   }

   datacollectionImport(datacollectionId) {
      return new Promise((resolve, reject) => {
         this.Model.staticData
            .datacollectionImport(this.id, datacollectionId)
            .catch(reject)
            .then((newDatacollection) => {
               let newDatacollectionClass = this.datacollectionNew(
                  newDatacollection
               );

               // add to list
               var isIncluded =
                  this.datacollections((q) => q.id == newDatacollection.id)
                     .length > 0;
               if (!isIncluded) {
                  this._datacollections.push(newDatacollectionClass);
               }

               resolve(newDatacollectionClass);
            });
      });
   }

   datacollectionExclude(datacollectionId) {
      return new Promise((resolve, reject) => {
         this.Model.staticData
            .datacollectionExclude(this.id, datacollectionId)
            .catch(reject)
            .then(() => {
               // remove query from list
               this._datacollections = this.datacollections(
                  (dc) => dc.id != datacollectionId
               );

               resolve();
            });
      });
   }

   /**
    * @function livepage
    * Get application who includes data view list
    * This function is used in the live display
    *
    * @param {uuid} appID
    * @param {uuid} pageID
    *
    * @return {Promise}
    */
   static livepage(appID, pageID) {
      return new Promise((resolve, reject) => {
         var ModelApplication = OP.Model.get("opstools.BuildApp.ABApplication");
         ModelApplication.Models(ABApplication); // set the Models  setting.

         ModelApplication.staticData
            .livepage(appID, pageID)
            .catch(reject)
            .then(function(app) {
               if (app) resolve(new ABApplication(app));
               else resolve();
            });
      });
   }

   ///
   /// Mobile App
   ///

   /**
    * @method mobileAppNew()
    *
    * return an instance of a new (unsaved) ABMobileApp that is tied to this
    * ABApplication.
    *
    * NOTE: this new app is not included in our this.mobileApp until a .save()
    * is performed on the App.
    *
    * @return {ABMobileApp}
    */
   mobileAppNew(values) {
      return new ABMobileApp(values, this);
   }

   /**
    * @method mobileAppDestroy()
    *
    * remove the current ABMobileApp from our list of ._mobileApps.
    *
    * @param {ABMobileApp} app
    * @return {Promise}
    */
   mobileAppDestroy(app) {
      var remaininApps = this.mobileApps(function(a) {
         return a.id != app.id;
      });
      this._mobileApps = remaininApps;

      return this.Model.staticData
         .mobileAppDestroy(this.id, app.id)
         .then(() => {
            // TODO : Should update _AllApplications in
         });
   }

   /**
    * @method mobileAppSave()
    *
    * persist the current ABOMobileApp in our list of ._mobileApps.
    *
    * @param {ABOMobileApp} app
    * @return {Promise}
    */
   mobileAppSave(app) {
      var isIncluded =
         this.mobileApps(function(a) {
            return a.id == app.id;
         }).length > 0;
      if (!isIncluded) {
         this._mobileApps.push(app);
      }

      return this.Model.staticData
         .mobileAppSave(this.id, app.toObj())
         .then(() => {
            // TODO : Should update _AllApplications in
         })
         .catch(() => {
            console.error("!!! error with .ABApplication.mobileAppSave()");
         });
   }

   ///
   /// Processes
   ///

   /**
    * @method processNew(id)
    *
    * return an instance of a new ABProcess that is tied to this
    * ABApplication.
    *
    * NOTE: this new app is not included in our this.mobileApp until a .save()
    * is performed on the App.
    *
    * @return {ABMobileApp}
    */
   processNew(id) {
      var processDef = ABDefinition.definition(id);
      if (processDef) {
         return new ABProcess(processDef, this);
      }
      return null;
   }

   /**
    * @method processCreate()
    *
    * create a new Process tied to this Application.
    * and update our references to point to this process.
    *
    * @return {Promise}  resolved with an {ABProcess}
    */
   processCreate(json) {
      var newProcess = new ABProcess(json, this);
      return newProcess
         .save()
         .then(() => {
            this.processIDs.push(newProcess.id);
            this._processes.push(newProcess);
            return this.save();
         })
         .then(() => {
            return newProcess;
         });
   }

   /**
    * @method processRemove()
    *
    * update our references to no longer point to this process.
    *
    * NOTE: it doesn't delete the process. Just excludes it from our list.
    *
    * @return {Promise}  resolved with an {}
    */
   processRemove(Process) {
      // remove references to the Process:
      this.processIDs = this.processIDs.filter((pid) => {
         return pid != Process.id;
      });
      this._processes = this._processes.filter((p) => {
         return p.id != Process.id;
      });
      return this.save();
   }

   ///
   /// Process Elements:
   /// All process objects are stored as an internal Element:
   ///

   /**
    * @method processElementNew(id)
    *
    * return an instance of a new ABProcessOBJ that is tied to this
    * ABApplication->ABProcess.
    *
    * @param {string} id the ABDefinition.id of the element we are creating
    * @param {ABProcess} process the process this task is a part of.
    * @return {ABProcessTask}
    */
   processElementNew(id, process) {
      var taskDef = ABDefinition.definition(id);
      if (taskDef) {
         switch (taskDef.type) {
            case ABProcessParticipant.defaults().type:
               return new ABProcessParticipant(taskDef, process, this);
               break;

            case ABProcessLane.defaults().type:
               return new ABProcessLane(taskDef, process, this);
               break;

            default:
               // default to a Task
               return ABProcessTaskManager.newTask(taskDef, process, this);
               break;
         }
      }
      return null;
   }

   /**
    * @method processElementNewForModelDefinition(def)
    *
    * return an instance of a new ABProcess[OBJ] that is tied to the given
    * BPMI:Element definition.
    *
    * @param {BPMI:Element} element the element definition from our BPMI
    *              modler.
    * @return {ABProcess[OBJ]}
    */
   processElementNewForModelDefinition(element, process) {
      var newElement = null;

      switch (element.type) {
         case "bpmn:Participant":
            newElement = new ABProcessParticipant({}, process, this);
            break;

         case "bpmn:Lane":
            newElement = new ABProcessLane({}, process, this);
            break;

         default:
            var defaultDef = ABProcessTaskManager.definitionForElement(element);
            if (defaultDef) {
               newElement = ABProcessTaskManager.newTask(
                  defaultDef,
                  process,
                  this
               );
            }
            break;
      }

      // now make sure this new Obj pulls any relevant info from the
      // diagram element
      if (newElement) {
         newElement.fromElement(element);
      }
      return newElement;
   }
};
