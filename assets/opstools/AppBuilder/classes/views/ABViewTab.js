/*
 * ABViewTab
 *
 * An ABViewTab defines a UI tab display component.
 *
 */

import ABView from "./ABView"
import ABViewManager from "../ABViewManager"


function L(key, altText) {
	return AD.lang.label.getLabel(key) || altText;
}


var ABViewTabPropertyComponentDefaults = {
}


var ABViewTabDefaults = {
	key: 'tab',						// {string} unique key for this view
	icon: 'window-maximize',		// {string} fa-[icon] reference for this view
	labelKey: 'ab.components.tab'	// {string} the multilingual label key for the class label
}



export default class ABViewTab extends ABView {

	/**
	 * @param {obj} values  key=>value hash of ABView values
	 * @param {ABApplication} application the application object this view is under
	 * @param {ABView} parent the ABView this view is a child of. (can be null)
	 */
	constructor(values, application, parent) {

		super(values, application, parent, ABViewTabDefaults);

	}


	static common() {
		return ABViewTabDefaults;
	}





	///
	/// Instance Methods
	///

	//
	//	Editor Related
	//


	/** 
	 * @method editorComponent
	 * return the Editor for this UI component.
	 * the editor should display either a "block" view or "preview" of 
	 * the current layout of the view.
	 * @param {string} mode what mode are we in ['block', 'preview']
	 * @return {Component} 
	 */
	editorComponent(App, mode) {

		var idBase = 'ABViewTabEditorComponent';
		var ids = {
			component: App.unique(idBase + '_component'),
			view: App.unique(idBase + '_view')
		};

		var _init = (options) => {
		}

		var _logic = {

			templateBlock: (tab) => {
				var _template = [
					'<div class="ab-component-in-page">',
					'<div id="' + ids.view + '_#objID#" >',
					'<i class="fa fa-#icon#"></i>',
					' #label#',
					'</div>',
					'</div>'
				].join('');

				return _template
					.replace('#objID#', tab.id)
					.replace('#icon#', tab.icon)
					.replace('#label#', tab.label);
			},

			tabEdit: (e, id, trg) => {

				var view = this.views(function (v) { return v.id == id; })[0];

				if (!view) return false;

				// NOTE: let webix finish this onClick event, before
				// calling .populateInterfaceWorkspace() which will replace
				// the interface elements with the edited view.  (apparently
				// that causes errors.)
				setTimeout(() => {
					App.actions.populateInterfaceWorkspace(view);
				}, 50);

				e.preventDefault();
				return false;

			},

			tabRemove: (e, id, trg) => {

				var deletedView = this.views((v) => v.id == id)[0];
				if (deletedView) {

					OP.Dialog.Confirm({
						title: L('ab.interface.component.tab.confirmDeleteTitle', '*Delete tab'),
						text: L('ab.interface.component.tab.confirmDeleteMessage', 'Do you want to delete <b>{0}</b>?').replace('{0}', deletedView.label),
						callback: (result) => {
							if (result) {
								this.viewDestroy(deletedView);

								// remove tab option
								$$(ids.component).removeView(id);
							}
						}
					});

				}

				e.preventDefault();
				return false;

			}
		};


		var tabElem = this.component(App).ui;
		tabElem.id = ids.component;
		tabElem.cells.forEach((tabView) => {
			var tab = this.views(v => v.id == tabView.id)[0];

			if (mode == 'block') {

				tabView.body = {
					view: 'list',
					data: tab.views(),
					autoheight: true,
					template: (tab, common) => {
						return _logic.templateBlock(tab, common);
					}
				};

			}

			// Add actions buttons - Edit , Delete
			tabView.body = {
				rows: [
					tabView.body,
					{
						view: 'template',
						type: 'clean',
						template: '<div class="ab-component-tools ab-layout-view">' +
						'<i class="fa fa-trash ab-component-remove"></i>' +
						'<i class="fa fa-edit ab-component-edit"></i>' +
						'</div>',
						onClick: {
							"ab-component-edit": function (e, id, trg) {
								_logic.tabEdit(e, tabView.id, trg);
							},
							"ab-component-remove": function (e, id, trg) {
								_logic.tabRemove(e, tabView.id, trg);
							}
						}
					}
				]
			}

		});

		var _ui = {
			rows: [
				tabElem,
				{}
			]
		};


		return {
			ui: _ui,
			init: _init,
			logic: _logic
		}
	}



	//
	// Property Editor
	// 

	static addTab(ids, _logic) {

		// get current instance and .addColumn()
		var LayoutView = _logic.currentEditObject();
		LayoutView.addTab();

		// trigger a save()
		this.propertyEditorSave(ids, LayoutView);
	}


	static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {

		var commonUI = super.propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults);


		// if I don't create my own propertyEditorComponent, then I need to 
		// create the onClick handler that will cause the current view instance
		// to create a vew sub view/ column
		if (!_logic.onClick) {
			_logic.onClick = () => {
				this.addTab(ids, _logic)
			}
		}

		// in addition to the common .label  values, we 
		// ask for:
		return commonUI.concat([

			// [button] : add tab
			{
				view: 'button',
				value: L('ab.component.tab.addTab', '*Add Tab'),
				click: _logic.onClick
			}

		]);

	}


	addTab() {

		var tabName = "#name# #index#"
			.replace('#name#', L('ab.components.tab', '*Tab'))
			.replace('#index#', this._views.length + 1);

		this._views.push(ABViewManager.newView({
			key: ABView.common().key,
			label: tabName
		}, this.application, this));

	}


	/*
	 * @component()
	 * return a UI component based upon this view.
	 * @param {obj} App 
	 * @return {obj} UI component
	 */
	component(App) {

		// get a UI component for each of our child views
		var viewComponents = [];
		this.views().forEach((v) => {
			viewComponents.push({
				view: v,
				component: v.component(App)
			});
		})

		var idBase = 'ABViewTab_' + this.id;
		var ids = {
			component: App.unique(idBase + '_component'),
		}

		var _ui = {};

		if (viewComponents.length > 0) {
			_ui = {
				view: 'tabview',
				id: ids.component,
				cells: viewComponents.map((v) => {

					var tabUi = v.component.ui;
					tabUi.id = v.view.id;

					return {
						id: v.view.id,
						header: v.view.label,
						body: tabUi
					};
				})
			}
		}
		else {
			_ui = {
				view: 'spacer'
			};
		}


		// make sure each of our child views get .init() called
		var _init = (options) => {
		}


		return {
			ui: _ui,
			init: _init
		}
	}


	/*
	 * @method componentList
	 * return the list of components available on this view to display in the editor.
	 */
	componentList() {
		return [];
	}


}