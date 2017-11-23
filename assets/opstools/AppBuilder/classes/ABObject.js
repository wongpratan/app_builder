

import ABApplication from "./ABApplication"
import ABObjectBase from "./ABObjectBase"

// import OP from "OP"
import ABFieldManager from "./ABFieldManager"
import ABModel from "./ABModel"


function L(key, altText) {
	return AD.lang.label.getLabel(key) || altText;
}

export default class ABObject extends ABObjectBase {

    constructor(attributes, application) {
    	super(attributes, application);
/*
{
	id: uuid(),
	name: 'name',
	labelFormat: 'xxxxx',
	isImported: 1/0,
	urlPath:'string',
	importFromObject: 'string', // JSON Schema style reference:  '#[ABApplication.id]/objects/[ABObject.id]'
								// to get other object:  ABApplication.objectFromRef(obj.importFromObject);
	translations:[
		{}
	],
	fields:[
		{ABDataField}
	]
}
*/

    	// multilingual fields: label, description
    	OP.Multilingual.translate(this, this, ['label']);

  	}



  	///
  	/// Static Methods
  	///
  	/// Available to the Class level object.  These methods are not dependent
  	/// on the instance values of the Application.
  	///



//// TODO: Refactor isValid() to ignore op and not error if duplicateName is own .id

	isValid() {

		var validator = OP.Validation.validator();


		// label/name must be unique:
		var isNameUnique = (this.application.objects((o) => { return o.name.toLowerCase() == this.name.toLowerCase(); }).length == 0);
		if (!isNameUnique) {
			validator.addError('name', L('ab.validation.object.name.unique', 'Object name must be unique (#name# already used in this Application)').replace('#name#', this.name) );
// errors = OP.Form.validationError({
// 		name:'name',
// 		message:L('ab.validation.object.name.unique', 'Object name must be unique (#name# already used in this Application)').replace('#name#', this.name),
// 	}, errors);
		}


			// Check the common validations:
// TODO:
// if (!inputValidator.validate(values.label)) {
// 	_logic.buttonSaveEnable();
// 	return false;
// }

		return validator;
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
	destroy () {
		return new Promise(
			(resolve, reject) => {

				// OK, some of our Fields have special follow up actions that need to be
				// considered when they no longer exist, so before we simply drop this
				// object/table, drop each of our fields and give them a chance to clean up
				// what needs cleaning up.

				// ==> More work, but safer.
				var fieldDrops = [];
				this.fields().forEach((f)=>{
					fieldDrops.push(f.destroy());
				})

				Promise.all(fieldDrops)
				.then(()=>{

					// now drop our table
					// NOTE: our .migrateXXX() routines expect the object to currently exist
					// in the DB before we perform the DB operations.  So we need to
					// .migrateDrop()  before we actually .objectDestroy() this.
					this.migrateDrop()
					.then(()=>{

						// finally remove us from the application storage
						return this.application.objectDestroy(this);

					})
					.then(resolve)
					.catch(reject);

				})
				.catch(reject);

			}
		);
	}


	/**
	 * @method save()
	 *
	 * persist this instance of ABObject with it's parent ABApplication
	 *
	 *
	 * @return {Promise}
	 *						.resolve( {this} )
	 */
	save () {

		return new Promise(
			(resolve, reject) => {

				var isAdd = false;

				// if this is our initial save()
				if (!this.id) {

					this.id = OP.Util.uuid();	// setup default .id
					this.label = this.label || this.name;
					this.urlPath = this.urlPath || this.application.name + '/' + this.name;
					isAdd = true;
				}

				this.application.objectSave(this)
				.then(() => {

					if (isAdd) {

						// on a Create: trigger a migrateCreate object
						this.migrateCreate()
						.then(()=>{
							resolve(this);
						}, reject);

					} else {
						resolve(this);
					}

				})
				.catch(function(err){
					reject(err);
				})
			}
		)
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
	toObj () {

		OP.Multilingual.unTranslate(this, this, ["label"]);

		return super.toObj();
	}




	///
	/// DB Migrations
	///

	migrateCreate() {
		var url = '/app_builder/migrate/application/#appID#/object/#objID#'
			.replace('#appID#', this.application.id)
			.replace('#objID#', this.id);

		return OP.Comm.Service.post({
			url: url
		})
	}


	migrateDrop() {
		var url = '/app_builder/migrate/application/#appID#/object/#objID#'
			.replace('#appID#', this.application.id)
			.replace('#objID#', this.id);

		return OP.Comm.Service['delete']({
			url: url
		})
	}


	///
	/// Fields
	///


	/**
	 * @method fieldNew()
	 *
	 * return an instance of a new (unsaved) ABField that is tied to this
	 * ABObject.
	 *
	 * NOTE: this new field is not included in our this.fields until a .save()
	 * is performed on the field.
	 *
	 * @return {ABField}
	 */
	fieldNew ( values ) {
		// NOTE: ABFieldManager returns the proper ABFieldXXXX instance.
		return ABFieldManager.newField( values, this );
	}



	///
	/// Working with Client Components:
	///


	// return the column headers for this object
	// @param {bool} isObjectWorkspace  return the settings saved for the object workspace
	columnHeaders (isObjectWorkspace) {

		var headers = [];
		var columnNameLookup = {};

		// get the header for each of our fields:
		this._fields.forEach(function(f){
			var header = f.columnHeader(isObjectWorkspace);
			if (f.settings.width != 0) {
				// set column width to the customized width
				header.width = f.settings.width;
			} else {
				// set column width to adjust:true by default;
				header.adjust = true;
			}
			headers.push(header);
			columnNameLookup[header.id] = f.columnName;	// name => id
		})


		// update our headers with any settings applied in the Object Workspace
		if (isObjectWorkspace) {

			// hide any hiddenfields
			if (this.workspaceHiddenFields.length > 0) {
				this.workspaceHiddenFields.forEach((hfID)=>{
					headers.forEach((h)=> {
						if (columnNameLookup[h.id] == hfID){
							h.hidden = true;
						}
					})
				});
			}
		}

		return headers;
	}



	// after a component has rendered, tell each of our fields to perform
	// any custom display operations
	// @param {Webix.DataStore} data a webix datastore of all the rows effected
	//        by the render.
	customDisplays(data, App, DataTable, ids, isEditable) {
		var fields = this.fields();

		if (!data || !data.getFirstId) return;

		if (ids != null) {
			var ids = ids;
			ids.forEach((id)=>{
				var row = data.getItem(id);
				fields.forEach((f)=>{
					if (this.objectWorkspace.hiddenFields.indexOf(f.columnName) == -1) {
						var node = DataTable.getItemNode({ row: row.id, column: f.columnName });
						f.customDisplay(row, App, node, isEditable);
					}
				});
			});
		} else {
			var id = data.getFirstId();
			while(id) {
				var row = data.getItem(id);
				fields.forEach((f)=>{
					if (this.objectWorkspace.hiddenFields.indexOf(f.columnName) == -1) {
						var node = DataTable.getItemNode({ row: row.id, column: f.columnName });
						f.customDisplay(row, App, node, isEditable);
					}
				})
				id = data.getNextId(id);
			}
		}

	}


	// Display data with label format of object
	displayData(rowData) {

		if (rowData == null) return '';

		// translate multilingual
		var mlFields = this.multilingualFields();
		OP.Multilingual.translate(rowData, rowData, mlFields);

		var labelData = this.labelFormat || '{' + this._fields[0].id + '}';

		// get column ids in {colId} template
		// ['{colId1}', ..., '{colIdN}']
		var colIds = labelData.match(/\{[^}]+\}/g);

		colIds.forEach((colId) => {
			var colIdNoBracket = colId.replace('{', '').replace('}', '');

			var field = this.fields((f) => f.id == colIdNoBracket)[0]
			if (field == null) return;

			labelData = labelData.replace(colId, rowData[field.columnName] || '');
		});

		return labelData;
	}




	///
	/// Working with data from server
	///

	/**
	 * @method model
	 * return a Model object that will allow you to interact with the data for
	 * this ABObject.
	 */
	model() {

		if (!this._model) {

			if (this.isImported) {
				this._model = ABApplication.objectFromRef(this.importFromObject);
			}
			else {
				this._model = new ABModel(this);
			}
		}

		return this._model;
	}


}
