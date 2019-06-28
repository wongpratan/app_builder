
import ABListNewDataview from "./ab_work_dataview_list_newDataview"
import ABListEditMenu from "./ab_common_popupEditMenu"

export default class AB_Work_Dataview_List extends OP.Component {

	constructor(App) {
		super(App, 'ab_work_dataview_list');
		var L = this.Label;

		var labels = {
			common: App.labels,
			component: {

				addNew: L('ab.dataview.addNew', '*Add new data view'),

				confirmDeleteTitle: L('ab.dataview.delete.title', "*Delete data view"),
				confirmDeleteMessage: L('ab.dataview.delete.message', "*Do you want to delete <b>{0}</b>?"),
				title: L('ab.dataview.list.title', '*Data Views'),
			}
		};

		// internal list of Webix IDs to reference our UI components.
		var ids = {
			component: this.unique('component'),

			list: this.unique('editlist'),
			buttonNew: this.unique('buttonNew')
		};

		// There is a Popup for adding a new Data view:
		var PopupNewDataviewComponent = new ABListNewDataview(App);

		// the popup edit list for each entry in the list.
		var PopupEditObjectComponent = new ABListEditMenu(App);

		// Our webix UI definition:
		this.ui = {
			id: ids.component,
			rows: [
				{
					view: App.custom.editunitlist.view, // "editunitlist"
					id: ids.list,
					width: App.config.columnWidthLarge,
height: 300,
					select: true,

					editaction: 'custom',
					editable: true,
					editor: "text",
					editValue: "label",

					uniteBy: function (item) {
						return labels.component.title;
					},
					template: function (obj, common) {
						return _logic.templateListItem(obj, common);
					},
					type: {
						height: 35,
						headerHeight: 35,
						iconGear: "<div class='ab-object-list-edit'><span class='webix_icon fa fa-cog'></span></div>"
					},
					on: {
						onAfterSelect: function (id) {
							_logic.selectObject(id);
						},
						onBeforeEditStop: function (state, editor) {
							_logic.onBeforeEditStop(state, editor);
						},
						onAfterEditStop: function (state, editor, ignoreUpdate) {
							_logic.onAfterEditStop(state, editor, ignoreUpdate);
						}
					},
					onClick: {
						"ab-object-list-edit": function (e, id, trg) {
							_logic.clickEditMenu(e, id, trg);
						}
					}
				},
				{
					view: 'button',
					id: ids.buttonNew,
					value: labels.component.addNew,
					type: "form",
					click: function () {
						_logic.clickNewDataview(true); // pass true so it will select the new object after you created it
					}
				}
			]
		};

		var CurrentApplication = null;
		var dataviewList = null;

		let _initialized = false;
		let _settings = {};

		// Our init() function for setting up our UI
		this.init = (options) => {

			// register our callbacks:
			for (var c in _logic.callbacks) {
				_logic.callbacks[c] = options[c] || _logic.callbacks[c];
			}

			if ($$(ids.component))
				$$(ids.component).adjust();

			if ($$(ids.list)) {
				webix.extend($$(ids.list), webix.ProgressBar);
				$$(ids.list).adjust();
			}

			PopupNewDataviewComponent.init({
				onDone: _logic.callbackNewDataview
			});

			PopupEditObjectComponent.init({
				onClick: _logic.callbackDataviewEditorMenu,
				hideCopy: true
			});

			// mark initialed
			_initialized = true;

		};


		// our internal business logic
		var _logic = this._logic = {

			callbacks: {

				/**
				 * @function onChange
				 */
				onChange: function () { }
			},


			/**
			 * @function applicationLoad
			 *
			 * Initialize the Object List from the provided ABApplication
			 *
			 * If no ABApplication is provided, then show an empty form. (create operation)
			 *
			 * @param {ABApplication} application  	[optional] The current ABApplication
			 *										we are working with.
			 */
			applicationLoad: function (application) {
				_logic.listBusy();

				CurrentApplication = application;

				// get a DataCollection of all our objects
				dataviewList = new webix.DataCollection({
					data: application.dataviews(),
				});

				// clear our list and display our objects:
				var List = $$(ids.list);
				List.clearAll();
				List.data.unsync();
				List.data.sync(dataviewList);
				List.refresh();
				List.unselectAll();

				// hide progress loading cursor
				_logic.listReady();

				// prepare our Popup with the current Application
				PopupNewDataviewComponent.applicationLoad(application);

			},

			/**
			 * @function clickNewDataview
			 *
			 * Manages initiating the transition to the new Object Popup window
			 */
			clickNewDataview: function (selectNew, callback) {
				// show the new popup
				PopupNewDataviewComponent.show(selectNew, callback);
			},

			/**
			 * @function callbackNewDataview
			 *
			 * Once a New Data view was created in the Popup, follow up with it here.
			 */
			callbackNewDataview: function (err, dataview, selectNew, callback) {

				if (err) {
					OP.Error.log('Error creating New Dataview', { error: err });
					return;
				}

				let dataviews = CurrentApplication.dataviews();
				dataviewList.parse(dataviews);

				// if (objectList.exists(object.id))
				// 	objectList.updateItem(object.id, object);
				// else
				// 	objectList.add(object);

				if (selectNew != null && selectNew == true) {
					$$(ids.list).select(dataview.id);
				}
				else if (callback) {
					callback();
				}

			},

			clickEditMenu: function (e, id, trg) {
				// Show menu
				PopupEditObjectComponent.show(trg);

				return false;
			},

			callbackDataviewEditorMenu: function (action) {
				switch (action) {
					case 'rename':
						_logic.rename();
						break;
					case 'exclude':
						_logic.exclude();
						break;
					case 'delete':
						_logic.remove();
						break;
				}
			},

			exclude: function () {
				var dataviewId = $$(ids.list).getSelectedId(false);

				_logic.listBusy();

				CurrentApplication.dataviewExclude(dataviewId)
					.then(() => {

						dataviewList.remove(dataviewId);

						_logic.listReady();

						// clear object workspace
						_logic.callbacks.onChange(null);
					});

			},

			rename: function () {
				var dataviewId = $$(ids.list).getSelectedId(false);
				$$(ids.list).edit(dataviewId);
			},

			remove: function () {

				var selectedDataview = $$(ids.list).getSelectedItem(false);

				// verify they mean to do this:
				OP.Dialog.Confirm({
					title: labels.component.confirmDeleteTitle,
					message: labels.component.confirmDeleteMessage.replace('{0}', selectedDataview.label),
					callback: (isOK) => {

						if (isOK) {
							_logic.listBusy();

							selectedDataview.destroy()
								.then(() => {
									_logic.listReady();

									objectList.remove(selectedDataview.id);

									// refresh items list
									_logic.callbackNewDataview();

									// clear object workspace
									_logic.callbacks.onChange(null);
								});

						}
					}
				})
			},

			listBusy: () => {
				if ($$(ids.list) &&
					$$(ids.list).showProgress)
					$$(ids.list).showProgress({ type: "icon" });
			},

			listReady: () => {
				if ($$(ids.list) &&
					$$(ids.list).hideProgress)
					$$(ids.list).hideProgress();
			}

		};

		// 
		// Define our external interface methods:
		// 
		this.applicationLoad = _logic.applicationLoad;
		this.busy = _logic.listBusy;
		this.ready = _logic.listReady;


	}

}