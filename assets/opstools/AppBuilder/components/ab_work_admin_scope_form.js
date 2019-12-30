const ABComponent = require("../classes/platform/ABComponent");

const RowFilter = require("../classes/platform/RowFilter");

module.exports = class AB_Work_Admin_Role_Form extends ABComponent {

	constructor(App) {

		let idBase = 'ab_work_admin_role_form';

		super(App, idBase);

		let L = this.Label;

		// internal list of Webix IDs to reference our UI components.
		let ids = {
			form: this.unique('form')
		};

		this._rowFilter = new RowFilter(App, idBase);

		let CurrentApplication;

		// Our webix UI definition:
		this.ui = {
			id: ids.form,
			view: 'form',
			// padding: 24,
			elementsConfig: { labelAlign: "right", labelWidth: 100 },
			rows: [
				{
					view: "text",
					name: "name",
					label: "Name",
					placeholder: "Enter Name"
				},
				{
					view: "text",
					name: "description",
					label: "Description",
					placeholder: "Enter Description"
				},
				{
					view: "checkbox",
					name: "isGlobal",
					label: "Is Global"
				},
				{
					id: ids.component,
					view: "forminput",
					paddingY: 0,
					paddingX: 0,
					label: "Filter",
					css: "ab-custom-field",
					body: this._rowFilter.ui
				},
				{
					cols: [
						{ fillspace: true },
						{
							view: 'button',
							autowidth: true,
							value: L("ab.common.cancel", "*Cancel"),
							click: () => {

								_logic.cancel();

							}
						},
						{
							view: "button",
							type: "form",
							autowidth: true,
							value: L("ab.common.save", "*Save"),
							click: () => {

								_logic.save();

							}
						}
					]
				},
				{
					fillspace: true
				}
			]
		};

		// Our init() function for setting up our UI
		this.init = () => {

			if ($$(ids.form))
				webix.extend($$(ids.form), webix.ProgressBar);

		}

		// our internal business logic
		let _logic = {


			/**
			 * @function applicationLoad
			 *
			 * Initialize the Object Workspace with the given ABApplication.
			 *
			 * @param {ABApplication} application 
			 */
			applicationLoad: function (application) {

				CurrentApplication = application;
				this._rowFilter.applicationLoad(application);


				// if (this._roleDC) {
				// 	$$(ids.form).bind(this._roleDC);

				// 	// Update RowFilter
				// 	this._roleDC.attachEvent("onAfterCursorChange", (currId) => {

				// 		if (currId) {
				// 			let currItem = this._roleDC.getItem(currId);
				// 			this._rowFilter.setValue(currItem.filter);
				// 		}
				// 		else {
				// 			this._rowFilter.setValue(null);
				// 		}

				// 	});
				// }

			},

			cancel: () => {

				if (this._roleDC)
					this._roleDC.setCursor(null);

			},

			save: () => {

				if (!this._roleDC)
					return;

				_logic.busy();

				let vals = $$(ids.form).getValues() || {};

				let currRoleId = this._roleDC.getCursor();
				let currRole = this._roleDC.getItem(currRoleId);

				// Add new
				let isAdded = false;
				if (!currRole) {
					currRole = CurrentApplication.roleNew(vals);
					isAdded = true;
				}
				// Update
				else {
					for (let key in vals) {
						if (vals[key] != undefined)
							currRole[key] = vals[key];
					}
					isAdded = false;
				}

				// set .filter
				currRole.filter = this._rowFilter.getValue();

				CurrentApplication.roleSave(currRole)
					.catch(err => {
						console.error(err);
						_logic.ready();
					})
					.then(data => {

						if (isAdded) {
							currRole.id = data.id;
							this._roleDC.add(currRole);
							this._roleDC.setCursor(currRole.id);
						}
						else
							this._roleDC.updateItem(currRoleId, data);

						_logic.ready();
					});

			},

			busy: () => {

				if ($$(ids.form) &&
					$$(ids.form).showProgress)
					$$(ids.form).showProgress({ type: "icon" });

			},

			ready: () => {

				if ($$(ids.form) &&
					$$(ids.form).hideProgress)
					$$(ids.form).hideProgress();

			},

		}

		this._logic = _logic;

		// 
		// Define our external interface methods:
		// 
		this.applicationLoad = _logic.applicationLoad;

	}

};