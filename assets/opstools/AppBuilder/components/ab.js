/*
 * AB
 *
 * The base AppBuilder component.  It manages these components:
 *   - ab_choose :  choose an application to work with
 *   - ab_work   :  load an application into the work area
 *
 */

// import '../OP/OP'

const ABComponent = require("../classes/platform/ABComponent");
const AB_Choose = require("./ab_choose");
const AB_Work = require("./ab_work");
const AB_Admin = require("./ab_admin");

// // Import our Custom Components here:
// import ActiveList from '../webix_custom_components/activelist'
// import DateTimePicker from '../webix_custom_components/datetimepicker'
// import EditList from '../webix_custom_components/editlist'
// import EditTree from '../webix_custom_components/edittree'
// import EditUnitList from '../webix_custom_components/editunitlist'
// import FocusableTemplate from '../webix_custom_components/focusableTemplate'
// import SavableLayout from '../webix_custom_components/savablelayout'

require("../AppBuilder.css");

module.exports = class AB extends ABComponent {
   //('ab', function(App) {

   constructor(App) {
      super(App, "ab");

      App = this.App;
      var L = this.Label;

      // // setup the common labels for our AppBuilder Application.
      // App.labels = {
      // 	add: L('ab.common.add', "*Add"),
      // 	create:   L('ab.common.create', "*Create"),
      // 	"delete": L('ab.common.delete', "*Delete"),
      // 	edit: 	  L('ab.common.edit', "*Edit"),
      // 	"export": L('ab.common.export', "*Export"),
      // 	formName: L('ab.common.form.name', "*Name"),
      // 	"import": L('ab.common.import', "*Import"),
      // 	rename:   L('ab.common.rename', "*Rename"),
      // 	ok: 	  L('ab.common.ok', "*Ok"),

      // 	cancel:   L('ab.common.cancel', "*Cancel"),
      // 	save: 	  L('ab.common.save', "*Save"),

      // 	yes: 	  L('ab.common.yes', "*Yes"),
      // 	no: 	  L('ab.common.no', "*No"),

      // 	none: 	  L('ab.common.none', "*None"),

      // 	createErrorMessage:   L('ab.common.create.error', "*System could not create <b>{0}</b>."),
      // 	createSuccessMessage: L('ab.common.create.success', "*<b>{0}</b> is created."),

      // 	updateErrorMessage:  L('ab.common.update.error', "*System could not update <b>{0}</b>."),
      // 	updateSucessMessage: L('ab.common.update.success', "*<b>{0}</b> is updated."),

      // 	deleteErrorMessage:   L('ab.common.delete.error', "*System could not delete <b>{0}</b>."),
      // 	deleteSuccessMessage: L('ab.common.delete.success', "*<b>{0}</b> is deleted."),

      // 	renameErrorMessage: L('ab.common.rename.error', "*System could not rename <b>{0}</b>."),
      // 	renameSuccessMessage: L('ab.common.rename.success', "*<b>{0}</b> is renamed."),

      // 	// Data Field  common Property labels:
      // 	dataFieldHeaderLabel: L('ab.dataField.common.headerLabel', '*Section Title'),
      // 	dataFieldHeaderLabelPlaceholder: L('ab.dataField.common.headerLabelPlaceholder', '*Section Name'),

      // 	dataFieldLabel: L('ab.dataField.common.fieldLabel', '*Label'),
      // 	dataFieldLabelPlaceholder: L('ab.dataField.common.fieldLabelPlaceholder', '*Label'),

      // 	dataFieldColumnName: L('ab.dataField.common.columnName', '*Field Name'),
      // 	dataFieldColumnNamePlaceholder: L('ab.dataField.common.columnNamePlaceholder', '*Database field name'),

      // 	dataFieldShowIcon: L('ab.dataField.common.showIcon', '*show icon?'),

      // 	componentDropZone: L('ab.common.componentDropZone', '*add widgets here')
      // }

      // // make instances of our Custom Components:
      // new ActiveList(App, 'activelist');	// ->  App.custom.activelist  now exists
      // new DateTimePicker(App, 'datetimepicker'); // ->  App.custom.datetimepicker  now exists
      // new EditList(App, 'editlist');	// ->  App.custom.editlist  now exists
      // new EditTree(App, 'edittree');	// ->  App.custom.edittree  now exists
      // new EditUnitList(App, 'editunitlist');	// ->  App.custom.editunitlist  now exists
      // new FocusableTemplate(App, 'focusabletemplate');	// ->  App.custom.focusableTemplate  now exists
      // new SavableLayout(App, 'savablelayout');	// ->  App.custom.savablelayout  now exists

      var ids = {
         component: this.unique("root")
      };

      // Define the external components used in this Component:
      var AppChooser = new AB_Choose(App);
      var AppWorkspace = new AB_Work(App);
      var AppAdmin = new AB_Admin(App);

      // This component's UI definition:
      // Application multi-views
      this.ui = {
         id: ids.component,
         view: "multiview",
         borderless: true,
         animate: false,
         // height : 800,
         rows: [AppChooser.ui, AppWorkspace.ui, AppAdmin.ui]
      };

      this.init = () => {
         AppChooser.init();
         AppWorkspace.init();
         AppAdmin.init();

         // start off only showing the App Chooser:
         App.actions.transitionApplicationChooser();

         // perform an initial resize adjustment
         $$(ids.component).adjust();

         if (this.__areaShowEvent == null)
            this.__areaShowEvent = AD.comm.hub.subscribe(
               "opsportal.area.show",
               (message, data) => {
                  _logic.changeArea(data.area);
               }
            );

         // Check if this is active area
         _logic.changeArea();
      };

      var _logic = (this._logic = {
         changeArea: (areaKey) => {
            // Get current area key
            if (areaKey == null) {
               let currAreaElem = document.querySelector(
                  "#op-list-menu > .op-container.active"
               );
               if (!currAreaElem) return;

               areaKey = currAreaElem.getAttribute("area");
            }

            if (areaKey == "app-builder") {
               // It will load application data at first time here.
               AppChooser.show();
            }
         }
      });

      this.actions({});

      this._app = App; // for unit testing.
   }
};

//// REFACTORING TODOs:
// TODO: AppForm-> Permissions : refresh permission list, remove AppRole permission on Application.delete().
