module.exports =  class ABObjectBase {

	constructor(attributes, application) {
/*
{
	id: uuid(),
	connName: 'string', // Sails DB connection name: 'appdev_default', 'legacy_hris', etc. Default is 'appBuilder'.
	name: 'name',
	labelFormat: 'xxxxx',
	isImported: 1/0,
	isExternal: 1/0,
	tableName:'string',  // NOTE: store table name of import object to ignore async
	primaryColumnName: 'string', // NOTE: store column name of PK
	transColumnName: 'string', // NOTE: store column name of translations table
	urlPath:'string',
	importFromObject: 'string', // JSON Schema style reference:  '#[ABApplication.id]/objects/[ABObject.id]'
								// to get other object:	 ABApplication.objectFromRef(obj.importFromObject);
	translations:[
		{}
	],
	fields:[
		{ABDataField}
	]
}
*/
	  	// link me to my parent ABApplication
	  	this.application = application;

		// ABApplication Attributes (or is it ABObject attributes?)
		this.id	= attributes.id;
		this.connName = attributes.connName || undefined; // undefined == 'appBuilder'
		this.name	= attributes.name || "";
		this.labelFormat = attributes.labelFormat || "";
		this.isImported  = parseInt(attributes.isImported || 0);
		this.isExternal  = parseInt(attributes.isExternal || 0);
		this.tableName	 = attributes.tableName || ""; // NOTE: store table name of import object to ignore async
		this.primaryColumnName = attributes.primaryColumnName || ""; // NOTE: store column name of PK
		this.transColumnName = attributes.transColumnName || ""; // NOTE: store column name of translations table
		this.urlPath	 = attributes.urlPath		|| "";
		this.importFromObject = attributes.importFromObject || "";
		this.translations = attributes.translations;

/// Old Method
		if (typeof(attributes.objectWorkspace) != "undefined") {
			if (typeof(attributes.objectWorkspace.sortFields) == "undefined") attributes.objectWorkspace.sortFields = [];
			if (typeof(attributes.objectWorkspace.filterConditions) == "undefined") attributes.objectWorkspace.filterConditions = [];
			if (typeof(attributes.objectWorkspace.frozenColumnID) == "undefined") attributes.objectWorkspace.frozenColumnID = "";
			if (typeof(attributes.objectWorkspace.hiddenFields) == "undefined") attributes.objectWorkspace.hiddenFields = [];
		}

		this.objectWorkspace = attributes.objectWorkspace || {
			sortFields:[], // array of columns with their sort configurations
			filterConditions:[], // array of filters to apply to the data table
			frozenColumnID:"", // id of column you want to stop freezing
			hiddenFields:[], // array of [ids] to add hidden:true to
		};

	  	// import all our ABField 
	  	this.importFields(attributes.fields || []);


	  	// convert '0' to 0
	  	this.isImported = parseInt(this.isImported || 0);
  	}



  	///
  	/// Static Methods
  	///
  	/// Available to the Class level object. These methods are not dependent
  	/// on the instance values of the Application.
  	///



	///
	/// Instance Methods
	///

	/**
	 * @method importFields
	 * instantiate a set of fields from the given attributes.
	 * @param {array} fieldSettings The different settings for each field to create.
	 *							[ { fieldURL: 'xxxxx' }, ... ]
	 */
	importFields(fieldSettings) {
		var newFields = [];

	  	fieldSettings.forEach((field) => {
	  		newFields.push( this.application.fieldNew(field, this) );
	  	})
	  	this._fields = newFields;
	}


	/**
	 * @method exportFields
	 * convert our array of fields into a settings object for saving to disk.
	 * @return {array}
	 */
	exportFields() {
		var currFields = [];
		this._fields.forEach((obj) => {
			currFields.push(obj.toObj())
		})
		return currFields;
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

		// OP.Multilingual.unTranslate(this, this, ["label"]);

		// // for each Field: compile to json
		var currFields = this.exportFields();

		return {
			id: 			this.id,
			connName:		this.connName,
			name: 			this.name,
			labelFormat: 	this.labelFormat,
			isImported:		this.isImported,
			isExternal:		this.isExternal,
			tableName:		this.tableName, // NOTE: store table name of import object to ignore async
			primaryColumnName: this.primaryColumnName, // NOTE: store column name of PK
			transColumnName:this.transColumnName, // NOTE: store column name of translations table
			urlPath: 		this.urlPath,
			importFromObject: this.importFromObject,
			objectWorkspace: this.objectWorkspace,
			translations: 	this.translations,
			fields: 	 	currFields
		}
	}


	/**
	 * @method columnResize()
	 *
	 * save the new width of a column
	 *
	 * @param {} id The instance of the field to save.
	 * @param {int} newWidth the new width of the field
	 * @param {int} oldWidth the old width of the field
	 * @return {Promise}
	 */
	columnResize( columnName, newWidth, oldWidth ) {
		for(var i=0; i<this._fields.length; i++) {
			if (this._fields[i].columnName == columnName) {
				this._fields[i].settings.width = newWidth;
			}
		}
		return this.save();
	}



	///
	/// Objects
	///


	/**
	 * @method objectLinks()
	 * 
	 *  return an array of ABObject that's connected.
	 * 
	 * @param {object} filter 
	 * @return {array} - An array of ABObject
	 */
	objectLinks (filter) {

		var connectFields = this.connectFields();

		return connectFields.map(f => f.datasourceLink);

	}




	///
	/// Fields
	///



	/**
	 * @method fields()
	 *
	 * return an array of all the ABFields for this ABObject.
	 *
	 * @return {array}
	 */
	fields (filter) {

		filter = filter || function() {return true; };

		return this._fields.filter(filter);
	}


	/**
	 * @method connectFields()
	 *
	 * return an array of the ABFieldConnect that is connect object fields.
	 *
	 * @return {array}
	 */
	connectFields () {

		return this.fields(function(f) { return f.key == 'connectObject'; });
	}




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
		return this.application.fieldNew( values, this );
	}



	/**
	 * @method fieldRemove()
	 *
	 * remove the given ABField from our ._fields array and persist the current
	 * values.
	 *
	 * @param {ABField} field The instance of the field to remove.
	 * @return {Promise}
	 */
	fieldRemove( field ) {
		this._fields = this.fields(function(o){ return o.id != field.id });

		return this.save();
	}


	/**
	 * @method fieldReorder()
	 *
	 * reorder the fields in our object
	 *
	 * @param {ABField} field The instance of the field to remove.
	 * @return {Promise}
	 */
	fieldReorder( sourceId, targetId ) {
		// We know what was moved and what item it has replaced/pushed forward
		// so first we want to splice the item moved out of the array of fields
		// and store it so we can put it somewhere else
		let itemMoved = null;
		let oPos = 0; // original position
		for(var i=0; i<this._fields.length; i++) {
			if (this._fields[i].columnName == sourceId) {
				itemMoved = this._fields[i];
				this._fields.splice(i, 1);
				oPos = i;
				break;
			}
		}
		// once we have removed/stored it we can find where its new position
		// will be by looping back through the array and finding the item it
		// is going to push forward
		for(var j=0; j<this._fields.length; j++) {
			if (this._fields[j].columnName == targetId) {
				// if the original position was before the new position we will 
				// follow webix's logic that the drop should go after the item 
				// it was placed on 
				if (oPos <= j) {
					j++;
				}
				this._fields.splice(j, 0, itemMoved);
				break;
			}
		}

		return this.save();
	}


	/**
	 * @method fieldSave()
	 *
	 * save the given ABField in our ._fields array and persist the current
	 * values.
	 *
	 * @param {ABField} field The instance of the field to save.
	 * @return {Promise}
	 */
	fieldSave( field ) {
		var isIncluded = (this.fields(function(o){ return o.id == field.id }).length > 0);
		if (!isIncluded) {
			this._fields.push(field);
		}

		return this.save();
	}


	/**
	 * @method multilingualFields()
	 *
	 * return an array of columnnames that are multilingual.
	 *
	 * @return {array}
	 */
	multilingualFields() {
		var fields = [];

		var found = this.fields(function(f){ return f.isMultilingual; });
		found.forEach((f)=>{
			fields.push(f.columnName);
		})

		return fields;
	}



	///
	/// URL
	///


	/**
	 * @method urlRest
	 * return the url to access the data for this object.
	 * @return {string} 
	 */
	 urlRest() {
	 	return '/app_builder/model/application/#appID#/object/#objID#'
			.replace('#appID#', this.application.id)
			.replace('#objID#', this.id);
	 }


	/**
	 * @method urlRestItem
	 * return the url to access the data for an instance of this object.
	 * @return {string} 
	 */
	urlRestItem(id) {
		return `/app_builder/model/application/${this.application.id}/object/${this.id}/${id}`;
	}


	/**
	 * @method urlRestRefresh
	 * return the url to signal a refresh for this object.
	 * @return {string} 
	 */
	urlRestRefresh() {
		return '/app_builder/model/application/#appID#/refreshobject/#objID#'
			.replace('#appID#', this.application.id)
			.replace('#objID#', this.id);
	}


	/**
	 * @method urlCount
	 * return the url to count of data for this object.
	 * @return {string} 
	 */
	urlRestCount() {
		return '/app_builder/model/application/#appID#/count/#objID#'
			.replace('#appID#', this.application.id)
			.replace('#objID#', this.id);
	}


	///
	///	Object Workspace Settings
	///
	get workspaceSortFields() {

		// new version
		if (this.workspaceViews) {
			let currView = this.workspaceViews.getCurrentView();
			if (currView)
				return currView.sortFields;
			else
				return null;
		}
		// old version
		else {
			return this.objectWorkspace.sortFields;
		}

	}

	set workspaceSortFields( fields ) {

		// new version
		if (this.workspaceViews) {
			let currView = this.workspaceViews.getCurrentView();
			if (currView)
				currView.sortFields = fields;
		}
		// old version
		else {
			this.objectWorkspace.sortFields = fields;
		}

	}

	get workspaceFilterConditions() {

		// new version
		if (this.workspaceViews) {
			let currView = this.workspaceViews.getCurrentView();
			if (currView)
				return currView.filterConditions;
			else
				return null;
		}
		// old version
		else {
			return this.objectWorkspace.filterConditions;
		}

	}

	set workspaceFilterConditions( filterConditions ) {

		// new version
		if (this.workspaceViews) {
			let currView = this.workspaceViews.getCurrentView();
			if (currView)
				currView.filterConditions = filterConditions;
		}
		// old version
		else {
			this.objectWorkspace.filterConditions = filterConditions;
		}

	}

	get workspaceFrozenColumnID() {
		return this.objectWorkspace.frozenColumnID;
	}

	set workspaceFrozenColumnID( id ) {
		this.objectWorkspace.frozenColumnID = id;
	}

	get workspaceHiddenFields() {
		return this.objectWorkspace.hiddenFields || [];
	}

	set workspaceHiddenFields( fields ) {
		this.objectWorkspace.hiddenFields = fields;
	}


	/**
	 * @method isReadOnly
	 * 
	 * @return {boolean}
	 */
	get isReadOnly() {
		return false;
	}


	/**
	 * @method defaultValues
	 * Collect a hash of key=>value pairs that represent the default values 
	 * from each of our fields.
	 * @param {obj} data a key=>value hash of the inputs to parse.
	 * @return {array} 
	 */
	defaultValues() {
		var values = {};
		this.fields().forEach((f) => {
			f.defaultValue(values);
		})

		return values;
	}



	/**
	 * @method isValidData
	 * Parse through the given data and return an array of any invalid
	 * value errors.
	 * @param {obj} data a key=>value hash of the inputs to parse.
	 * @return {array}
	 */
	isValidData(data) {
		var validator = OP.Validation.validator();
		this.fields().forEach((f) => {
			var p = f.isValidData(data, validator);
		})

		return validator;
	}



	/**
	 * @method urlPointer()
	 * return the url pointer that references this object. This url pointer
	 * should be able to be used by this.application.urlResolve() to return 
	 * this object.
	 * 
	 * @param {boolean} acrossApp - flag to include application id to url
	 * 
	 * @return {string} 
	 */
	urlPointer(acrossApp) {
		return this.application.urlObject(acrossApp)+this.id;
	}



	/**
	 * @method urlField
	 * return a string pointer to this object's fields
	 * 
	 * @param {boolean} acrossApp - flag to include application id to url
	 * 
	 * @return {string}
	 */
	 urlField(acrossApp) {
	 	return this.urlPointer(acrossApp) +'/_fields/'
	 }


	/**
	  * @method PK
	  * return a string of the primary column name
	  *
	  * @return {string}
	  */
	PK() {
		return this.primaryColumnName || 'id';
	}


	/**
	 * @method clone
	 * return a clone of ABObject
	 * 
	 * @return {ABObjectBase}
	 */
	clone() {

		// ignore properties who're spend much performance
		// NOTE: do not clone them. Just copy reference
		let ignoreProps = ['application', '_fields'];

		let cloneOne = _.cloneDeepWith(this, function customizer(val, key, obj) {

			// copy references
			if (ignoreProps.indexOf(key) > -1)
				return val;
			// clone
			else
				return _.cloneDeep(val);
		});

		return cloneOne;
	}

	toObjGrid() {}
	
	toObjKanban() {

	}


}

