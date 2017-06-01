/*
 * ABFieldDate
 *
 * An ABFieldDate defines a date/datetime field type.
 *
 */

import ABField from "./ABField"
import ABFieldComponent from "./ABFieldComponent"


function L(key, altText) {
	return AD.lang.label.getLabel(key) || altText;
}



var ABFieldDateDefaults = {
	key: 'date', // unique key to reference this specific DataField

	icon: 'calendar',   // font-awesome icon reference.  (without the 'fa-').  so 'user'  to reference 'fa-user'

	// menuName: what gets displayed in the Editor drop list
	menuName: L('ab.dataField.date.menuName', '*Date'),

	// description: what gets displayed in the Editor description.
	description: L('ab.dataField.date.description', '*Pick one from a calendar.')
}

var defaultValues = {
	includeTime: 0,
	defaultCurrentDate: 0,
	defaultDate: "",
	dayFormat: "%d",
	dayOrder: 1,
	dayDelimiter: "slash",
	monthFormat: "%m",
	monthOrder: 2,
	monthDelimiter: "slash",
	yearFormat: "%Y",
	yearOrder: 3,
	yearDelimiter: "slash",

	hourFormat: '%h',
	periodFormat: 'none',
	timeDelimiter: 'colon',

	validateCondition: "none",
	validateRangeUnit: "days",
	validateRangeBefore: 0,
	validateRangeAfter: 0,
	validateStartDate: null,
	validateEndDate: null
}

var ids = {
	default: 'ab-date-default',
	currentToDefault: 'ab-date-current-to-default',

	dateDisplay: 'ab-date-display',

	// Date
	dayOrder: 'ab-date-day-order',
	monthOrder: 'ab-date-month-order',
	yearOrder: 'ab-date-year-order',
	dayFormat: 'ab-date-day-format',
	monthFormat: 'ab-date-month-format',
	yearFormat: 'ab-date-year-format',
	dayDelimiter: 'ab-date-day-delimiter',
	monthDelimiter: 'ab-date-month-delimiter',
	yearDelimiter: 'ab-date-year-delimiter',

	// Time
	includeTime: 'ab-date-include-time',
	timeFormat: 'ab-date-time-format',
	hourFormat: 'ab-date-hour-format',
	periodFormat: 'ab-date-period-format',
	timeDelimiter: 'ab-date-time-delimiter',

	// validation
	validateCondition: 'ab-date-validate-condition',
	validateRange: 'ab-date-validate-range',
	validateRangeUnit: 'ab-date-validate-range-unit',
	validateRangeBefore: 'ab-date-validate-range-before',
	validateRangeAfter: 'ab-date-validate-range-after',
	validateRangeBeforeLabel: 'ab-date-validate-before-label',
	validateRangeAfterLabel: 'ab-date-validate-after-label',

	validateStartDate: 'ab-date-validate-start-date',
	validateEndDate: 'ab-date-validate-end-date'
};

var delimiterList = [
	{ id: 'comma', value: "Comma", sign: "," },
	{ id: 'slash', value: "Slash", sign: "/" },
	{ id: 'space', value: "Space", sign: " " },
	{ id: 'dash', value: "Dash", sign: "-" },
	{ id: 'colon', value: "Colon", sign: ":" },
];


/** Private methods **/
function getDelimiterSign(text) {
	var delimiterItem = delimiterList.filter(function (item) {
		return item.id == text;
	})[0];

	return delimiterItem ? delimiterItem.sign : '';
}

function getDateFormat(setting) {
	var dateFormat = "";

	// Date format
	for (var i = 1; i <= 3; i++) {
		if (setting.dayOrder == i) {
			dateFormat += setting.dayFormat;
			dateFormat += (i != 3) ? getDelimiterSign(setting.dayDelimiter) : '';
		}
		if (setting.monthOrder == i) {
			dateFormat += setting.monthFormat;
			dateFormat += (i != 3) ? getDelimiterSign(setting.monthDelimiter) : '';
		}
		if (setting.yearOrder == i) {
			dateFormat += setting.yearFormat;
			dateFormat += (i != 3) ? getDelimiterSign(setting.yearDelimiter) : '';
		}
	}

	// Time format
	if (setting.includeTime) {
		dateFormat += (' {hour}{delimiter}{minute}{period}'
			.replace('{hour}', setting.hourFormat)
			.replace('{delimiter}', getDelimiterSign(setting.timeDelimiter))
			.replace('{minute}', '%i')
			.replace('{period}', setting.periodFormat != 'none' ? setting.periodFormat : '')
		);
	}

	return dateFormat;
}

function refreshDateDisplay() {
	var dateFormat = getDateFormat({
		dayOrder: $$(ids.dayOrder).getValue(),
		monthOrder: $$(ids.monthOrder).getValue(),
		yearOrder: $$(ids.yearOrder).getValue(),
		dayFormat: $$(ids.dayFormat).getValue(),
		monthFormat: $$(ids.monthFormat).getValue(),
		yearFormat: $$(ids.yearFormat).getValue(),
		dayDelimiter: $$(ids.dayDelimiter).getValue(),
		monthDelimiter: $$(ids.monthDelimiter).getValue(),
		yearDelimiter: $$(ids.yearDelimiter).getValue(),

		includeTime: $$(ids.includeTime).getValue(),
		hourFormat: $$(ids.hourFormat).getValue(),
		timeDelimiter: $$(ids.timeDelimiter).getValue(),
		periodFormat: $$(ids.periodFormat).getValue(),
	});

	var dateDisplay = webix.Date.dateToStr(dateFormat)(new Date());

	$$(ids.dateDisplay).setValue(dateDisplay);
}


/**
 * ABFieldDateComponent
 *
 * Defines the UI Component for this Data Field.  The ui component is responsible
 * for displaying the properties editor, populating existing data, retrieving
 * property values, etc.
 */
var ABFieldDateComponent = new ABFieldComponent({
	fieldDefaults: ABFieldDateDefaults,

	elements: (App, field) => {
		ids = field.idsUnique(ids, App);

		return [
			{
				view: "checkbox",
				name: "includeTime",
				id: ids.includeTime,
				labelRight: "Include time",
				labelWidth: 0,
				on: {
					onChange: function (newVal, oldVal) {
						// Re-render default date picker
						webix.ui({
							view: 'datepicker',
							label: "Default",
							id: ids.default,
							timepicker: newVal ? true : false,
							disabled: $$(ids.currentToDefault).getValue() == true
						}, $$(ids.default));

						refreshDateDisplay();

						if (newVal)
							$$(ids.timeFormat).show();
						else
							$$(ids.timeFormat).hide();
					}
				}
			},
			{
				view: 'checkbox',
				id: ids.currentToDefault,
				name: "defaultCurrentDate",
				labelRight: 'Set current date to default value',
				labelWidth: 0,
				on: {
					onChange: function (newVal, oldVal) {
						if (newVal) {
							$$(ids.default).disable();
						}
						else {
							$$(ids.default).enable();
						}
					}
				}
			},
			{
				view: 'datepicker',
				id: ids.default,
				label: "Default",
				name: 'defaultDate',
				timepicker: false
			},
			{
				cols: [
					{
						view: 'label',
						label: 'Display',
						css: 'ab-text-bold',
						width: 80
					},
					{
						view: 'label',
						id: ids.dateDisplay,
						label: ''
					}
				]
			},

			// Display date format
			{
				view: "accordion",
				multi: false,
				collapsed: true,
				rows: [
					// Day format
					{
						header: "Day",
						body: {
							rows: [
								{
									view: "richselect",
									name: "dayFormat",
									id: ids.dayFormat,
									label: "Format",
									labelWidth: 100,
									value: '%d',
									options: [
										{ id: '%d', value: "1 2 ... 30 31" },
										// { id: 'Do', value: "1st 2nd ... 30th 31st" },
										{ id: '%j', value: "01 02 ... 30 31" },
										// { id: 'dd', value: "Su Mo ... Fr Sa" },
										{ id: '%D', value: "Sun Mon ... Fri Sat" },
										{ id: '%l', value: "Sunday Monday ... Friday Saturday" },
									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "richselect",
									name: "dayOrder",
									id: ids.dayOrder,
									label: "Places",
									labelWidth: 100,
									value: '1',
									options: [
										{ id: 1, value: "1" },
										{ id: 2, value: "2" },
										{ id: 3, value: "3" }
									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "radio",
									name: "dayDelimiter",
									id: ids.dayDelimiter,
									label: "Delimiter",
									labelWidth: 100,
									vertical: true,
									options: delimiterList,
									value: 'slash',
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								}
							]
						}
					},

					// Month format
					{
						header: "Month",
						body: {
							rows: [
								{
									view: "richselect",
									name: "monthFormat",
									id: ids.monthFormat,
									label: "Format",
									labelWidth: 100,
									value: '%m',
									options: [
										{ id: '%n', value: "1 2 ... 11 12" },
										// { id: 'Mo', value: "1st 2nd ... 11th 12th" },
										{ id: '%m', value: "01 02 ... 11 12" },
										{ id: '%M', value: "Jan Feb ... Nov Dec" },
										{ id: '%F', value: "January February ... November December" }
									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "richselect",
									name: "monthOrder",
									id: ids.monthOrder,
									label: "Places",
									labelWidth: 100,
									value: '2',
									options: [
										{ id: 1, value: "1" },
										{ id: 2, value: "2" },
										{ id: 3, value: "3" },
									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "radio",
									name: "monthDelimiter",
									id: ids.monthDelimiter,
									label: "Delimiter",
									labelWidth: 100,
									vertical: true,
									options: delimiterList,
									value: 'slash',
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								}
							]
						}
					},

					// Year format
					{
						header: "Year",
						body: {
							rows: [
								{
									view: "richselect",
									name: "yearFormat",
									id: ids.yearFormat,
									label: "Format",
									labelWidth: 100,
									value: '%Y',
									options: [
										{ id: '%y', value: "70 71 ... 29 30" },
										{ id: '%Y', value: "1970 1971 ... 2029 2030" },

									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "richselect",
									name: "yearOrder",
									id: ids.yearOrder,
									label: "Places",
									labelWidth: 100,
									value: '3',
									options: [
										{ id: 1, value: "1" },
										{ id: 2, value: "2" },
										{ id: 3, value: "3" },
									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "radio",
									name: "yearDelimiter",
									id: ids.yearDelimiter,
									label: "Delimiter",
									labelWidth: 100,
									vertical: true,
									options: delimiterList,
									value: 'slash',
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								}
							]
						}
					},

					// Time
					{
						id: ids.timeFormat,
						hidden: true,
						header: "Time",
						body: {
							rows: [
								{
									view: "richselect",
									name: "hourFormat",
									id: ids.hourFormat,
									label: "Hour",
									labelWidth: 100,
									value: '%h',
									options: [
										{ id: '%h', value: "00 01 ... 10 11" },
										{ id: '%g', value: "0 1 ... 10 11" },
										{ id: '%H', value: "00 01 ... 22 23" },
										{ id: '%G', value: "0 1 ... 22 23" }
									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "richselect",
									name: "periodFormat",
									id: ids.periodFormat,
									label: "Period",
									labelWidth: 100,
									value: 'none',
									options: [
										{ id: 'none', value: "[none]" },
										{ id: '%a', value: "am pm" },
										{ id: '%A', value: "AM PM" }
									],
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								},
								{
									view: "radio",
									name: "timeDelimiter",
									id: ids.timeDelimiter,
									label: "Delimiter",
									labelWidth: 100,
									vertical: true,
									options: delimiterList,
									value: 'colon',
									on: {
										'onChange': function (newValue, oldValue) {
											refreshDateDisplay();
										}
									}
								}
							]
						}
					}

				]
			},

			// Validator
			{
				view: 'label',
				label: "Validation criteria",
				css: 'ab-text-bold'
			},
			{
				id: ids.validateCondition,
				view: "select",
				name: "validateCondition",
				label: "Condition",
				labelWidth: 100,
				value: 'none',
				options: [
					{ id: 'none', value: '[None]' },
					{ id: 'dateRange', value: 'Range' },
					{ id: 'between', value: 'Between' },
					{ id: 'notBetween', value: 'Not between' },
					{ id: '=', value: 'Equal to' },
					{ id: '<>', value: 'Not equal to' },
					{ id: '>', value: 'Greater than' },
					{ id: '<', value: 'Less than' },
					{ id: '>=', value: 'Greater than or Equal to' },
					{ id: '<=', value: 'Less than or Equal to' }
				],
				on: {
					onChange: function (newVal, oldVal) {
						switch (newVal) {
							case 'none':
								$$(ids.validateRange).hide();
								$$(ids.validateStartDate).hide();
								$$(ids.validateEndDate).hide();
								break;
							case 'dateRange':
								$$(ids.validateRange).show();
								$$(ids.validateStartDate).hide();
								$$(ids.validateEndDate).hide();
								break;
							case 'between':
							case 'notBetween':
								$$(ids.validateRange).hide();
								$$(ids.validateStartDate).define('label', 'Start Date');
								$$(ids.validateStartDate).refresh();
								$$(ids.validateStartDate).show();
								$$(ids.validateEndDate).show();
								break;
							case '=':
							case '<>':
							case '>':
							case '<':
							case '>=':
							case '<=':
								$$(ids.validateRange).hide();
								$$(ids.validateStartDate).define('label', 'Date');
								$$(ids.validateStartDate).refresh();
								$$(ids.validateStartDate).show();
								$$(ids.validateEndDate).hide();
								break;
						}
					}
				}
			},
			{
				id: ids.validateRange,
				hidden: true,
				rows: [
					{
						id: ids.validateRangeUnit,
						view: "select",
						name: "validateRangeUnit",
						label: 'Unit',
						labelWidth: 100,
						options: [
							{ id: 'days', value: 'Days' },
							{ id: 'months', value: 'Months' },
							{ id: 'years', value: 'Years' }
						],
						on: {
							onChange: function (newVal) {
								$$(ids.validateRangeBeforeLabel).refresh();
								$$(ids.validateRangeAfterLabel).refresh();
							}
						}
					},
					{
						cols: [
							{
								id: ids.validateRangeBeforeLabel,
								view: 'template',
								align: 'left',
								width: 140,
								borderless: true,
								template: function () {
									var beforeLabel = 'Before #number# #unit#'
										.replace('#number#', $$(ids.validateRangeBefore).getValue())
										.replace('#unit#', $$(ids.validateRangeUnit).getValue());

									return beforeLabel;
								}
							},
							{
								view: 'label',
								label: '',
								align: 'center',
								width: 1
							},
							{
								id: ids.validateRangeAfterLabel,
								view: 'template',
								align: 'right',
								borderless: true,
								template: function () {
									var afterLabel = 'After #number# #unit#'
										.replace('#number#', $$(ids.validateRangeAfter).getValue())
										.replace('#unit#', $$(ids.validateRangeUnit).getValue());

									return afterLabel;
								}
							}
						]
					},
					{
						cols: [
							{
								id: ids.validateRangeBefore,
								view: 'slider',
								name: "validateRangeBefore",
								on: {
									onChange: function (newVal, oldValue) {
										$$(ids.validateRangeBeforeLabel).refresh();
									}
								}
							},
							{
								id: ids.validateRangeAfter,
								view: 'slider',
								name: "validateRangeAfter",
								on: {
									onChange: function (newVal, oldValue) {
										$$(ids.validateRangeAfterLabel).refresh();
									}
								}
							}
						]
					}
				]
			},
			{
				id: ids.validateStartDate,
				name: "validateStartDate",
				view: 'datepicker',
				label: 'Start Date',
				labelWidth: 100,
				hidden: true
			},
			{
				id: ids.validateEndDate,
				name: "validateEndDate",
				view: 'datepicker',
				label: 'End Date',
				labelWidth: 100,
				hidden: true
			}


		]
	},

	// defaultValues: the keys must match a .name of your elements to set it's default value.
	defaultValues: defaultValues,

	// rules: basic form validation rules for webix form entry.
	// the keys must match a .name of your .elements for it to apply
	rules: {},

	// include additional behavior on default component operations here:
	// The base routines will be processed first, then these.  Any results
	// from the base routine, will be passed on to these:
	logic: {

		// isValid: function (ids, isValid) {

		// }

		// populate: function (ids, values) {
		// 	if (values.settings.validation) {
		// 		$$(ids.validateMinimum).enable();
		// 		$$(ids.validateMaximum).enable();
		// 	} else {
		// 		$$(ids.validateMinimum).disable();
		// 		$$(ids.validateMaximum).disable();
		// 	}
		// }

	},

	// perform any additional setup actions here.
	// @param {obj} ids  the hash of id values for all the current form elements.
	//					 it should have your elements + the default Header elements:
	//						.label, .columnName, .fieldDescription, .showIcon
	init: function (ids) {
		refreshDateDisplay();
	}


});


class ABFieldDate extends ABField {
	constructor(values, object) {
		super(values, object, ABFieldDateDefaults);

		// we're responsible for setting up our specific settings:
		for (var dv in defaultValues) {
			this.settings[dv] = values.settings[dv] || defaultValues[dv];
		}

		// text to Int:
		this.settings.includeTime = parseInt(this.settings.includeTime);
		this.settings.defaultCurrentDate = parseInt(this.settings.defaultCurrentDate);
		this.settings.dayOrder = parseInt(this.settings.dayOrder);
		this.settings.monthOrder = parseInt(this.settings.monthOrder);
		this.settings.yearOrder = parseInt(this.settings.yearOrder);


	}

	// return the default values for this DataField
	static defaults() {
		return ABFieldDateDefaults;
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
		return ABFieldDateComponent.component(App);
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

	// return the grid column header definition for this instance of ABFieldDate
	columnHeader(isObjectWorkspace) {
		var config = super.columnHeader(isObjectWorkspace);

		if (this.settings.includeTime)
			config.editor = 'datetime';
		else
			config.editor = 'date';

		config.sort = 'string';


		// NOTE: it seems that the default value is a string in ISO format.

		//// NOTE: webix seems unable to parse ISO string into => date here.
		// config.map = '(date)#'+this.columnName+'#';   // so don't use this.

		config.format = (d) => {
			if ((d == '') || (d == null)) {
				return '';
			}
			// convert ISO string -> Date() -> our formatted string

			// pull format from settings.
			var dateFormat = getDateFormat(this.settings);

			return webix.Date.dateToStr(dateFormat)(new Date(d));
		};


		config.editFormat = (d) => {
			// this routine needs to return a Date() object for the editor to work with.

			if ((d == '') || (d == null)) {
				return '';
			}

			// else retun the actual ISO string => Date() value
			return new Date(d);
		}


		return config;
	}



	/**
	 * @method defaultValue
	 * insert a key=>value pair that represent the default value
	 * for this field.
	 * @param {obj} values a key=>value hash of the current values.
	 */
	defaultValue(values) {
		// if no default value is set, then don't insert a value.
		if (values[this.columnName] == null) {

			// Set current date as default
			if (this.settings.defaultCurrentDate) {
				values[this.columnName] = (new Date()).toISOString();
			}
			// Specfic default date
			else if (this.settings.defaultDate) {
				values[this.columnName] = (new Date(this.settings.defaultDate)).toISOString();
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

		if (data[this.columnName]) {
			var value = data[this.columnName];

			if (!(value instanceof Date)) {
				value = new Date(value);
			}

			// verify we didn't end up with an InValid Date result.
			if ((Object.prototype.toString.call(value) === '[object Date]')
				&& (isFinite(value))) {

				var isValid = true;

				// Custom vaildate is here
				if (this.settings && this.settings.validateCondition) {
					var startDate = this.settings.validateStartDate ? new Date(this.settings.validateStartDate) : null;
					var endDate = this.settings.validateEndDate ? new Date(this.settings.validateEndDate) : null;

					switch (this.settings.validateCondition) {
						case 'dateRange':
							var minDate = moment().subtract(this.settings.validateRangeBefore, this.settings.validateRangeUnit).toDate();
							var maxDate = moment().add(this.settings.validateRangeAfter, this.settings.validateRangeUnit).toDate();

							if (minDate < value && value < maxDate)
								isValid = true;
							else {
								isValid = false;
								validator.addError(this.columnName, 'Should be a Date!');
							}

							break;
						case 'between':
						case 'notBetween':
							if (this.settings.validateCondition == 'between' && startDate < value && value < endDate)
								isValid = true;
							else if (this.settings.validateCondition == 'notBetween' && value < startDate && endDate < value)
								isValid = true;
							else {
								isValid = false;
								validator.addError(this.columnName, 'Should be a Date!');
							}

							break;
						case '=':
							isValid = (value.getTime() == startDate.getTime());
							if (!isValid)
								validator.addError(this.columnName, 'Should be a Date!');
							break;
						case '<>':
							isValid = (value.getTime() != startDate.getTime());
							if (!isValid)
								validator.addError(this.columnName, 'Should be a Date!');
							break;
						case '>':
							isValid = (value.getTime() > startDate.getTime());
							if (!isValid)
								validator.addError(this.columnName, 'Should be a Date!');
							break;
						case '<':
							isValid = (value.getTime() < startDate.getTime());
							if (!isValid)
								validator.addError(this.columnName, 'Should be a Date!');
							break;
						case '>=':
							isValid = (value.getTime() >= startDate.getTime());
							if (!isValid)
								validator.addError(this.columnName, 'Should be a Date!');
							break;
						case '<=':
							isValid = (value.getTime() <= startDate.getTime());
							if (!isValid)
								validator.addError(this.columnName, 'Should be a Date!');
							break;
					}
				}

				if (isValid) {
					// all good, so store as ISO format string.
					data[this.columnName] = value.toISOString();
				}


			} else {

				// return a validation error
				validator.addError(this.columnName, 'Should be a Date!');
			}
		}

	}

}


export default ABFieldDate;