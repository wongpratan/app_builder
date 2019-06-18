/*
 * ab_work_query_list_newQuery_blank
 *
 * Display the form for creating a new Application.
 *
 */


export default class AB_Work_Query_List_NewQuery_Blank extends OP.Component {

	constructor(App) {
		super(App, 'ab_work_query_list_newQuery_blank');
		var L = this.Label;

		var labels = {
			common: App.labels,
			component: {
				queryName: L('ab.query.name', '*Name'),
				queryNamePlaceholder: L('ab.query.namePlaceholder', '*Query name'),
				addNewQuery: L('ab.query.addNewQuery', '*Add query'),
				object: L('ab.query.object', '*Object'),
				objectPlaceholder: L('ab.query.objectPlaceholder', '*Select an object')
			}
		};

		// internal list of Webix IDs to reference our UI components.
		var ids = {
			component: this.unique('component'),

			form: this.unique('form'),
			buttonCancel: this.unique('buttonCancel'),
			buttonSave: this.unique('buttonSave'),
			object: this.unique('object')
		};

		// Our webix UI definition:
		this.ui = {
			id: ids.component,
			header: labels.common.create,
			body: {
				view: "form",
				id: ids.form,
				rules: {
				},
				elements: [
					{
						view: "text",
						label: labels.component.queryName,
						name: "name",
						required: true,
						placeholder: labels.component.queryNamePlaceholder,
						labelWidth: App.config.labelWidthMedium
					},
					{
						view: "richselect",
						id: ids.object,
						name: "object",
						label: labels.component.object,
						labelWidth: App.config.labelWidthMedium,
						placeholder: labels.component.objectPlaceholder,
						required: true
					},
					{
						margin: 5,
						cols: [
							{ fillspace: true },
							{
								view: "button",
								id: ids.buttonCancel,
								value: labels.common.cancel,
								css: "ab-cancel-button",
								autowidth: true,
								click: function () {
									_logic.hide();
								}
							},
							{
								view: "button",
								id: ids.buttonSave,
								value: labels.component.addNewQuery,
								autowidth: true,
								type: "form",
								click: function () {
									return _logic.save();
								}
							}
						]
					}
				]
			}
		};

		// Our init() function for setting up our UI
		this.init = (options) => {
			// webix.extend($$(ids.form), webix.ProgressBar);

			// load up our callbacks.
			for (var c in _logic.callbacks) {
				_logic.callbacks[c] = options[c] || _logic.callbacks[c];
			}

		}

		let currentApp;


		// our internal business logic 
		var _logic = this._logic = {

			callbacks: {
				onCancel: function () { console.warn('NO onCancel()!') },
				onSave: function (values, cb) { console.warn('NO onSave()!') },
			},

			onShow: (app) => {

				currentApp = app;

			},

			cancel: function () {

				_logic.formClear();
				_logic.callbacks.onCancel();
			},


			formClear: function () {
				$$(ids.form).clearValidation();
				$$(ids.form).clear();
			},


			/**
			* @function hide()
			*
			* hide this component.
			*/
			hide: function () {

				let $elem = $$(ids.component);
				if ($elem &&
					$elem.hide)
					$elem.hide();

			},


			/**
			* @function save
			*
			* verify the current info is ok, package it, and return it to be 
			* added to the application.createModel() method.
			*/
			save: function () {

				// validate
				if (!$$(ids.form).validate()) return;

				var saveButton = $$(ids.buttonSave);
				saveButton.disable();

				var formVals = $$(ids.form).getValues(),
					queryName = formVals["name"],
					objectId = formVals["object"];

				var selectedObj = currentApp.objects(obj => obj.id == objectId)[0];

				// create an instance of ABObjectQuery
				var query = currentApp.queryNew({
					name: queryName,
					label: queryName,
					joins: {
						alias: "BASE_OBJECT", // TODO
						objectURL: selectedObj.urlPointer(),
						links: []
					}
				});

				// save to db
				query.save()
					.then(() => {
						saveButton.enable();

						_logic.done(query);
					})
					.catch(err => {

						saveButton.enable();

						_logic.callbacks.onDone(err);

					});

			},


			/**
			* @function show()
			*
			* Show this component.
			*/
			show: function () {

				if ($$(ids.component))
					$$(ids.component).show();

				// populate object list
				if ($$(ids.object)) {

					let objectOpts = currentApp.objects().map(obj => {
						return {
							id: obj.id,
							value: obj.label
						};
					});

					$$(ids.object).define("options", objectOpts);
					$$(ids.object).refresh();
				}

				// clear form
				$$(ids.form).setValues({
					name: '',
					object: ''
				});
			}
		};


		// Expose any globally accessible Actions:
		this.actions({

		});


		// 
		// Define external interface methods:
		// 
		this.onShow = _logic.onShow

	}

}