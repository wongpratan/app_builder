/*
 * ABFieldLongText
 *
 * An ABFieldLongText defines a LongText field type.
 *
 */

import ABField from "./ABField"
import ABFieldComponent from "./ABFieldComponent"

function L(key, altText) {
	return AD.lang.label.getLabel(key) || altText;
}



var ABFieldLongTextDefaults = {
	key: 'LongText', // unique key to reference this specific DataField
	type: 'longtext', // http://sailsjs.org/documentation/concepts/models-and-orm/attributes#?attribute-options
	icon: 'align-right',   // font-awesome icon reference.  (without the 'fa-').  so 'user'  to reference 'fa-user'		
	
	// menuName: what gets displayed in the Editor drop list
	menuName: L('ab.dataField.LongText.menuName', '*Multiple line text'),
	
	// description: what gets displayed in the Editor description.
	description: L('ab.dataField.LongText.description', '*short LongText value')
}



// defaultValues: the keys must match a .name of your elements to set it's default value.
var defaultValues = {
    'textDefault': '',
    'supportMultilingual': 0
}



/**
 * ABFieldLongTextComponent
 *
 * Defines the UI Component for this Data Field.  The ui component is responsible
 * for displaying the properties editor, populating existing data, retrieving
 * property values, etc.
 *
 * @param {obj} App  the current Component Application instance for the current UI.
 * @return {obj} the Component object.
 */
var ABFieldLongTextComponent = new ABFieldComponent({

	fieldDefaults: ABFieldLongTextDefaults,

	elements: (App, field) => {

		// NOTE: you might not need to define your own ids, but if you do, do it like this:
		// var ids = {
		// 	imageWidth: '',
		// 	imageHeight: ''
		// }
		// ids = field.idsUnique(ids, App);

		return [
			{
			   view: "text",
			   name: 'textDefault',
			   labelWidth: App.config.labelWidthLarge,
			   placeholder: L('ab.dataField.string.default', '*Default text')
			},
			{
			   view: "checkbox",
			   name: 'supportMultilingual',
			   labelRight: L('ab.dataField.string.supportMultilingual', '*Support multilingual'),
			   labelWidth: App.config.labelWidthCheckbox,
			   value: true
			}
		]
	},

	// defaultValues: the keys must match a .name of your elements to set it's default value.
	defaultValues: defaultValues,

	// rules: basic form validation rules for webix form entry.
	// the keys must match a .name of your .elements for it to apply
	rules: {
		// 'textDefault':webix.rules.isNotEmpty,
		// 'supportMultilingual':webix.rules.isNotEmpty
	},

	// include additional behavior on default component operations here:
	// The base routines will be processed first, then these.  Any results
	// from the base routine, will be passed on to these: 
	// 	@param {obj} ids  the list of ids used to generate the UI.  your 
	//					  provided .elements will have matching .name keys
	//					  to access them here.
	//  @param {obj} values the current set of values provided for this instance
	// 					  of ABField:
	//					  {
	//						id:'',			// if already .saved()
	// 						label:'',
	// 						columnName:'',
	//						settings:{
	//							showIcon:'',
	//
	//							your element key=>values here	
	//						}
	//					  }
	//
	// 		.clear(ids)  : reset the display to an empty state
	// 		.isValid(ids, isValid): perform validation on the current editor values
	// 		.populate(ids, values) : populate the form with your current settings
	// 		.show(ids)   : display the form in the editor
	// 		.values(ids, values) : return the current values from the form
	logic: {

	},

	// perform any additional setup actions here.
	// @param {obj} ids  the hash of id values for all the current form elements.
	//					 it should have your elements + the default Header elements:
	//						.label, .columnName, .fieldDescription, .showIcon
	init: function(ids) {
		// want to hide the description? :
		// $$(ids.fieldDescription).hide();
	}

})





class ABFieldLongText extends ABField {

    constructor(values, object) {
    	super(values, object, ABFieldLongTextDefaults);

    	/*
    	{
			settings: {
				textDefault: 'string',
				supportMultilingual: true/false
			}
    	}
    	*/

    	// we're responsible for setting up our specific settings:
    	for (var dv in defaultValues) {
    		this.settings[dv] = values.settings[dv] || defaultValues[dv];
    	}

    	// // text to Int:
    	this.settings.supportMultilingual = parseInt(this.settings.supportMultilingual);

  	}


  	// return the default values for this DataField
  	static defaults() {
  		return ABFieldLongTextDefaults;
  	}



	/*
	 * @function propertiesComponent
	 *
	 * return a UI Component that contains the property definitions for this Field.
	 *
	 * @param {App} App the UI App instance passed around the Components.
	 * @return {Component}
	 */
  	static propertiesComponent(App) {
  		return ABFieldLongTextComponent.component(App);
  	}



	///
	/// Instance Methods
	///


	isValid() {

		var validator = super.isValid();

		// validator.addError('columnName', L('ab.validation.object.name.unique', 'Field columnName must be unique (#name# already used in this Application)').replace('#name#', this.name) );

		return validator;
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
	// toObj () {

	// 	var obj = super.toObj();

	// 	// obj.settings = this.settings;  // <--  super.toObj()

	// 	return obj;
	// }




	///
	/// Working with Actual Object Values:
	///

	// return the grid column header definition for this instance of ABFieldLongText
	columnHeader (isObjectWorkspace) {
		var config = super.columnHeader(isObjectWorkspace);

		config.editor = 'text';  // '[edit_type]'   for your unique situation
		config.sort   = 'string' // '[sort_type]'   for your unique situation

		return config;
	}

}



//// NOTE: if you need a unique [edit_type] by your returned config.editor above:
// webix.editors = {
//   "[edit_type]": {
//     focus: function () {...}
//     getValue: function () {...},
//     setValue: function (value) {...},
//     render: function () {...}
//   }
// };


//// NOTE: if you need a unique [sort_type] by your returned config.sort above:
// webix.DataStore.prototype.sorting.as.[sort_type] = function(a,b){ 
//     return a > b ? 1 : -1; 
// }


export default ABFieldLongText;