

export default class ABViewFormPropertyDisplayRule extends OP.Component {

	/**
	 * @param {object} App 
	 *      ?what is this?
	 * @param {string} idBase
	 *      Identifier for this component
	 */
	constructor(App, idBase) {
		super(App, idBase);
		var L = this.Label;

		var labels = {
			common: App.labels,
			component: {
				header: L("ab.component.form.displayRule", "*Display Rules"),
				addNewRule: L("ab.component.form.addNewRule", "*Add new rule"),

			}
		};

		// internal list of Webix IDs to reference our UI components.
		var ids = {
			component: this.unique('component'),
		};

		// webix UI definition:
		this.ui = {
			view: "window",
			id: ids.component,
			modal: true,
			position: "center",
			resize: true,
			width: 700,
			height: 450,
			css: 'ab-main-container',
			head: {
				view: "toolbar",
				cols: [
					{ view: "label", label: labels.component.header }
				]
			},
			body: {
				rows: [
					{
						view: "scrollview",
						scroll: true,
						body: {
							view: "layout",
							id: ids.rules,
							margin: 20,
							rows: []
						}
					},
					{
						css: { 'background-color': '#fff' },
						cols: [
							{
								view: "button",
								icon: "plus",
								type: "iconButton",
								label: labels.component.addNewRule,
								width: 150,
								click: function () {
									_logic.addRule();
								}
							},
							{ fillspace: true }
						]
					},
					{
						css: { 'background-color': '#fff' },
						cols: [
							{ fillspace: true },
							{
								view: "button",
								name: "cancel",
								value: labels.common.cancel,
								css: "ab-cancel-button",
								autowidth: true,
								click: function () {
									_logic.buttonCancel();
								}
							},
							{
								view: "button",
								name: "save",
								label: labels.common.save,
								type: "form",
								autowidth: true,
								click: function () {
									_logic.buttonSave();
								}
							}
						]
					}
				]
			}
		};

		var _currentObject = null;

		// for setting up UI
		this.init = (options) => {
			// register callbacks:
			for (var c in _logic.callbacks) {
				_logic.callbacks[c] = options[c] || _logic.callbacks[c];
			}

			webix.ui(this.ui);

			// webix.extend($$(ids.list), webix.ProgressBar);
		};

		var _currentObject = null;

		// for setting up UI
		this.init = (options) => {
			// register callbacks:
			for (var c in _logic.callbacks) {
				_logic.callbacks[c] = options[c] || _logic.callbacks[c];
			}

			webix.ui(this.ui);

			// webix.extend($$(ids.list), webix.ProgressBar);
		};



		// internal business logic 
		var _logic = this._logic = {

			buttonCancel: function () {
				$$(ids.component).hide();
			},

			buttonSave: function () {
			},

			callbacks: {
				onCancel: function () { console.warn('NO onCancel()!') },
				onSave: function (field) { console.warn('NO onSave()!') },
			},

			hide: function () {
				$$(ids.component).hide();
			},

			show: function () {
				$$(ids.component).show();
			},

			objectLoad: function (object) {
				_currentObject = object;
			},

			setValue: function (settings) {

			}

		};



		// Expose any globally accessible Actions:
		this.actions({
		});

		this.objectLoad = _logic.objectLoad;
		this.setValue = _logic.setValue;
		this.show = _logic.show;

	}

}