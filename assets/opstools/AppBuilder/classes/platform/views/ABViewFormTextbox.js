const ABViewFormTextboxCore = require("../../core/views/ABViewFormTextboxCore");

const ABViewFormTextboxPropertyComponentDefaults = ABViewFormTextboxCore.defaultValues();

function L(key, altText) {
   return AD.lang.label.getLabel(key) || altText;
}

module.exports = class ABViewFormTextbox extends ABViewFormTextboxCore {
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
      var idBase = "ABViewFormTextboxEditorComponent";
      var ids = {
         component: App.unique(idBase + "_component")
      };
      var textView = this.component(App);

      var textUi = textView.ui;
      textUi.id = ids.component;

      var _ui = {
         rows: [textUi, {}]
      };

      var _init = (options) => {
         textView.init(options);
      };

      var _logic = {};

      return {
         ui: _ui,
         init: _init,
         logic: _logic
      };
   }

   //
   // Property Editor
   //

   static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {
      var commonUI = super.propertyEditorDefaultElements(
         App,
         ids,
         _logic,
         ObjectDefaults
      );

      // in addition to the common .label  values, we
      // ask for:
      return commonUI.concat([
         {
            name: "type",
            view: "radio",
            label: L("ab.component.textbox.type", "*Type"),
            vertical: true,
            options: [
               {
                  id: "single",
                  value: L("ab.component.textbox.single", "*Single line")
               },
               {
                  id: "multiple",
                  value: L("ab.component.textbox.multiple", "*Multiple lines")
               },
               {
                  id: "rich",
                  value: L("ab.component.textbox.rich", "*Rich editor")
               }
            ]
         }
      ]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);

      $$(ids.type).setValue(
         view.settings.type || ABViewFormTextboxPropertyComponentDefaults.type
      );
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      view.settings.type = $$(ids.type).getValue();
   }

   /*
    * @component()
    * return a UI component based upon this view.
    * @param {obj} App
    * @return {obj} UI component
    */
   component(App) {
      var component = super.component(App);

      var idBase = this.parentFormUniqueID(
         "ABViewFormTextbox_" + this.id + "_f_"
      );
      var ids = {
         component: App.unique(idBase + "_component")
      };

      component.ui.id = ids.component;

      switch (
         this.settings.type ||
         ABViewFormTextboxPropertyComponentDefaults.type
      ) {
         case "single":
            component.ui.view = "text";
            break;
         case "multiple":
            component.ui.view = "textarea";
            component.ui.height = 200;
            break;
         case "rich":
            component.ui.view = "forminput";
            component.ui.height = 200;
            component.ui.css = "ab-rich-text";
            component.ui.body = {
               view: "tinymce-editor",
               value: "",
               cdn: "/js/webix/extras/tinymce",
               config: {
                  plugins: "link",
                  menubar: "format edit",
                  toolbar:
                     "undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | fontsizeselect | link"
               }
            };
            break;
      }

      component.onShow = () => {
         // WORKAROUND : to fix breaks TinyMCE when switch pages/tabs
         // https://forum.webix.com/discussion/6772/switching-tabs-breaks-tinymce
         if (
            this.settings.type &&
            this.settings.type == "rich" &&
            $$(component.ui.id)
         ) {
            // recreate rich editor
            webix.ui(component.ui, $$(component.ui.id));
         }
      };

      return webix.copy(component);
   }
};
