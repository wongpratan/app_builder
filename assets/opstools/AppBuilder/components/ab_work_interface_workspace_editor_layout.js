export default class AB_Work_Interface_Workspace_Editor_Layout extends OP.Component {

	constructor(App) {
		super(App, 'ab_work_interface_workspace_editor_layout');
		var L = this.Label;

		var labels = {
			common: App.labels,
			component: {
				// formHeader: L('ab.application.form.header', "*Application Info"),
			}
		};


		// internal list of Webix IDs to reference our UI components.
		var ids = {

			editArea: this.unique('editArea')

		};


		// webix UI definition:
		this.ui = {
			// view:'template',
			view: 'layout',
			id: ids.editArea,
			rows: []
			// template:'[edit Area]'
		};

		var CurrentView = null;
		var CurrentViewMode = 1; // preview mode by default

		// setting up UI
		this.init = function () {
		};


		// internal business logic 
		var _logic = this.logic = {


			/**
             * @function show()
             *
             * Show this component.
             */
			show: function () {
				$$(ids.editArea).show();
			},


			/* 
			* @method viewLoad
			* A new View has been selected for editing, so update
			* our interface with the details for this View.
			* @param {ABView} view  current view instance.
			*/
			viewLoad: function (view) {

				CurrentView = view;

				// clear edit area
				$$(ids.editArea).getChildViews().forEach((childView) => {
					$$(ids.editArea).removeView(childView);
				});

				// load the component's editor in our editArea
				var editorComponent = view.editorComponent(App, CurrentViewMode);
				editorComponent.ui.id = ids.editArea;
				webix.ui(editorComponent.ui, $$(ids.editArea));
				// $$(ids.editArea).addView(editorComponent.ui);
				editorComponent.init();

			},


			/* 
			* @method viewModeChange
			*
			*
			*/
			viewModeChange: function(viewMode) {

				CurrentViewMode = viewMode;

			}

		};


		// Expose any globally accessible Actions:
		this.actions({
		});


		// Interface methods for parent component:
		this.show = _logic.show;
		this.viewLoad = _logic.viewLoad;
		this.viewModeChange = _logic.viewModeChange;

	}

}