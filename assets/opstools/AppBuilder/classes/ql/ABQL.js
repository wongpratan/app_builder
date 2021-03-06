/*
 * ABQL
 *
 * An ABQL defines a Query Language Operation. A QL Operation
 * is intended to be evaluated at run time and return a value that can be 
 * assigned to form value or an object.
 *
 *
 */




var ABQLDefaults = {
	key: 'qlbase'		// {string} unique key for this view
}



export default class ABQL {

	/**
	 * @param {obj} values  key=>value hash of ABView values
	 * @param {ABApplication} application the application object this view is under
	 * @param {ABView} parent the ABView this view is a child of. (can be null)
	 * @param {obj} defaultValues special sub class defined default values.
	 */
	constructor(values, application, parent, defaultValues) {

		super(values, application, parent, (defaultValues || ABQLDefaults));



		// 	{
		// 		id:'uuid',					// uuid value for this obj
		// 		key:'viewKey',				// unique key for this View Type
		// 		icon:'font',				// fa-[icon] reference for an icon for this View Type
		// 		label:'',					// pulled from translation

		//		position: {					// view state
		//			x: 0,					// X position in webix.dashboard
		//			y: 0,					// Y position in webix.dashboard
		//			dx: 1,					// the number of column span
		//			dy: 1					// the number of row span
		//		}

		//		settings: {					// unique settings for the type of field
		//		},

		// 		views:[],					// the child views contained by this view.

		//		translations:[]
		// 	}


	}


	static common() {
		return ABViewDefaults;
	}



	///
	/// Instance Methods
	///


	/// ABApplication data methods



	/**
	 * @method toObj()
	 *
	 * properly compile the current state of this ABView instance
	 * into the values needed for saving to the DB.
	 *
	 * @return {json}
	 */
	toObj() {

		OP.Multilingual.unTranslate(this, this, ['label']);

		var result = {

		}


		return result;

	}


	/**
	 * @method fromValues()
	 *
	 * initialze this object with the given set of values.
	 * @param {obj} values
	 */
	fromValues(values) {

		super.fromValues(values);

		this.key = values.key || this.viewKey();
		this.icon = values.icon || this.viewIcon();

		// label is a multilingual value:
		OP.Multilingual.translate(this, this, ['label']);


		// default value for our label
		if (this.label == '?label?') {
			if (this.parent) {
				this.label = this.parent.label + '.' + this.defaults.key;
			}
		}


		var views = [];
		(values.views || []).forEach((child) => {
			// views.push(ABViewManager.newView(child, this.application, this));
			views.push(this.application.viewNew(child, this.application, this));
		})
		this._views = views;


		// convert from "0" => 0
		this.position = values.position || {};

		if (this.position.x != null)
			this.position.x = parseInt(this.position.x);

		if (this.position.y != null)
			this.position.y = parseInt(this.position.y);

		this.position.dx = parseInt(this.position.dx || 1);
		this.position.dy = parseInt(this.position.dy || 1);

	}



	isRoot() {
		return this.parent == null;
	}


    /**
    * @method allParents()
    *
    * return an flatten array of all the ABViews parents
    *
    * @return {array}      array of ABViews
    */
	allParents() {
		var parents = [];
		var curView = this;

		// add current view to array
		parents.unshift(curView);

		while (!curView.isRoot() && curView.parent) {
			parents.unshift(curView.parent);

			curView = curView.parent;
		}

		return parents;
	}


	/**
	 * @method parentFormComponent
	 * return the closest form object this component is on.
	 */
	parentFormComponent() {
		var form = null;

		var curr = this;
		while (curr.key != 'form' && !curr.isRoot() && curr.parent) {
			curr = curr.parent;
		}

		if (curr.key == 'form') {
			form = curr;
		}

		return form;
	}


	/**
	 * @method parentFormUniqueID
	 * return a unique ID based upon the closest form object this component is on.
	 * @param {string} key  The basic id string we will try to make unique
	 * @return {string} 
	 */
	parentFormUniqueID( key ) {
		var form = this.parentFormComponent();	
		var uniqueInstanceID;
		if (form) {
			uniqueInstanceID = form.uniqueInstanceID;
		} else {
			uniqueInstanceID = webix.uid()
		}

		return key+uniqueInstanceID;
	}


	pageParent(filterFn) {

		if (filterFn == null) filterFn = () => true;

		var parentPage = this.parent;

		// if current page is the root page, then return itself.
		if (this.isRoot()) {
			return this;
		}

		while (parentPage && ((parentPage.key != 'page' && parentPage.key != 'reportPage') || !filterFn(parentPage))) {
			parentPage = parentPage.parent;
		}

		return parentPage;
	}


	pageRoot() {
		var rootPage = this.pageParent();

		while (!rootPage.isRoot()) {
			rootPage = rootPage.pageParent();
		}

		return rootPage;
	}


	///
	/// Views
	///


	/**
	 * @method views()
	 *
	 * return an array of all the ABViews children
	 *
	 * @param {fn} filter  	a filter fn to return a set of ABViews that this fn
	 *						returns true for.
	 * @return {array} 	array of ABViews
	 */
	views(filter) {

		filter = filter || function () { return true; };

		return this._views.filter(filter);

	}



	/**
	 * @method viewDestroy()
	 *
	 * remove the current ABView from our list of ._views.
	 *
	 * @param {ABView} view
	 * @return {Promise}
	 */
	viewDestroy(view) {

		var remainingViews = this.views(function (v) { return v.id != view.id; })
		this._views = remainingViews;

		return this.save();
	}



	/**
	 * @method viewSave()
	 *
	 * persist the current ABView in our list of ._views.
	 *
	 * @param {ABView} object
	 * @return {Promise}
	 */
	viewSave(view) {
		var isIncluded = (this.views(function (v) { return v.id == view.id }).length > 0);
		if (!isIncluded) {
			this._views.push(view);
		}

		return this.save();
	}



	/**
	 * @method viewReorder()
	 *
	 * reorder the current ABView in our list of ._views.
	 *
	 * @param {string} viewId - id of the active view
	 * @param {string} toPosition - 'to' postion
	 * @return {Promise}
	 */
	viewReorder(viewId, toPosition) {

		var from = this._views.findIndex((v) => v.id == viewId);
		if (from < 0) return;

		// move drag item to 'to' position
		this._views.splice(toPosition, 0, this._views.splice(from, 1)[0]);

		// save to database
		this.save();

	}



	/**
	 * @method eventAdd()
	 *
	 * 
	 *
	 * @param {object} evt - {
	 * 							emitter: object,
	 * 							eventName: string,
	 * 							listener: function
	 * 						}
	 */
	eventAdd(evt) {

		var exists = this.__events.find(e => {
			return e.emitter == evt.emitter &&
					e.eventName == evt.eventName;
					// && e.listener == evt.listener;
		});

		if (!exists || exists.length < 1) {

			// add to array
			this.__events.push({
				emitter: evt.emitter,
				eventName: evt.eventName,
				listener: evt.listener
			});

			// listening this event
			evt.emitter.on(evt.eventName, evt.listener);
		}

	}


	/**
	 * @method eventClear()
	 * unsubscribe all events.
	 * should do it before destroy a component
	 *
	 * @param {bool} deep - id of the active view
	 */
	eventClear(deep) {

		if (deep) {
			this.views().forEach(v => {
				v.eventClear(deep);
			});
		}

		if (this.__events && this.__events.length > 0) {
			this.__events.forEach(e => {
				e.emitter.removeListener(e.eventName, e.listener);
			});
		}

	}







	//
	//	Editor Related
	//

	mapLabel() {

		var label = '';
		if (!this.isRoot()) {
			if (this.parent) {
				label = this.parent.mapLabel();
				label += ' > ';
			}
		}

		label += this.label;

		return label;
	}


	/** 
	 * @method editorComponent
	 * return the Editor for this UI component.
	 * the editor should display either a "block" view or "preview" of 
	 * the current layout of the view.
	 * @param {string} mode what mode are we in ['block', 'preview']
	 * @return {Component} 
	 */
	editorComponent(App, mode) {

		var L = App.Label;

		var idBase = 'ABViewEditorComponent';
		var ids = {
			component: App.unique(idBase + '_component'),
			view: App.unique(idBase + '_view')
		}

		var _ui = {
			rows: [
				{
					id: ids.component,
					view: App.custom.savablelayout.view,
					type: 'space',
					rows: []
				}
			]
		};


		var _init = (options) => {

			var Layout = $$(ids.component);

			var allComponents = [];


			App.eventIds = App.eventIds || {};

			// prevent .attachEvent multiple times
			if (App.eventIds['onAfterPortletMove']) webix.detachEvent("onAfterPortletMove");

			// listen a event of the porlet when layout is changed
			App.eventIds['onAfterPortletMove'] = webix.attachEvent("onAfterPortletMove", (source, parent, active, target, mode) => {

				_logic.onAfterPortletMove();

			});


			// attach all the .UI views:
			this.views().forEach((child) => {

				var component = child.component(App);

				var porletUI = {
					viewId: child.id, // set id to .viewId, the layout template
					view: "portlet",
					css: "ab-interface-component",
					// borderless: true,
					layoutType: "head", // Drag on icon
					body: {
						rows: [
							{
								view: 'template',
								height: 30,
								css: "ab-porlet-header",
								template: _logic.template(child),
								onClick: {
									"ab-component-edit": (e, id, trg) => {
										_logic.viewEdit(e, child.id, trg);
									},
									"ab-component-remove": (e, id, trg) => {
										_logic.viewDelete(e, child.id, trg);
									}
								}
							},
							(mode == 'preview' ? component.ui : {
								// empty element
								view: 'spacer',
								hidden: true,
							})
						]
					}
				};


				// get element in template
				var elem = Layout.queryView({ viewId: child.id });


				// If webix element is not exists in html, then destroy it.
				// NOTE : webix does not know html is missing when we redraw layout at .setState
				if (elem && !document.body.contains(elem.$view))
					elem.destructor();


				if (elem) {
					// replace component to layout
					webix.ui(porletUI, elem);
				}
				// add component to rows
				else {
					Layout.addView(porletUI);
				}

				allComponents.push(component);
			});

			// in preview mode, have each child render a preview 
			// of their content:
			if (mode == 'preview') {

				// perform any init setups for the content:
				allComponents.forEach((component) => {
					component.init();
				});

			}

		}


		var _logic = {


			/**
			 * @method template()
			 * render the list template for the View
			 * @param {obj} obj the current View instance
			 * @param {obj} common  Webix provided object with common UI tools
			 */
			template: function (child) {

				return ('<div>' +
					'<i class="fa fa-#icon# webix_icon_btn"></i> ' +
					' #label#' +
					'<div class="ab-component-tools">' +
					'<i class="fa fa-trash ab-component-remove"></i>' +
					'<i class="fa fa-edit ab-component-edit"></i>' +
					'</div>' +
					'</div>')
					.replace('#icon#', child.icon)
					.replace('#label#', child.label);

			},


			/**
			 * @method viewDelete()
			 * Called when the [delete] icon for a child View is clicked.
			 * @param {obj} e the onClick event object
			 * @param {integer} id the id of the element to delete
			 * @param {obj} trg  Webix provided object 
			 */
			viewDelete: (e, id, trg) => {
				var deletedView = this.views(v => v.id == id)[0];

				if (!deletedView) return false;

				OP.Dialog.Confirm({
					title: L('ab.interface.component.confirmDeleteTitle', '*Delete component'),
					text: L('ab.interface.component.confirmDeleteMessage', 'Do you want to delete <b>{0}</b>?').replace('{0}', deletedView.label),
					callback: function (result) {
						if (result) {

							var Layout = $$(ids.component);

							// remove UI of this component in template
							var deletedElem = Layout.queryView({ viewId: id });
							if (deletedElem)
								$$(ids.component).destroyView(deletedElem);

							// update/refresh template to ABView
							_logic.refreshTemplate();

							deletedView.destroy()
								.then(() => {

									// signal the current view has been deleted.
									deletedView.emit('destroyed', deletedView);


									// if we don't have any views, then place a "drop here" placeholder
									if ($$(ids.component).getChildViews().length == 0) {
										webix.extend($$(ids.component), webix.OverlayBox);
										$$(ids.component).showOverlay("<div class='drop-zone'><div>" + App.labels.componentDropZone + "</div></div>");
									}
								})
								.catch((err) => {
									OP.Error.log('Error trying to delete selected View:', { error: err, view: deletedView })
								})
						}
					}
				});
				e.preventDefault();
			},


			/**
			 * @method viewEdit()
			 * Called when the [edit] icon for a child View is clicked.
			 * @param {obj} e the onClick event object
			 * @param {integer} id the id of the element to edit
			 * @param {obj} trg  Webix provided object 
			 */
			viewEdit: (e, id, trg) => {
				var view = this.views(v => v.id == id)[0];

				if (!view) return false;

				// yeah, if the empty placeholder fires an [edit] event,
				// then ignore it.
				if (view.id == 'del_me') return false;

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

			onAfterPortletMove: () => {

				_logic.refreshTemplate();

				// save template layout to ABPageView
				this.save();

				// // Reorder
				// var viewId = active.config.id;
				// var targetId = target.config.id;

				// var toPosition = this._views.findIndex((v) => v.id == targetId);

				// this.viewReorder(viewId, toPosition);

			},

			refreshTemplate: () => {

				// get portlet template UI to ABView
				this.template = $$(ids.component).getState();

			}

		}


		return {
			ui: _ui,
			init: _init
		}
	}


	static propertyEditorComponent(App) {

		var ABViewPropertyComponent = new ABPropertyComponent({

			editObject: this,	// ABView

			fieldDefaults: this.common(), // ABViewDefaults,

			elements: (App, field) => {

				var ids = {
					imageWidth: '',
					imageHeight: ''
				}
				ids = field.idsUnique(ids, App);

				return []
			},

			// defaultValues: the keys must match a .name of your elements to set it's default value.
			defaultValues: ABViewPropertyComponentDefaults,

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
			// 		.populate(ids, ABField) : populate the form with your current settings
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

		return ABViewPropertyComponent.component(App);
	}


	static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {

		return [

			// Component Label 
			{
				view: "text",
				// id: ids.label,
				name: 'label',
				label: App.labels.dataFieldHeaderLabel,
				placeholder: App.labels.dataFieldHeaderLabelPlaceholder,
				labelWidth: App.config.labelWidthLarge,
				css: 'ab-new-label-name',
				// 				on: {
				// 					onChange: function (newVal, oldVal) {
				// console.warn('ABView.onChange()!!!');
				// 					}
				// 				}
			}
		];

	}


	static propertyEditorPopulate(App, ids, view) {

		$$(ids.label).setValue(view.label);

	}


	static propertyEditorValues(ids, view) {

		view.label = $$(ids.label).getValue();

	}


	static propertyEditorSave(ids, view) {

		this.propertyEditorValues(ids, view);

		return view.save()
			.then(function () {
				// signal the current view has been updated.
				view.emit('properties.updated', view);
			})
			.catch(function (err) {
				OP.Error.log('unable to save view:', { error: err, view: view });
			});
	}



	/*
	 * @component()
	 * return a UI component based upon this view.
	 * @param {obj} App 
	 * @return {obj} UI component
	 */
	component(App) {

		var idBase = 'ABView_' + this.id;
		var ids = {
			component: App.unique(idBase + '_component'),
		}


		// an ABView is a collection of rows:
		var _ui = {
			id: ids.component,
			view: 'layout',
			type: 'space',
			rows: []
		};


		// if this form is empty, then force a minimal row height
		// so the component isn't completely hidden on the screen.
		// (important in the editor so we don't loose the ability to edit the 
		// component)
		if (_ui.rows.length == 0) {
			_ui.height = 30;
		}


		// make sure each of our child views get .init() called
		var _init = (options) => {
		};

		return {
			ui: _ui,
			init: _init
		}
	}



	/*
	 * @method componentList
	 * return the list of components available on this view to display in the editor.
	 * @param {bool} isEdited  is this component currently in the Interface Editor
	 * @return {array} of ABView objects.
	 */
	componentList(isEdited) {

		// if (this.parent) {
		// 	return this.parent.componentList(false);
		// } else {

		// views not allowed to drop onto this View:
		var viewsToIgnore = ['view', 'page', 'formpanel', 'datacollection', 'viewcontainer',
			// not allowed Detail's widgets
			'detailcheckbox', 'detailcustom', 'detailimage', 'detailselectivity', 'detailtext', 'detailtree', 
			// not allowed Form's widgets
			'button', 'checkbox', 'datepicker', 'fieldcustom', 'textbox', 'numberbox', 'selectsingle', 'tree',
			// not allowed Chart's Widgets
			'pie', 'bar', 'line', 'area',
			// not allowed Report page
			'report', 'reportPage'
		];

		var allComponents = this.application.viewAll();  // ABViewManager.allViews();
		var allowedComponents = allComponents.filter((c) => {
			return (viewsToIgnore.indexOf(c.common().key) == -1)
		});

		return allowedComponents;

		// }

	}


	changePage(pageId) {
		this.emit('changePage', pageId);
	}
	
	
	removeField(field, cb) {
		
		// if this view has matching field then destroy()
		if ( this.settings.fieldId == field.id ) {

	        this.destroy()
	            .then(() => {

	                // signal the current view has been deleted.
	                this.emit('destroyed', this);
					cb(null, true);

	            })
	            .catch((err) => {
	                OP.Error.log('Error trying to delete selected View:', { error: err, view: this })
	                cb(err);
	            });
				
	    } else { // if not check for subViews then call removeField on them
			
			var shouldSave = false;

			var finish = () => {
				if (shouldSave) {
					this.save()
					.then(()=>{
						cb();
					})
					.catch(cb);
				} else {
					cb();
				}
			}
			
			// for each sub view, view.removeField(field);
			var listViews = this.views();
			var done = 0;
			listViews.forEach((v)=>{
				v.removeField(field, (err, updateMade)=>{
					if (err) {
						cb(err);
					} else {
						
						if(updateMade) {
							shouldSave = true;
						}
						
						done++;
						if (done >= listViews.length){
							finish();
							
						}
					}
				})
			});
			
			if (listViews.length == 0) {
				finish();
			}
			
		}

	}

}




/*
var ABViewPropertyComponent = new ABPropertyComponent({

	editObject: ABView,
	
	fieldDefaults: ABViewDefaults,

	elements:(App, field) => {

		var ids = {
			imageWidth: '',
			imageHeight: ''
		}
		ids = field.idsUnique(ids, App);

		return []
	},

	// defaultValues: the keys must match a .name of your elements to set it's default value.
	defaultValues: ABViewPropertyComponentDefaults,

	// rules: basic form validation rules for webix form entry.
	// the keys must match a .name of your .elements for it to apply
	rules:{
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
	// 		.populate(ids, ABField) : populate the form with your current settings
	// 		.show(ids)   : display the form in the editor
	// 		.values(ids, values) : return the current values from the form
	logic:{

	},

	// perform any additional setup actions here.
	// @param {obj} ids  the hash of id values for all the current form elements.
	//					 it should have your elements + the default Header elements:
	//						.label, .columnName, .fieldDescription, .showIcon
	init:function(ids) {
		// want to hide the description? :
		// $$(ids.fieldDescription).hide();
	}

})
*/

