/*
 * ab_work_query_workspace_design
 *
 * Manage the Query Workspace area.
 *
 */

import RowFilter from "../classes/RowFilter"


export default class ABWorkQueryWorkspaceDesign extends OP.Component {

	/**
	 * @param {object} ??
	 */
	constructor(App) {
		super(App, 'ab_work_query_workspace_design');
		var L = this.Label;

		var idBase = "AB_Query_Workspace_Design";

		var labels = {
			common: App.labels,
			component: {
				selectQuery: L('ab.query.selectQuery', "*Select an query to work with."),


				// formHeader: L('ab.application.form.header', "*Application Info"),
				deleteSelected: L('ab.object.toolbar.deleteRecords', "*Delete records"),
				hideFields: L('ab.object.toolbar.hideFields', "*Hide fields"),
				massUpdate: L('ab.object.toolbar.massUpdate', "*Edit records"),
				filterFields: L('ab.object.toolbar.filterFields', "*Add filters"),
				sortFields: L('ab.object.toolbar.sortFields', "*Apply sort"),
				frozenColumns: L('ab.object.toolbar.frozenColumns', "*Frozen fields"),
				defineLabel: L('ab.object.toolbar.defineLabel', "*Define label"),
				permission: L('ab.object.toolbar.permission', "*Permission"),
				addFields: L('ab.object.toolbar.addFields', "*Add field"),
				"export": L('ab.object.toolbar.export', "*Export"),
				confirmDeleteTitle: L('ab.object.delete.title', "*Delete data field"),
				confirmDeleteMessage: L('ab.object.delete.message', "*Do you want to delete <b>{0}</b>?")
			}
		};



		// internal list of Webix IDs to reference our UI components.
		var ids = {
			component: this.unique('component'),
			tree: this.unique('tree'),
			tabObjects: this.unique('tabObjects'),
			depth: this.unique('depth'),

			// buttonAddField: this.unique('buttonAddField'),
			// buttonDeleteSelected: this.unique('deleteSelected'),
			// buttonExport: this.unique('buttonExport'),
			// buttonFieldsVisible: this.unique('buttonFieldsVisible'),
			// buttonFilter: this.unique('buttonFilter'),
			// buttonFrozen: this.unique('buttonFrozen'),
			// buttonLabel: this.unique('buttonLabel'),
			// buttonMassUpdate: this.unique('buttonMassUpdate'),
			// buttonRowNew: this.unique('buttonRowNew'),
			// buttonSort: this.unique('buttonSort'),

			datatable: this.unique('datatable'),

			// // Toolbar:
			// toolbar: this.unique('toolbar'),

			noSelection: this.unique('noSelection'),
			selectedObject: this.unique('selectedObject'),

		}


		// The DataTable that displays our object:
		// var DataTable = new ABWorkspaceDatatable(App);


		// Our init() function for setting up our UI
		this.init = function () {
			// webix.extend($$(ids.form), webix.ProgressBar);
			webix.extend($$(ids.tree), webix.ProgressBar);
			webix.extend($$(ids.tabObjects), webix.ProgressBar);

			$$(ids.noSelection).show();

			DataFilter.init({
				onChange: _logic.save,
				showObjectName: true
			});

		}



		var CurrentApplication = null;
		var CurrentQuery = null;

		var DataFilter = new RowFilter(App, idBase + "_filter");


		// our internal business logic
		var _logic = {


			/**
			 * @function applicationLoad
			 *
			 * Initialize the Object Workspace with the given ABApplication.
			 *
			 * @param {ABApplication} application
			 */
			applicationLoad: (application) => {
				CurrentApplication = application;

			},


			/**
			 * @function clearWorkspace()
			 *
			 * Clear the query workspace.
			 */
			clearWorkspace: function () {

				// NOTE: to clear a visual glitch when multiple views are updating
				// at one time ... stop the animation on this one:
				$$(ids.noSelection).show(false, false);
			},


			/**
			 * @function populateQueryWorkspace()
			 *
			 * Initialize the Object Workspace with the provided ABObject.
			 *
			 * @param {ABObject} object     current ABObject instance we are working with.
			 */
			populateQueryWorkspace: function (query) {

				CurrentQuery = query;

				if (CurrentQuery == null) {
					_logic.clearWorkspace();
					return;
				}

				var objBase = CurrentQuery.objectBase();

				$$(ids.selectedObject).show();


				$$(ids.depth).blockEvent(); // prevents endless loop

				if (CurrentQuery.objectWorkspace.depth) {
					$$(ids.depth).setValue(CurrentQuery.objectWorkspace.depth);
				} else {
					$$(ids.depth).setValue(5);
				}

				$$(ids.depth).unblockEvent();


				// *** List ***

				var fnGetParentObjIds = (store, itemId) => {

					var objectIds = [objBase.id];

					// not exists
					if (!store.exists(itemId))
						return objectIds;

					while (itemId) {

						// store object id
						var item = store.getItem(itemId);
						objectIds.push(item.objectId);

						// get next parent
						itemId = store.getParentId(itemId);
					}

					return objectIds;

				};

				var fnAddTreeItem = (store, currObj, parentItemId) => {

					if (parentItemId) {
						var item = store.getItem(parentItemId);
						if (item.$level > $$(ids.depth).getValue())
							return;
					}

					currObj.connectFields().forEach(f => {

						let fieldUrl = f.urlPointer(),
							existsObjIds = fnGetParentObjIds(store, parentItemId),
							$parentItem = store.getItem(parentItemId);

						// prevent looping
						if (f.datasourceLink == null ||
							// - check duplicate include object in branch
							existsObjIds.indexOf(f.datasourceLink.id) > -1)
							return;

						// set check flag of tree item
						var isCheck = CurrentQuery.joins(join => {

							return join.fieldID == f.id &&
								(join.objectURL == objBase.urlPointer() || // parent is base object
									($parentItem && $parentItem.checked)); // if parent is checked

						}).length > 0;

						// set disable
						var disabled = !isCheck && CurrentQuery.canFilterObject(f.datasourceLink); // disable its duplicate

						// set disable
						// var disabled = ($parentItem ? $parentItem.disabled : false) || // disable same its parent
						// 	(!isCheck && CurrentQuery.canFilterObject(f.datasourceLink)) // disable its duplicate

						// add items to tree
						var label = "#object# (#field#)"
							.replace("#object#", f.datasourceLink.label)
							.replace("#field#", f.label);

						var itemId = store.add(
							{
								value: label, // a label of link object
								fieldUrl: fieldUrl,
								objectId: f.datasourceLink.id,
								checked: isCheck,
								disabled: disabled,
								open: !disabled

							},

							// order index
							null,

							// parent item's id
							parentItemId
						);

						// add child items to tree
						fnAddTreeItem(store, f.datasourceLink, itemId);

					});

				};

				// NOTE: render the tree component in Promise to prevent freeze UI.
				new Promise((next, err) => {

					// set connected objects:
					$$(ids.tree).clearAll();

					// show loading cursor
					$$(ids.tree).showProgress({ type: "icon" });

					let treeStore = new webix.TreeCollection();
					if (objBase)
						fnAddTreeItem(treeStore, objBase);

					// refresh UI
					// $$(ids.tree).refresh();

					// populate tree store
					$$(ids.tree).parse(treeStore.serialize());

					// show loading cursor
					$$(ids.tree).hideProgress({ type: "icon" });

					next();

				});

				// *** Tabs ***

				$$(ids.tabObjects).showProgress({ type: "icon" });

				// NOTE : Tabview have to contain at least one cell
				$$(ids.tabObjects).addView({
					body: {
						id: 'temp'
					}
				});

				// clear object tabs
				var tabbar = $$(ids.tabObjects).getTabbar();
				var optionIds = tabbar.config.options.map(opt => opt.id);
				optionIds.forEach(optId => {

					if (optId != 'temp') { // Don't remove a temporary tab (remove later)
						$$(ids.tabObjects).removeView(optId);
					}
				});
				var $viewMultiview = $$(ids.tabObjects).getMultiview();
				$viewMultiview.getChildViews().map($view => $view).forEach($view => {
					if ($view && $view.config.id != 'temp')
						$viewMultiview.removeView($view);
				});

				if (!objBase) return;

				// add the main object tab
				let tabUI = _logic.templateField({
					object: objBase,
					isTypeHidden: true
				});
				$$(ids.tabObjects).addView(tabUI);

				// select default tab to the main object
				$$(ids.tabObjects).setValue(objBase.id);

				// Other object tabs will be added in a check tree item event
				CurrentQuery.joins().forEach(join => {

					if (!join.fieldID) return;

					var objFrom = CurrentApplication.urlResolve(join.objectURL);
					if (!objFrom) return;

					var fieldLink = objFrom.fields(f => f.id == join.fieldID)[0];
					if (!fieldLink) return;

					var objLink = fieldLink.datasourceLink;
					if (!objLink ||
						objLink.id == objBase.id) return;

					// add tab
					let tabUI = _logic.templateField({
						field: fieldLink,
						joinType: join.type
					});
					$$(ids.tabObjects).addView(tabUI);

					// populate selected fields
					_logic.setSelectedFields(join.fieldID);

				});

				// remove a temporary tab
				$$(ids.tabObjects).removeView('temp');
				$$(ids.tabObjects).adjust();

				$$(ids.tabObjects).hideProgress({ type: "icon" });


				/** Filter **/
				_logic.refreshFilter();


				/** DataTable **/
				_logic.refreshDataTable();
			},


			/**
			 * @method save
			 * update settings of the current query and save to database
			 * 
			 * @return {Promise}
			 */
			save: () => {

				return new Promise((resolve, reject) => {

					var tree = $$(ids.tree);

					var objectBase = CurrentQuery.objectBase();

					/** joins **/
					var joins = [],
						checkItemIds = tree.getChecked();

					checkItemIds.forEach(itemId => {

						var $treeItem = tree.getItem(itemId);
						var field = CurrentQuery.application.urlResolve($treeItem.fieldUrl);
						if (!field) return;

						// pull the join type of UI
						var joinType;
						var $tabObject = $$(ids.tabObjects).getMultiview().getChildViews().filter(v => v.config.id == field.datasourceLink.id)[0];
						if ($tabObject) {
							var $joinType = $tabObject.queryView({ name: "joinType" });

							joinType = $joinType.getValue() || 'innerjoin';
						}
						else {
							joinType = 'innerjoin';
						}

						// add new join into query
						joins.push({
							objectURL: field.object.urlPointer(),
							fieldID: field.id,
							type: joinType
						});

					});

					// if no join, then should add the default
					if (joins.length == 0) {
						var objectBase = CurrentQuery.objectBase();
						if (objectBase) {
							joins.push({
								objectURL: objectBase.urlPointer()
							});
						}
					}

					CurrentQuery.importJoins(joins);


					/** fields **/
					var fields = $$(ids.datatable).config.columns.map(col => { // an array of field's url

						return {
							fieldURL: col.fieldURL
						};
					});
					CurrentQuery.importFields(fields);


					/** where **/
					CurrentQuery.workspaceFilterConditions = DataFilter.getValue();

					/** depth **/
					CurrentQuery.objectWorkspace.depth = $$(ids.depth).getValue();

					// Save to db
					CurrentQuery.save()
						.catch(reject)
						.then(() => {

							// refresh data
							_logic.refreshDataTable();

							resolve();
						});

				});

			},


			checkObjectLink: (objId, isChecked) => {

				var tree = $$(ids.tree);
				tree.blockEvent(); // prevents endless loop

				var rootid = objId;
				if (isChecked) {
					// If check we want to check all of the parents as well
					while (tree.getParentId(rootid)) {
						rootid = tree.getParentId(rootid);
						if (rootid != objId)
							tree.checkItem(rootid);
					}
				}
				else {
					// If uncheck we want to uncheck all of the child items as well.
					tree.data.eachSubItem(rootid, function (item) {
						if (item.id != objId)
							tree.uncheckItem(item.id);
					});

				}

				// call save to db
				_logic.save()
					.then(() => {

						// update UI -- add new tab
						this.populateQueryWorkspace(CurrentQuery);

						// // select tab
						// var tabbar = $$(ids.tabObjects).getTabbar();
						// tabbar.setValue(objectLink.id);

					});



				tree.unblockEvent();

			},

			depthChange: function (newv, oldv) {

				// call save to db
				_logic.save()
					.then(() => {

						this.populateQueryWorkspace(CurrentQuery);

					});
			},


			setSelectedFields: function (fieldId) {

				// *** Field double list ***
				let fieldURLs = CurrentQuery.fields(f => f.id == fieldId).map(f => f.urlPointer()),
					$viewDbl = $$(fieldId).queryView({ name: 'fields' });
				if ($viewDbl)
					$viewDbl.setValue(fieldURLs);

			},


			checkFields: function () {

				// pull check fields
				var fields = [];
				var $viewMultiview = $$(ids.tabObjects).getMultiview();
				$viewMultiview.getChildViews().forEach($viewTab => {

					let $viewDbl = $viewTab.queryView({ name: 'fields' });
					if ($viewDbl && $viewDbl.getValue()) {

						// pull an array of field's url
						let selectedFields = $viewDbl.getValue().split(',').map(fUrl => {
							return {
								fieldURL: fUrl
							};
						});
						fields = fields.concat(selectedFields);

					}

				});

				// keep same order of fields
				var orderFieldUrls = $$(ids.datatable).config.columns.map(col => col.fieldURL);
				fields.sort((a, b) => {

					var indexA = orderFieldUrls.indexOf(a.fieldURL),
						indexB = orderFieldUrls.indexOf(b.fieldURL);

					if (indexA < 0) indexA = 999;
					if (indexB < 0) indexB = 999;

					return indexA - indexB;
				});

				CurrentQuery.importFields(fields);

				// refresh columns of data table
				_logic.refreshDataTable();


				// call save to db
				_logic.save()
					.then(() => {

						// refresh filter
						_logic.refreshFilter();

					});

			},


			/**
			 * @function templateField()
			 *	return UI of the object tab
			 *
			 * @param {JSON} option - {
			 * 							object: ABObject [option],
			 * 							field:  ABField [option],
			 * 							joinType: 'string',
			 * 							isTypeHidden: boolean
			 * 						}
			 *
			 * @return {JSON}
			 */
			templateField: function (option) {

				if (option.object == null && option.field == null)
					throw new Error("Invalid params");

				var tabId = (option.field ? option.field.id : option.object.id);

				var object = (option.field ? option.field.datasourceLink : option.object);

				var fields = object.fields().map(f => {
					return {
						id: f.urlPointer(),
						value: f.label
					};
				});

				var label = "#object#".replace('#object#', object.label);
				if (option.field) {
					label += ' (#field#)'.replace('#field#', option.field.label);
				}

				return {
					header: label,
					body: {
						id: tabId,
						type: "space",
						css: "bg-white",
						rows: [
							{
								view: "select",
								name: "joinType",
								label: L('ab.object.querybuilder.joinRecordsBy', "*Join records by"),
								labelWidth: 200,
								placeholder: "Choose a type of table join",
								hidden: option.isTypeHidden == true,
								value: option.joinType || 'innerjoin',
								options: [
									{ id: 'innerjoin', value: 'Returns records that have matching values in both tables (INNER JOIN).' },
									{ id: 'left', value: 'Return all records from the left table, and the matched records from the right table (LEFT JOIN).' },
									{ id: 'right', value: 'Return all records from the right table, and the matched records from the left table (RIGHT JOIN).' },
									{ id: 'fullouterjoin', value: 'Return all records when there is a match in either left or right table (FULL JOIN)' }
								],
								on: {
									onChange: function () {
										_logic.save();
									}
								}
							},
							{
								view: "dbllist",
								name: 'fields',
								list: {
									height: 300
								},
								labelLeft: "Available Fields",
								labelRight: "Included Fields",
								labelBottomLeft: "Move these fields to the right to include in data set.",
								labelBottomRight: "These fields will display in your final data set.",
								data: fields,
								on: {
									onChange: function () {
										_logic.checkFields();
									}
								}
							},
							{ fillspace: true }
						]
					}
				};
			},



			refreshFilter: function () {

				DataFilter.objectLoad(CurrentQuery);
				DataFilter.setValue(CurrentQuery.workspaceFilterConditions);
			},


			refreshDataTable: function () {

				var DataTable = $$(ids.datatable);


				// set columns:
				var columns = CurrentQuery.columnHeaders(false, false);
				DataTable.refreshColumns(columns);


				// set data:
				CurrentQuery.model().findAll({ limit: 20 })
					.then((response) => {

						DataTable.clearAll();

						response.data.forEach((d) => {
							DataTable.add(d);
						})
					})
					.catch((err) => {
						OP.Error.log('Error running Query:', { error: err, query: CurrentQuery });
					});

			},


			/**
			 * @function show()
			 *
			 * Show this component.
			 */
			show: function () {

				$$(ids.component).show();
			},

		}
		this._logic = _logic;


		// Our webix UI definition:
		this.ui = {
			view: 'multiview',
			id: ids.component,
			rows: [
				{
					id: ids.noSelection,
					rows: [
						{
							maxHeight: App.config.xxxLargeSpacer,
							hidden: App.config.hideMobile
						},
						{
							view: 'label',
							align: "center",
							label: labels.component.selectQuery
						},
						{
							maxHeight: App.config.xxxLargeSpacer,
							hidden: App.config.hideMobile
						}
					]
				},
				{
					id: ids.selectedObject,
					type: "space",
					rows: [
						{
							cols: [
								{
									rows: [
										{
											view: "label",
											label: L('ab.object.querybuilder.manageObjects', "*Manage Objects"),
											css: "ab-query-label",
											height: 50
										},
										{
											autowidth: true,
											css: "bg-gray",
											cols: [
												{},
												{
													id: ids.depth,
													view: "counter",
													label: L('ab.object.querybuilder.relationshipDepth', "*Relationship Depth"),
													width: 270,
													labelWidth: 165,
													step: 1,
													value: 5,
													min: 1,
													max: 10,
													on: {
														onChange: function (newv, oldv) {
															_logic.depthChange(newv, oldv);
														}
													}
												},
												{}
											]
										},
										{
											view: "tree",
											id: ids.tree,
											css: "ab-tree",
											template: "{common.icon()} {common.checkbox()} #value#",
											data: [],
											on: {
												onItemClick: function (id, event, item) {
													if (this.getItem(id).disabled)
														return;

													if (this.isChecked(id)) {
														this.uncheckItem(id);
													}
													else {
														this.checkItem(id);
													}
												},
												onItemCheck: function (id, isChecked, event) {

													_logic.checkObjectLink(id, isChecked);
												}
											}
										}
									]
								},
								{
									width: 10
								},
								{
									gravity: 2,
									rows: [
										{
											view: "label",
											label: L('ab.object.querybuilder.manageFields', "*Manage Fields"),
											css: "ab-query-label",
											height: 50
										},
										{
											view: "tabview",
											id: ids.tabObjects,
											tabMinWidth: 200,
											cells: [
												{} // require
											],
											multiview: {
												on: {
													onViewChange: function (prevId, nextId) {

														let fieldId = nextId; // tab id

														_logic.setSelectedFields(fieldId);
													}
												}
											}
										}
									]
								}
							]
						},
						// filter
						{
							view: "label",
							label: L('ab.object.querybuilder.manageFilters', "*Manage Filters"),
							css: "ab-query-label",
							height: 50
						},
						DataFilter.ui,
						{
							id: ids.datatable,
							view: 'datatable',
							minHeight: 200,
							dragColumn: true,
							columns: [],
							data: [],
							on: {
								onAfterColumnDrop: _logic.save
							}
						}
					]

				}
			]
		};



		// 
		// Define our external interface methods:
		// 
		this.applicationLoad = this._logic.applicationLoad;
		this.clearWorkspace = this._logic.clearWorkspace;
		this.populateQueryWorkspace = this._logic.populateQueryWorkspace;

	}

}