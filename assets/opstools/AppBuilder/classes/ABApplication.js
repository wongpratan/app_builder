
// import OP from "OP"
import ABApplicationBase from "./ABApplicationBase"
import "../data/ABApplication"
import ABObject from "./ABObject"
import ABObjectQuery from "./ABObjectQuery"
import ABMobileApp from "./ABMobileApp"
import ABViewManager from "./ABViewManager"
import ABViewPage from "./views/ABViewPage"
import ABViewReportPage from "./views/ABViewReportPage"
import ABViewReport from "./views/ABViewReport"

var _AllApplications = [];


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

export default class ABApplication extends ABApplicationBase {

	constructor(attributes) {
		super(attributes);


		// multilingual fields: label, description
		OP.Multilingual.translate(this, this.json, ABApplication.fieldsMultilingual());

		// instance keeps a link to our Model for .save() and .destroy();
		this.Model = OP.Model.get('opstools.BuildApp.ABApplication');

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
	static allApplications() {
		return new Promise(
			(resolve, reject) => {

				var ModelApplication = OP.Model.get('opstools.BuildApp.ABApplication');
				ModelApplication.Models(ABApplication); // set the Models  setting.

				ModelApplication.findAll()
					.then(function (data) {

						// NOTE: data is already a DataCollection from .findAll()
						_AllApplications = data;

						resolve(data);
					})
					.catch(reject);

			}
		)
	}


	/**
	 * @function getApplicationById
	 *
	 *
	 * @return {Promise}
	 */
	static getApplicationById(id) {
		return new Promise(
			(resolve, reject) => {

				var ModelApplication = OP.Model.get('opstools.BuildApp.ABApplication');
				ModelApplication.Models(ABApplication); // set the Models  setting.

				ModelApplication.findAll({ id: id })
					.then(function (data) {

						resolve(data.getItem(data.getFirstId()));
					})
					.catch(reject);

			}
		)
	}


	/**
	 * @function create
	 *
	 * take the initial values and create an instance of ABApplication.
	 *
	 * @return {Promise}
	 */
	static create(values) {
		return new Promise(
			function (resolve, reject) {

				var newApp = {}
				OP.Multilingual.unTranslate(values, newApp, ABApplication.fieldsMultilingual());
				values.json = newApp;
				newApp.name = values.name;

				var ModelApplication = OP.Model.get('opstools.BuildApp.ABApplication');
				ModelApplication.create(values)
					.then(function (app) {

						// return an instance of ABApplication
						var App = new ABApplication(app);

						_AllApplications.add(App, 0);
						resolve(App);
					})
					.catch(reject)
			}
		)
	}




	//// TODO: Refactor isValid() to ignore op and not error if duplicateName is own .id

	static isValid(op, values) {

		var validator = OP.Validation.validator();

		// during an ADD operation
		if (op == 'add') {

			// label/name must be unique:
			var arrayApplications = toArray(_AllApplications);

			var nameMatch = values.label.trim().replace(/ /g, '_').toLowerCase();
			var matchingApps = arrayApplications.filter(function (app) {
				return app.name.trim().toLowerCase() == nameMatch;
			})
			if (matchingApps && matchingApps.length > 0) {

				validator.addError('label', L('ab_form_application_duplicate_name', "*Name (#name#) is already in use").replace('#name#', nameMatch))
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

		// #/3/_objects/6eb3121b-1208-4c49-ae45-fcf722bd6db1
		var parts = resolveUrl.split('/');

		// get id of application
		var appId = parts.splice(1, 1)[0];

		// pull an application
		var app = _AllApplications.find(function(a) { return a.id == appId; })[0];

		// the url of object that exclude application id
		var objectUrl = parts.join('/');

		return app.urlResolve(objectUrl);
	}




	///
	/// Instance Methods
	///


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
		if (this.id) {
			return this.Model.destroy(this.id)
				.then(() => {
					_AllApplications.remove(this.id);
				});
		}
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

		var values = this.toObj();

		// we already have an .id, so this must be an UPDATE
		if (values.id) {

			return this.Model.update(values.id, values)
				.then(() => {
					_AllApplications.updateItem(values.id, this);
				});

		} else {

			// must be a CREATE:
			return this.Model.create(values)
				.then((data) => {
					this.id = data.id;
					_AllApplications.add(this, 0);
				});
		}

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
	toObj() {

		OP.Multilingual.unTranslate(this, this.json, ABApplication.fieldsMultilingual());

		return super.toObj();
	}


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
	updateInfo () {

		var values = this.toObj();
		values.json = values.json || {};
		values.json.translations = values.json.translations || [];

		return this.Model.staticData.updateInfo(this.id, {
			isAdminApp: values.isAdminApp,
			translations: values.json.translations
		});

	}

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
		return new ABObject(values, this);
	}


	/**
	 * @method objectDestroy()
	 *
	 * remove the current ABObject from our list of ._objects.
	 *
	 * @param {ABObject} object
	 * @return {Promise}
	 */
	objectDestroy(object) {

		var remaininObjects = this.objects(function (o) { return o.id != object.id; })
		this._objects = remaininObjects;

		return this.Model.staticData.objectDestroy(object.id)
			.then(() => {
				// TODO : Should update _AllApplications in 
			});
	}


	/**
	 * @method objectSave()
	 *
	 * persist the current ABObject in our list of ._objects.
	 *
	 * @param {ABObject} object
	 * @return {Promise}
	 */
	objectSave(object) {
		var isIncluded = (this.objects(function (o) { return o.id == object.id }).length > 0);
		if (!isIncluded) {
			this._objects.push(object);
		}

		// update
		return this.Model.staticData.objectSave(this.id, object.toObj())
			.then(() => {
				// TODO : Should update _AllApplications in 
			})
			.catch(()=>{
				console.error('!!! error with .ABApplication.objectSave()');
			});

	}

	objectOther() {

		return this.Model.staticData.objectOther(this.id);

	}

	objectImport(objectId) {

		return new Promise((resolve, reject) => {

			this.Model.staticData.objectImport(this.id, objectId)
			.catch(reject)
			.then(newObj => {

				let refreshTasks = [];

				// add connect field to exist objects
				(newObj.fields || []).forEach(f => {

					if (f.key == 'connectObject') {

						let linkObject = this.objects(obj => obj.id == f.settings.linkObject)[0];
						if (linkObject) {
							refreshTasks.push(this.objectRefresh(linkObject.id));
						}

					}

				});

				Promise.all(refreshTasks)
					.catch(reject)
					.then(() => {

						// add to list
						this._objects.push(newObj);

						resolve(newObj);

					});

			});

		});

	}

	objectExclude(objectId) {

		return new Promise((resolve, reject) => {

			this.Model.staticData.objectExclude(this.id, objectId)
			.catch(reject)
			.then(() => {

				// exclude object from application
				let remainObjects = this.objects(o => o.id != objectId);
				this._objects = remainObjects;

				// exclude conected fields who link to this object
				this.objects().forEach(obj => {

					let remainFields = obj.fields(f => {

						if (f.key == 'connectObject' &&
							f.settings &&
							f.settings.linkObject == objectId) {
							return false;
						}
						else {
							return true;
						}

					});
					obj._fields = remainFields;

				});


				resolve();

			});

		});

	}

	objectRefresh(objectId) {

		return new Promise((resolve, reject) => {

			this.Model.staticData.objectGet(this.id, objectId)
			.catch(reject)
			.then(object => {

				this.objects().forEach((obj, index) => {

					if (obj.id == objectId) {
						this._objects[index] = new ABObject(object, this);
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
		if (values.key != ABViewPage.common().key &&
			values.key != ABViewReportPage.common().key &&
			values.key != ABViewReport.common().key)
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
	 * @method pageDestroy()
	 *
	 * remove the current ABViewPage from our list of ._pages.
	 *
	 * @param {ABViewPage} page
	 * @return {Promise}
	 */
	pageDestroy(page) {

		// return this.save();

		var resolveUrl = page.urlPointer();

		return this.Model.staticData.pageDestroy(this.id, resolveUrl)
			.then(() => {
				// TODO : Should update _AllApplications in 
			});

	}



	/**
	 * @method pageSave()
	 *
	 * persist the current ABViewPage in our list of ._pages.
	 *
	 * @param {ABViewPage} object
	 * @return {Promise}
	 */
	pageSave(page) {
		// var isIncluded = (this.pages(function (p) { return p.id == page.id }).length > 0);
		// if (!isIncluded) {
		// 	this._pages.push(page);
		// }

		var resolveUrl = page.urlPointer(),
			data = page.toObj();

		// return this.save();
		return this.Model.staticData.pageSave(this.id, resolveUrl, data)
			.then(() => {

				// TODO : Should update _AllApplications in 

				// Trigger a update event to the live display page
				AD.comm.hub.publish('ab.interface.update', {
					rootPage: page.pageRoot()	// instance of the root page
				});

			});

	}



	/**
	 * @method urlPage()
	 * return the url pointer for pages in this application.
	 * @return {string} 
	 */
	urlPage() {
		return this.urlPointer() + '_pages/'
	}




	///
	/// Queries
	///

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

		return new ABObjectQuery(values, this);
	}


	/**
	 * @method queryDestroy()
	 *
	 * remove the current ABObjectQuery from our list of ._queries.
	 *
	 * @param {ABObject} query
	 * @return {Promise}
	 */
	queryDestroy(query) {

		var remaininQueries = this.queries(function (q) { return q.id != query.id; })
		this._queries = remaininQueries;

		return this.Model.staticData.queryDestroy(query.id)
			.then(() => {
				// TODO : Should update _AllApplications in 
			});
	}


	/**
	 * @method querySave()
	 *
	 * persist the current ABObjectQuery in our list of ._queries.
	 *
	 * @param {ABObjectQuery} query
	 * @return {Promise}
	 */
	querySave(query) {
		var isIncluded = (this.queries(function (q) { return q.id == query.id }).length > 0);
		if (!isIncluded) {
			this._queries.push(query);
		}

		return this.Model.staticData.querySave(query.toObj())
			.then(() => {
				// TODO : Should update _AllApplications in 
			})
			.catch(()=>{
				console.error('!!! error with .ABApplication.querySave()');
			});
	}

	queryImport(queryId) {

		return new Promise((resolve, reject) => {

			this.Model.staticData.queryImport(this.id, queryId)
				.catch(reject)
				.then(newQuery => {

					// add to list
					var isIncluded = (this.queries(q => q.id == newQuery.id).length > 0);
					if (!isIncluded) {
						this._queries.push(newQuery);
					}

					resolve(newQuery);

				});

		});

	}

	queryExclude(queryId) {

		return new Promise((resolve, reject) => {

			this.Model.staticData.queryExclude(this.id, queryId)
				.catch(reject)
				.then(() => {

					// remove query from list
					this._queries = this.queries(q => q.id != queryId);

					resolve();

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

		var remaininApps = this.mobileApps(function (a) { return a.id != app.id; })
		this._mobileApps = remaininApps;

		return this.Model.staticData.mobileAppDestroy(this.id, app.id)
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
		var isIncluded = (this.mobileApps(function (a) { return a.id == app.id }).length > 0);
		if (!isIncluded) {
			this._mobileApps.push(app);
		}

		return this.Model.staticData.mobileAppSave(this.id, app.toObj())
			.then(() => {
				// TODO : Should update _AllApplications in 
			})
			.catch(()=>{
				console.error('!!! error with .ABApplication.mobileAppSave()');
			});
	}


}

// export to ABLiveTool
window.ABApplication = ABApplication;
