import ABViewProperty from "./ABViewProperty"

var L = (key, altText) => {
	return AD.lang.label.getLabel(key) || altText;
};

export default class ABViewPropertyLinkPage extends ABViewProperty {

	constructor() {
		super();

	}

	/**
	 * @property default
	 * return default settings
	 * 
	 * @return {Object}
	 */
	static get default() {
		return {
			detailsPage: null,	// uuid
			detailsTab: null,	// uuid
			editPage: null,		// uuid
			editTab: null		// uuid
		};
	}

	static propertyComponent(App, idBase) {

		let base = super.propertyComponent();

		let ids = {
			detailsPage: idBase + '_linkPage_detailsPage',
			editPage: idBase + '_linkPage_editPage'
		};

		let labels = {
			common: App.labels,
			component: {
				// header: L("ab.component.grid.filterMenu", "*Filter Menu")
			}
		};

		let ui = {
			view: "fieldset",
			label: L('ab.component.label.linkedPages', '*Linked Pages:'),
			labelWidth: App.config.labelWidthLarge,
			body: {
				type: "clean",
				padding: 10,
				rows: [
					{
						id: ids.detailsPage,
						view: "select",
						name: "detailsPage",
						label: L('ab.component.label.detailsPage', '*Details Page:'),
						labelWidth: App.config.labelWidthLarge,
					},
					{
						id: ids.editPage,
						view: "select",
						name: "editPage",
						label: L('ab.component.label.editForm', '*Edit Form:'),
						labelWidth: App.config.labelWidthLarge,
					}
				]
			}
		};

		let init = (options) => {

			// register callbacks:
			for (var c in logic.callbacks) {
				logic.callbacks[c] = options[c] || logic.callbacks[c];
			}

		};

		let logic = {

			callbacks: {
				// onCancel: function () { console.warn('NO onCancel()!') },
			},

			viewLoad: (view) => {

				this.view = view;

				// Set the options of the possible detail views
				var detailViews = [
					{ id: '', value: L('ab.component.label.noLinkedView', '*No linked view') }
				];

				detailViews = view.loopPages(view, view.application._pages, detailViews, "detail");
				$$(ids.detailsPage).define("options", detailViews);
				$$(ids.detailsPage).refresh();

				// Set the options of the possible edit forms
				var editForms = [
					{ id: '', value: L('ab.component.label.noLinkedForm', '*No linked form') }
				];
				editForms = view.loopPages(view, view.application._pages, editForms, "form");
				view.application._pages.forEach((o) => {
					o._views.forEach((j) => {
						if (j.key == "form" && j.settings.object == view.settings.datacollection) {
							editForms.push({ id: j.parent.id, value: j.label });
						}
						if (j.key == "tab") {
							j._views.forEach((k) => {
								k._views.forEach((l) => {
									if (l.key == "form" && l.settings.datacollection == view.settings.datacollection) {
										editForms.push({ id: l.parent.id, value: l.label });
									}
								});
							});
						}
					});
				});

				$$(ids.editPage).define("options", editForms);
				$$(ids.editPage).refresh();

			},

			setSettings: (settings) => {

				var details = settings.detailsPage;
				if (settings.detailsTab != "") {
					details += ":" + settings.detailsTab;
				}
				$$(ids.detailsPage).setValue(details);

				var edit = settings.editPage;
				if (settings.editTab != "") {
					edit += ":" + settings.editTab;
				}
				$$(ids.editPage).setValue(edit);

			},

			getSettings: () => {

				let settings = {};

				var detailsPage = $$(ids.detailsPage).getValue();
				var detailsTab = "";
				if (detailsPage.split(":").length > 1) {
					var detailsVals = detailsPage.split(":");
					detailsPage = detailsVals[0];
					detailsTab = detailsVals[1];
				}
				settings.detailsPage = detailsPage;
				settings.detailsTab = detailsTab;

				var editPage = $$(ids.editPage).getValue();
				var editTab = "";
				if (editPage.split(":").length > 1) {
					var editVals = editPage.split(":");
					editPage = editVals[0];
					editTab = editVals[1];
				}
				settings.editPage = editPage;
				settings.editTab = editTab;

				return settings;

			}

		};


		return {
			ui: ui,
			init: init,
			logic: logic,

			viewLoad: logic.viewLoad,
			setSettings: logic.setSettings,
			getSettings: logic.getSettings

		};

	}

	/** == UI == */
	/**
	 * @param {object} App 
	 *      The shared App object that is created in OP.Component
	 * @param {string} idBase
	 *      Identifier for this component
	 */
	component(App, idBase) {

		let base = super.component(App, idBase);

		/**
		 * @method init
		 * @param {Object} options - {
		 * 								view: {ABView},
		 * 								dataCollection: {ABViewDataCollection}
		 * 							}
		 */
		let init = (options) => {

			base.init(options);

			if (options.view)
				this.view = options.view;

			if (options.dataCollection)
				this.dataCollection = options.dataCollection;

		}

		let logic = {

			changePage: (pageId, rowId) => {

				if (this.dataCollection)
					this.dataCollection.setCursor(rowId);

				if (this.view)
					this.view.changePage(pageId);
			}

		};

		return {
			ui: base.ui,
			init: init,
			logic: logic,

			changePage: logic.changePage
		};


	}


}