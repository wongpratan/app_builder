/*
 * ABFieldUser
 *
 * An ABFieldUser defines a user field type.
 *
 */

import ABFieldSelectivity from "./ABFieldSelectivity"
import ABFieldComponent from "./ABFieldComponent"

function L(key, altText) {
	return AD.lang.label.getLabel(key) || altText;
}


var ABFieldUserDefaults = {
	key: 'user', // unique key to reference this specific DataField
	icon: 'user-o',   // font-awesome icon reference.  (without the 'fa-').  so 'user'  to reference 'fa-user'

	// menuName: what gets displayed in the Editor drop list
	menuName: L('ab.dataField.user.menuName', '*User'),

	// description: what gets displayed in the Editor description.
	description: L('ab.dataField.user.description', '*Add user/s to a record.'),
	isSortable: (field) => {
		if (field.settings.isMultiple) {
			return false;
		} else {
			return true;
		}
	},
	isFilterable: (field) => {
		if (field.settings.isMultiple) {
			return false;
		} else {
			return true;
		}
	},
	useAsLabel: (field) => {
		if (field.settings.isMultiple) {
			return false;
		} else {
			return true;
		}
	}

}

var defaultValues = {
	editable: 1,
	isMultiple: 0,
	isCurrentUser: 0
};

var ids = {
	editable: "ab-user-editable",
	isMultiple: "ab-user-multiple-option",
	isCurrentUser: "ab-user-current-user-option"
}

/**
 * ABFieldUserComponent
 *
 * Defines the UI Component for this Data Field.  The ui component is responsible
 * for displaying the properties editor, populating existing data, retrieving
 * property values, etc.
 */
var ABFieldUserComponent = new ABFieldComponent({
	fieldDefaults: ABFieldUserDefaults,

	elements: function (App, field) {
		ids = field.idsUnique(ids, App);

		return [
			{
				view: 'checkbox',
				name: 'isMultiple',
				id: ids.isMultiple,
				labelRight: L('ab.dataField.user.isMultiple', '*Allow multiple users'),
				labelWidth: App.config.labelWidthCheckbox
			},
			{
				view: 'checkbox',
				name: 'isCurrentUser',
				id: ids.isCurrentUser,
				labelRight: L('ab.dataField.user.isCurrentUser', '*Default value as current user'),
				labelWidth: App.config.labelWidthCheckbox,
				on: {
					'onChange': function (newValue, oldValue) {
						if (newValue == 0) {
							$$(ids.editable).setValue(1)
							$$(ids.editable).hide();
						}
						else {
							$$(ids.editable).setValue(1)
							$$(ids.editable).show();
						}
					}
				}
			},
			{
				view: 'checkbox',
				name: 'editable',
				hidden: true,
				id: ids.editable,
				labelRight: L('ab.dataField.user.editableLabel', '*Editable'),
				labelWidth: App.config.labelWidthCheckbox
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
	init: function (ids) {
		// want to hide the description? :
		// $$(ids.fieldDescription).hide();
	}

})





class ABFieldUser extends ABFieldSelectivity {

	constructor(values, object) {

		super(values, object, ABFieldUserDefaults);

		// we're responsible for setting up our specific settings:
		for (var dv in defaultValues) {
			this.settings[dv] = values.settings[dv] || defaultValues[dv];
		}

		this.settings.editable = parseInt(this.settings.editable);
		this.settings.isMultiple = parseInt(this.settings.isMultiple);
		this.settings.isCurrentUser = parseInt(this.settings.isCurrentUser);
		
		this._currentUser = function() {
			if (typeof window._currentUser == "undefined") {
				OP.Comm.Service.get({ url: "/site/user/data" }).then((data) => {
					var user1 = [{ id: data.user.username, text: data.user.username }];
					var user2 = data.user.username
					window._currentUser = {
						selectivity: user1,
						webix: user2
					};
					if (this.settings.isMultiple) {
						return window._currentUser.selectivity;						
					} else {
						return window._currentUser.webix;
					}
				});			
			} else {
				if (this.settings.isMultiple) {
					return window._currentUser.selectivity;						
				} else {
					return window._currentUser.webix;
				}				
			}

		}
		var currentUser = this._currentUser();
		
	}

	// return the default values for this DataField
	static defaults() {
		return ABFieldUserDefaults;
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
		return ABFieldUserComponent.component(App);
	}



	///
	/// Instance Methods
	///


	isValid() {

		var validator = super.isValid();

		// validator.addError('columnName', L('ab.validation.object.name.unique', 'Field columnName must be unique (#name# already used in this Application)').replace('#name#', this.name) );

		return validator;
	}


	///
	/// Working with Actual Object Values:
	///

	// return the grid column header definition for this instance of ABFieldUser
	columnHeader(isObjectWorkspace, width) {
		var config = super.columnHeader(isObjectWorkspace);

		// Multiple select list
		if (this.settings.isMultiple) {
			if (typeof width != "undefined") {
				config.template = '<div style="margin-left: '+width+'px" class="list-data-values"></div>';				
			} else {
				config.template = '<div class="list-data-values"></div>';
			}
		}
		// Single select list
		else {
			if (this.settings.editable = 1) {
				config.editor = 'richselect';
				this.getUsers().then(function (data) {
					config.options = data;
				});
			}
		}
		return config;

	}

	/*
	 * @function customDisplay
	 * perform any custom display modifications for this field.  
		 * @param {object} row is the {name=>value} hash of the current row of data.
	 * @param {App} App the shared ui App object useful more making globally
	 *					unique id references.
	 * @param {HtmlDOM} node  the HTML Dom object for this field's display.
	 */
	customDisplay(row, App, node, editable) {
		// sanity check.
		if (!node) { return }
		
		var readOnly = false;
		if (editable != null && editable == false) {
			readOnly = true;
		}

		if (this.settings.isMultiple) {

			var domNode = node.querySelector('.list-data-values');

			// var readOnly = true;
			var placeholder = "";
			if (this.settings.editable && readOnly == false) {
				// readOnly = false;
				placeholder = L('ab.dataField.user.placeHolder', '*Select users');
			}

			this.selectivityRender(domNode, {
				multiple: true,
				placeholder: placeholder,
				data: row[this.columnName],
				// items: this._users(),
				ajax: {
					url: 'It will call url in .getOptions function', // require
					minimumInputLength: 0,
					quietMillis: 0,
					fetch: (url, init, queryOptions) => {
						return this.getUsers().then(function (data) {
							return {
								results: data
							};
						});
					}
				},
				readOnly: readOnly
			}, App, row);

			if (domNode && row.id && node) {
				// Listen event when selectivity value updates
				domNode.addEventListener('change', (e) => {
					// update just this value on our current this.model
					var values = {};
					values[this.columnName] = this.selectivityGet(domNode);

					// pass null because it could not put empty array in REST api
					if (values[this.columnName].length == 0)
						values[this.columnName] = [];

					if (row.id) {
						this.object.model().update(row.id, values)
						.then(() => {
							// update the client side data object as well so other data changes won't cause this save to be reverted
							if ($$(node) && $$(node).updateItem)
								$$(node).updateItem(row.id, values);
						})
						.catch((err) => {

							node.classList.add('webix_invalid');
							node.classList.add('webix_invalid_cell');

							OP.Error.log('Error updating our entry.', { error: err, row: row, values: values });
						});
					}

				}, false);				
			}
		}

	}

	/*
	* @function customEdit
	* 
	* @param {object} row is the {name=>value} hash of the current row of data.
	* @param {App} App the shared ui App object useful more making globally
	*					unique id references.
	* @param {HtmlDOM} node  the HTML Dom object for this field's display.
	*/
	customEdit(row, App, node) {
		if (this.settings.isMultiple == true) {
			var domNode = node.querySelector('.list-data-values');

			if (domNode.selectivity != null) {
				// Open selectivity
				domNode.selectivity.open();
				return false;
			}
			return false;
		}
	}

	/**
	 * @method defaultValue
	 * insert a key=>value pair that represent the default value
	 * for this field.
	 * @param {obj} values a key=>value hash of the current values.
	 */
	defaultValue(values) {
		if (this.settings.isCurrentUser) {
			if (this.settings.isMultiple) {
				values[this.columnName] = window._currentUser.selectivity;				
			} else {
				values[this.columnName] = window._currentUser.webix;								
			}
		}
	}




	/**
	 * @method isValidData
	 * Parse through the given data and return an error if this field's
	 * data seems invalid.
	 * @param {obj} data  a key=>value hash of the inputs to parse.
	 * @param {OPValidator} validator  provided Validator fn
	 * @return {array} 
	 */
	isValidData(data, validator) {


	}


	/*
	* @funciton formComponent
	* returns a drag and droppable component that is used on the UI
	* interface builder to place form components related to this ABField.
	* 
	* an ABField defines which form component is used to edit it's contents.
	* However, what is returned here, needs to be able to create an instance of
	* the component that will be stored with the ABViewForm.
	*/
	formComponent() {
		
		// NOTE: what is being returned here needs to mimic an ABView CLASS.
		// primarily the .common() and .newInstance() methods.
		var formComponentSetting = super.formComponent();

		// .common() is used to create the display in the list
		formComponentSetting.common = () => {
			return {
				key: (this.settings.isMultiple ? 'fieldcustom' : 'selectsingle')
			}
		};

		return formComponentSetting;
	}
	
	detailComponent() {
		
		var detailComponentSetting = super.detailComponent();

		detailComponentSetting.common = () => {
			return {
				key: (this.settings.isMultiple ? 'detailselectivity' : 'detailtext')
			}
		};

		return detailComponentSetting;
	}

	getValue(application, object, fieldData, itemNode, rowData, item) {
		var values = {};
		if (this.settings.isMultiple) {
			var domNode = itemNode.querySelector('.list-data-values');
			values = this.selectivityGet(domNode);
		} else {
			values = $$(item).getValue();
		}
		return values;
	}


	setValue(item, value) {
		if (this.settings.isMultiple) {
			// get selectivity dom
			var domSelectivity = item.$view.querySelector('.list-data-values');
			// set value to selectivity
			this.selectivitySet(domSelectivity, value, this.App);
		} else {
			item.setValue();
		}
	}
	
	getUsers() {
		return new Promise(
			(resolve, reject) => {
				if (typeof window._users == "undefined") {
					OP.Comm.Service.get({ url: "/appdev-core/siteuser" }).then((data) => {
						var items1 = data.map(function (item) {
							return {
								id: item.username,
								text: item.username
							}
						});
						var items2 = data.map(function (item) {
							return {
								id: item.username,
								value: item.username
							}
						});
						window._users = {
							selectivity: items1,
							webix: items2
						};
						if (this.settings.isMultiple) {
							resolve(window._users.selectivity);								
						} else {
							resolve(window._users.webix);
						}
					});							
				} else {
					if (this.settings.isMultiple) {
						resolve(window._users.selectivity);								
					} else {
						resolve(window._users.webix);
					}
				}
			}
		);
	}


}

export default ABFieldUser;
