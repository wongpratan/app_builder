const ABViewMenuCore = require("../../core/views/ABViewMenuCore");
const ABViewTab = require("./ABViewTab");

const ABViewMenuPropertyComponentDefaults = ABViewMenuCore.defaultValues();

function L(key, altText) {
	return AD.lang.label.getLabel(key) || altText;
}

module.exports = class ABViewMenu extends ABViewMenuCore {

	constructor(values, application, parent, defaultValues) {

		super(values, application, parent, defaultValues);

	}

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

		var idBase = 'ABViewMenuEditorComponent';
		var ids = {
			component: App.unique(idBase + '_component'),
			pages: App.unique(idBase + '_pages')
		}

		var component = this.component(App);

		var menu = component.ui;
		if (component.ui.elements) {
			var menuIndex = 0;
			component.ui.elements.forEach((elem) => {
				if (elem.view == "menu") {
					menu = component.ui.elements[menuIndex];
				}
				menuIndex++;
			});
		}
		menu.id = ids.component;
		menu.drag = true;
		// menu[0].id = ids.component;
		menu.on = {
			onAfterDrop: (context, native_event) => {
				var orderedPageIds = context.from.data.order.slice(0);

				// reorder
				(this.settings.pages || []).sort(function (a, b) {

					var itemIdA = a.tabId || a.pageId;
					var itemIdB = b.tabId || b.pageId;

					return orderedPageIds.indexOf(itemIdA) - orderedPageIds.indexOf(itemIdB);
				});

				this.save();
			}
		}

		var _ui = {
			type: "space",
			rows: [
				menu,
				{
					view: "label",
					label: "Drag and drop menu items to reorder.",
					align: "center"
				},
				{}
			]
		};

		var _init = (options) => {

			var Menu = $$(ids.component);

			this.ClearPagesInView(Menu);
			if (this.settings.pages && this.settings.pages.length > -1) {
				// var orderMenu = [];
				// var orderMenu = this.AddPagesToView(this.application, Menu, this.settings.pages, orderMenu);
				// this.AddOrderedPagesToView(this.application, Menu, this.settings.pages, orderMenu);

				this.AddPagesToView(Menu, this.settings.pages);

			}

		}

		var _logic = {
		}


		return {
			ui: _ui,
			init: _init,
			logic: _logic
		}
	}



	//
	// Property Editor
	// 

	static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {

		var commonUI = super.propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults);


		return commonUI.concat([
			{
				name: 'orientation',
				view: "richselect",
				label: L('ab.component.menu.orientation', '*Orientation'),
				value: ABViewMenuPropertyComponentDefaults.orientation,
				labelWidth: App.config.labelWidthXLarge,
				options: [
					{ id: 'x', value: L('ab.component.menu.horizontal', '*Horizontal') },
					{ id: 'y', value: L('ab.component.menu.vertical', '*Vertical') }
				]
			},
			{
				name: 'buttonStyle',
				view: "richselect",
				label: L('ab.component.menu.buttonStyle', '*Button Style'),
				value: ABViewMenuPropertyComponentDefaults.buttonStyle,
				labelWidth: App.config.labelWidthXLarge,
				options: [
					{ id: 'ab-menu-default', value: L('ab.common.default', '*Default') },
					{ id: 'ab-menu-link', value: L('ab.component.menu.linkeButton', '*Link') }
				]
			},
			{
				name: 'menuAlignment',
				view: "richselect",
				label: L('ab.component.menu.menuAlignment', '*Menu Alignment'),
				value: ABViewMenuPropertyComponentDefaults.menuAlignment,
				labelWidth: App.config.labelWidthXLarge,
				options: [
					{ id: 'ab-menu-left', value: L('ab.component.menu.alignLeft', '*Left') },
					{ id: 'ab-menu-center', value: L('ab.component.menu.alignCenter', '*Center') },
					{ id: 'ab-menu-right', value: L('ab.component.menu.alignRight', '*Right') }
				]
			},
			{
				name: 'menuInToolbar',
				view: "checkbox",
				labelRight: L('ab.component.menu.menuInToolbar', '*Put menu in toolbar'),
				value: ABViewMenuPropertyComponentDefaults.menuInToolbar,
				labelWidth: App.config.labelWidthCheckbox
			},
			{
				name: "toolbarFieldset",
				view: "fieldset",
				label: L('ab.component.menu.toolbarSettings', '*Toolbar Settings:'),
				labelWidth: App.config.labelWidthLarge,
				body: {
					view: "layout",
					type: "clean",
					padding: 10,
					rows: [
						{
							name: 'menuPadding',
							view: "counter",
							label: L('ab.component.menu.menuPadding', '*Toolbar padding'),
							value: ABViewMenuPropertyComponentDefaults.menuPadding,
							labelWidth: App.config.labelWidthLarge
						},
						{
							name: 'menuTheme',
							view: "richselect",
							label: L('ab.component.menu.menuTheme', '*Toolbar theme'),
							value: ABViewMenuPropertyComponentDefaults.menuTheme,
							labelWidth: App.config.labelWidthLarge,
							options: [
								{ id: "white", value: L('ab.component.menu.menuTheme.light', '*White (Default)') },
								{ id: "bg_gray", value: L('ab.component.menu.menuTheme.gray', '*Gray') },
								{ id: "webix_dark", value: L('ab.component.menu.menuTheme.dark', '*Dark') },
							]
						},
						{
							name: 'menuPosition',
							view: "richselect",
							label: L('ab.component.menu.menuPosition', '*Menu Position'),
							value: ABViewMenuPropertyComponentDefaults.menuPosition,
							labelWidth: App.config.labelWidthLarge,
							options: [
								{ id: "left", value: L('ab.common.left', '*Left') },
								{ id: "center", value: L('ab.common.center', '*Center') },
								{ id: "right", value: L('ab.common.right', '*Right') },
							]
						},
						{
							name: 'menuTextLeft',
							view: "text",
							label: L('ab.component.menu.menuTextLeft', '*Text Left'),
							placeholder: L('ab.component.menu.menuTextLeftPlaceholder', '*Place text in left region of toolbar.'),
							labelWidth: App.config.labelWidthLarge,
							labelPosition: "top"
						},
						{
							name: 'menuTextCenter',
							view: "text",
							label: L('ab.component.menu.menuTextCenter', '*Text Center'),
							placeholder: L('ab.component.menu.menuTextCenterPlaceholder', '*Place text in center region of toolbar.'),
							labelWidth: App.config.labelWidthLarge,
							labelPosition: "top"
						},
						{
							name: 'menuTextRight',
							view: "text",
							label: L('ab.component.menu.menuTextRight', '*Text Right'),
							placeholder: L('ab.component.menu.menuTextRighttPlaceholder', '*Place text in right region of toolbar.'),
							labelWidth: App.config.labelWidthLarge,
							labelPosition: "top"
						},
					]
				}
			},
			{
				name: "pagesFieldset",
				view: "fieldset",
				label: L('ab.component.menu.pageList', '*Page List:'),
				labelWidth: App.config.labelWidthLarge,
				body: {
					view: "layout",
					type: "clean",
					padding: 10,
					rows: [
						{
							name: "pages",
							view: 'edittree',
							borderless: true,
							css: "transparent",
							editor: "inline-text",
							editable: true,
							editValue: "aliasname",
							editor: "text",
							template: function (item, common) {
								return ("<div class='ab-page-list-item'>" +
									"{common.icon()} " +

									// TODO : Hide checkbox at own page
									// (item.id == _logic.currentEditObject().parent.id ?
									(false ?
										'<input type="checkbox" class="webix_tree_checkbox" disabled="disabled">' :
										"{common.checkbox()} ") +

									' <div class="fa fa-{common.fieldIcon()}"></div>' +
									" #label#" +
									"</div>")
									.replace('{common.icon()}', common.icon(item))
									.replace('{common.checkbox()}', common.checkbox(item, false))
									.replace('{common.fieldIcon()}', (item.key == "viewcontainer" ? "window-maximize" : "file"))
									.replace('#label#', item.aliasname ? item.aliasname : item.label);
							},
							on: {
								onItemCheck: function () {
									// trigger to save settings
									_logic.onChange();
								},
								onBeforeEditStart: function (id) {
									var item = this.getItem(id);
									if (!item.aliasname) {
										item.aliasname = item.label;
										this.updateItem(item);
									}
								},
								onBeforeEditStop: function (state, editor) {
									var item = this.getItem(editor.id);
									if (item) {
										item.aliasname = state.value;
										this.updateItem(item);
									}

									_logic.onChange();
								}
							}
						}
					]
				}
			}
		]);


	}

	static propertyEditorPopulate(App, ids, view) {

		super.propertyEditorPopulate(App, ids, view);

		$$(ids.orientation).setValue(view.settings.orientation || ABViewMenuPropertyComponentDefaults.orientation);
		$$(ids.buttonStyle).setValue(view.settings.buttonStyle || ABViewMenuPropertyComponentDefaults.buttonStyle);
		$$(ids.menuAlignment).setValue(view.settings.menuAlignment || ABViewMenuPropertyComponentDefaults.menuAlignment);
		$$(ids.menuInToolbar).setValue(parseInt(view.settings.menuInToolbar) || ABViewMenuPropertyComponentDefaults.menuInToolbar);
		$$(ids.menuPadding).setValue(view.settings.menuPadding || ABViewMenuPropertyComponentDefaults.menuPadding);
		$$(ids.menuTheme).setValue(view.settings.menuTheme || ABViewMenuPropertyComponentDefaults.menuTheme);
		$$(ids.menuPosition).setValue(view.settings.menuPosition || ABViewMenuPropertyComponentDefaults.menuPosition);
		$$(ids.menuTextLeft).setValue(view.settings.menuTextLeft || ABViewMenuPropertyComponentDefaults.menuTextLeft);
		$$(ids.menuTextCenter).setValue(view.settings.menuTextCenter || ABViewMenuPropertyComponentDefaults.menuTextCenter);
		$$(ids.menuTextRight).setValue(view.settings.menuTextRight || ABViewMenuPropertyComponentDefaults.menuTextRight);

		var pageTree = new webix.TreeCollection();
		var application = view.application;
		var currentPage = view.pageParent();
		var parentPage = currentPage.pageParent();

		/**
		 * @method addPage
		 * 
		 * @param {ABView} page 
		 * @param {integer} index 
		 * @param {uuid} parentId 
		 */
		var addPage = function (page, index, parentId) {

			// update .aliasname and .translations of the page
			if (view.settings.pages) {
				view.settings.pages.forEach((localpage) => {
					if (localpage.pageId == page.id) {
						page.aliasname = view.getAliasname(localpage);
					}
				});
			}

			// add to tree collection
			pageTree.add(page, index, parentId);

			// add sub-pages
			var subPages = (page.pages ? page.pages() : []);
			subPages.forEach((childPage, childIndex) => {
				addPage(childPage, childIndex, page.id);
			});

			// add tabs
			page.views(v => v instanceof ABViewTab).forEach((tab, tabIndex) => {

				// tab views
				tab.views().forEach((tabView, tabViewIndex) => {

					// tab items will be below sub-page items
					var tIndex = (subPages.length + tabIndex + tabViewIndex);

					addPage(tabView, tIndex, page.id);

				});

			});

		}

		application
			.pages(p => ((parentPage && parentPage.id == p.id) || (currentPage && currentPage.id == p.id)), true)
			.forEach((p, index) => {
				addPage(p, index);
			});

		$$(ids.pages).clearAll();
		// $$(ids.pages).data.unsync();
		$$(ids.pages).data.importData(pageTree);
		$$(ids.pages).refresh();
		$$(ids.pages).uncheckAll();
		$$(ids.pages).openAll();

		// Select pages
		if (view.settings.pages && view.settings.pages.forEach) {
			view.settings.pages.forEach((page) => {

				if (page.isChecked) {
					if ($$(ids.pages).exists(page.tabId || page.pageId))
						$$(ids.pages).checkItem(page.tabId || page.pageId);
				}

			});
		}

		// $$(ids.pagesFieldset).config.height = ($$(ids.pages).count()*28)+18; // Number of pages plus 9px of padding top and bottom
		$$(ids.pagesFieldset).config.height = ($$(ids.pages).count() * 28) + 18 + 40; // Number of pages plus 9px of padding top and bottom
		$$(ids.pagesFieldset).resize();
	}

	static propertyEditorValues(ids, view) {

		super.propertyEditorValues(ids, view);

		view.settings.orientation = $$(ids.orientation).getValue();
		view.settings.buttonStyle = $$(ids.buttonStyle).getValue();
		view.settings.menuAlignment = $$(ids.menuAlignment).getValue();
		view.settings.menuInToolbar = $$(ids.menuInToolbar).getValue();
		view.settings.menuPadding = $$(ids.menuPadding).getValue();
		view.settings.menuTheme = $$(ids.menuTheme).getValue();
		view.settings.menuPosition = $$(ids.menuPosition).getValue();
		view.settings.menuTextLeft = $$(ids.menuTextLeft).getValue();
		view.settings.menuTextCenter = $$(ids.menuTextCenter).getValue();
		view.settings.menuTextRight = $$(ids.menuTextRight).getValue();

		var pagesIdList = []
		var temp = $$(ids.pages).data.count();
		if ($$(ids.pages)) {
			for (var i = 0; i < $$(ids.pages).data.count(); i++) {
				var currentPageId = $$(ids.pages).getIdByIndex(i);
				var currentItem = $$(ids.pages).getItem(currentPageId);

				var type = "page",
					tabId;
				if (currentItem.key == 'viewcontainer') {
					type = "tab";
					tabId = currentPageId;
					currentPageId = currentItem.pageParent().id;
				} else {
					// if we have left the tabs we were looping through we need to reset the tabId
					tabId = "";
				}

				let pageInfo = view.settings.pages.filter(p => p.pageId == currentPageId)[0];

				pagesIdList.push({
					pageId: currentPageId,
					tabId: tabId,
					type: type,
					isChecked: currentItem.checked,
					aliasname: currentItem.aliasname,
					translations: pageInfo && pageInfo.translations ? pageInfo.translations : []
				});
			}
		}
		view.settings.pages = pagesIdList;

	}



	/*
	 * @component()
	 * return a UI component based upon this view.
	 * @param {obj} App 
	 * @return {obj} UI component
	 */
	component(App) {

		var idBase = 'ABMenuLabel_' + this.id;
		var ids = {
			component: App.unique(idBase + '_component'),
		}

		var css = "";

		if (this.settings.buttonStyle) {
			css += this.settings.buttonStyle + " ";
		} else {
			css += ABViewMenuPropertyComponentDefaults.buttonStyle + " "
		}

		if (this.settings.menuAlignment) {
			css += this.settings.menuAlignment + " ";
		} else {
			css += ABViewMenuPropertyComponentDefaults.menuAlignment + " "
		}


		var _ui = {
			id: ids.component,
			view: "menu",
			autoheight: true,
			autowidth: true,
			datatype: "json",
			css: css,
			layout: this.settings.orientation || ABViewMenuPropertyComponentDefaults.orientation,
			on: {
				onItemClick: (id, e, node) => {

					// switch tab view
					var item = $$(ids.component).getItem(id);
					if (item.type == "tab") {

						this.changePage(item.pageId);

						var redirectPage = this.application.pages(p => p.id == item.pageId, true)[0];
						if (!redirectPage) return;

						var tabView = redirectPage.views(v => v.id == item.id, true)[0];
						if (!tabView) return;

						var tab = tabView.parent;
						if (!tab) return;

						tab.emit('changeTab', tabView.id);

					}
					// switch page
					else {
						this.changePage(id);
					}

				}
			}
		};

		if (parseInt(this.settings.menuInToolbar)) {
			var elems = [];
			var menuIncluded = false;

			if (this.settings.menuPosition && this.settings.menuPosition == "left") {
				menuIncluded = true;
				elems.push(_ui);
			} else if (this.settings.menuTextLeft && this.settings.menuTextLeft.length) {
				let width = this.settings.menuTextLeft.length * 15;
				elems.push({
					view: "label",
					label: this.settings.menuTextLeft,
					align: "left",
					width: width
				});
			} else {
				elems.push({
					view: "label",
					label: "",
					autowidth: true
				});
			}

			if (this.settings.menuPosition && this.settings.menuPosition == "center") {
				menuIncluded = true;
				elems.push(_ui);
			} else if (this.settings.menuTextCenter && this.settings.menuTextCenter.length) {
				let width = this.settings.menuTextLeft.length * 15;
				elems.push({});
				elems.push({
					view: "label",
					label: this.settings.menuTextCenter,
					align: "center",
					width: width
				});
				elems.push({});
			} else {
				elems.push({
					view: "label",
					label: "",
					autowidth: true
				});
			}

			if (this.settings.menuPosition && this.settings.menuPosition == "right") {
				menuIncluded = true;
				elems.push(_ui);
			} else if (this.settings.menuTextRight && this.settings.menuTextRight.length) {
				let width = this.settings.menuTextLeft.length * 15;
				elems.push({
					view: "label",
					label: this.settings.menuTextRight,
					align: "right",
					width: width
				});
			} else {
				elems.push({
					view: "label",
					label: "",
					autowidth: true
				});
			}

			if (menuIncluded == false) {
				elems = [_ui];
			}

			_ui = {
				view: "toolbar",
				css: this.settings.menuTheme ? this.settings.menuTheme : ABViewMenuPropertyComponentDefaults.menuTheme,
				padding: this.settings.menuPadding ? parseInt(this.settings.menuPadding) : ABViewMenuPropertyComponentDefaults.menuPadding,
				elements: elems
			}
		}

		// make sure each of our child views get .init() called
		var _init = (options) => {

			var Menu = $$(ids.component);
			if (Menu) {
				this.ClearPagesInView(Menu);
				if (this.settings.pages && this.settings.pages.length > -1) {
					// var orderMenu = [];
					// var orderMenu = this.AddPagesToView(this.application, Menu, this.settings.pages, orderMenu);
					// this.AddOrderedPagesToView(this.application, Menu, this.settings.pages, orderMenu);

					this.AddPagesToView(Menu, this.settings.pages);
				}
			}


		}


		return {
			ui: _ui,
			init: _init
		}
	}

}