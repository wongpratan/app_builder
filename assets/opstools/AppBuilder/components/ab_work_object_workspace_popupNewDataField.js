
/*
 * ab_work_object_workspace_popupNewDataField
 *
 * Manage the Add New Data Field popup.
 *
 */

import ABFieldManager from "../classes/ABFieldManager"


export default class AB_Work_Object_Workspace_PopupNewDataField extends OP.Component {   //.extend(idBase, function(App) {

    constructor(App) {
        super(App, 'ab_work_object_workspace_popupNewDataField');
        var L = this.Label;

        var labels = {
            common : App.labels,
            component: {
                fieldType: L('ab.add_fields.fieldType', "*Field type"),
                label: L('ab.add_fields.label', "*Label"),
                addNewField: L('ab.add_fields.addNewField', "*Add Column"),
            }
        }


        // internal list of Webix IDs to reference our UI components.
        var ids = {
            component: this.unique('component'),
            types: this.unique('types'),
            editDefinitions: this.unique('editDefinitions'),

            buttonSave: this.unique('buttonSave'),
            buttonCancel: this.unique('buttonCancel')
        }



        // Our webix UI definition:
        this.ui = {
            view:"popup",
            id: ids.component,
            modal: true,
            autoheight:true,
            // maxHeight: 420,

    // ready: function () {
    //  console.error('ready() called!!!')
    //  _logic.resetState();
    // },

            body: {
                css: 'ab-add-fields-popup',
                borderless: true,
                rows: [
                    {
                        view: "richselect",
                        id: ids.types,
                        label: labels.component.fieldType,
                        labelWidth: App.config.labelWidthLarge,
                        options: [
                            //We will add these later
                            { id:'temporary', view:'temporary' }
                        ],
                        on: {
                            onChange: function (id, ev, node) {
                                _logic.onChange(id);
                            }
                        }
                    },
                    {
                        height: 10,
                        type: "line"
                    },
                    {
                        view:'multiview',
                        id: ids.editDefinitions,
                        // NOTE: can't leave this an empty []. We redefine this value later.
                        cells: [ { id:'del_me', view:'label', label:'edit definition here' } ]
                    },
                    { height: 10 },
                    {
                        cols: [
                            { fillspace: true },
                            {
                                view: "button",
                                value: labels.common.cancel,
                                css: "ab-cancel-button",
                                autowidth: true,
                                click: function () {
                                    _logic.buttonCancel();
                                }
                            },
                            {
                                view: "button",
                                id: ids.buttonSave,
                                label: labels.component.addNewField,
                                autowidth: true,
                                type: "form",
                                click: function () {
                                    _logic.buttonSave();
                                }
                            }
                        ]
                    }
                ]
            },
            on: {
                //onBeforeShow: function () {
                //  _logic.resetState();
                //},
                onHide: function () {
                    _logic.resetState();
                }
            }
        }


        var _objectHash = {};       // 'name' => ABFieldXXX object
        var _componentHash = {};    // 'name' => ABFieldXXX ui component
        var _componentsByType = {}; // 'type' => ABFieldXXX ui component
        var _currentEditor = null;
        var _currentApplication = null;
        var _currentObject = null;

        var defaultEditorComponent = null;  // the default editor.
        var defaultEditorID = null; // the default editor id.
        var submenus = [];  // Create the submenus for our Data Fields:

        var _editField = null;      // field instance being edited



        // Our init() function for setting up our UI
        this.init = (options) => {

            // register our callbacks:
            for(var c in _logic.callbacks) {
                _logic.callbacks[c] = options[c] || _logic.callbacks[c];
            }


            // initialize our components
            webix.ui(this.ui);
            webix.extend($$(ids.component), webix.ProgressBar);

            var Fields = ABFieldManager.allFields();


            //// we need to load a submenu entry and an editor definition for each
            //// of our Fields



            var newEditorList = {
                view:'multiview',
                id:ids.editDefinitions,
                rows:[]
            }

            Fields.forEach(function(F){

                var menuName = F.defaults().menuName ;
                var key = F.defaults().key;

                // add a submenu for the fields multilingual key
                submenus.push( {"id":menuName, "value":menuName} );


                // Add the Field's definition editor here:
                var editorComponent = F.propertiesComponent(App);
                if (!defaultEditorComponent) {
                    defaultEditorComponent = editorComponent;
                    defaultEditorID = menuName;
                }
                newEditorList.rows.push(editorComponent.ui);


                _objectHash[ menuName ] = F;
                _componentHash[ menuName ] = editorComponent;
                _componentsByType[ key ]  = editorComponent;

            })


            // the submenu button has a placeholder we need to remove and update
            // with one that has all our submenus in it.
            // var firstID = $$(ids.types).getFirstId();
            // $$(ids.types).updateItem(firstID, {
            //  value: labels.component.chooseType,
            //  submenu: submenus
            // })
            $$(ids.types).define("options",submenus);
            $$(ids.types).refresh();

            // now remove the 'del_me' definition editor placeholder.
            webix.ui(newEditorList, $$(ids.editDefinitions));

            // hide all the unused editors:
            for (var c in _componentHash){
                _componentHash[c].hide();
            }

            defaultEditorComponent.show(); // show the default editor
            _currentEditor = defaultEditorComponent;

            // set the richselect to the first option by default.
            $$(ids.types).setValue(submenus[0].id);

            // $$(ids.editDefinitions).show();

// $$(ids.editDefinitions).cells() // define the edit Definitions here.
        }



        // our internal business logic
        var _logic = this._logic = {

            applicationLoad: (application) => {

                _currentApplication = application;

                // TODO : should load ABApplication to data field popup here ?
                for (var menuName in _componentHash) {
                    if (_componentHash[menuName] && _componentHash[menuName]._logic.applicationLoad) {
                        _componentHash[menuName]._logic.applicationLoad(application);
                    }
                }

            },


            buttonCancel:function() {

                _logic.resetState();

                // clear all editors:
                for (var c in _componentHash) {
                    _componentHash[c].clear();
                }

                // hide this popup.
                $$(ids.component).hide();
            },


            buttonSave:function() {

                $$(ids.buttonSave).disable();
                // show progress
				$$(ids.component).showProgress();



                var editor = _currentEditor;
                if (editor) {

                    // the editor can define some basic form validations.
                    if (editor.isValid()) {

                        var values = editor.values();

                        var field = null;
                        var oldData = null;

                        var linkCol;

                        // if this is an ADD operation, (_editField will be undefined)
                        if (!_editField) {

                            // get a new instance of a field:
                            field = _currentObject.fieldNew(values);

                            // TODO workaround : where should I add a new link field to link object
                            if (field.key == 'connectObject') {

                                var linkObject = _currentApplication.objects((obj) => obj.id == field.settings.linkObject)[0];

                                linkCol = linkObject.fieldNew({
                                    id: OP.Util.uuid(),

                                    key: field.key,

                                    columnName: field.columnName,
                                    label: field.label,

                                    settings: {
                                        showIcon: field.settings.showIcon,

                                        linkObject: field.object.id,
                                        linkType: field.settings.linkViaType,
                                        linkViaType: field.settings.linkType,
                                        isSource: 0
                                    }
                                });

                                // Update link column id to source column
                                field.settings.linkColumn = linkCol.id;
                            }

                        } else {

                            // use our _editField, backup our oldData
                            oldData = _editField.toObj();
                            _editField.fromValues(values);

                            field = _editField;
                        }


                        var validator = field.isValid();
                        if (validator.fail()) {
                            validator.updateForm($$(editor.ui.id))
    // OP.Form.isValidationError(errors, $$(editor.ui.id));

                            // keep our old data
                            if (oldData) {
                                field.fromValues(oldData);
                            }

                            $$(ids.buttonSave).enable();
                            $$(ids.component).hideProgress();
                        } else {


                            field.save()
                            .then(()=>{

                                // TODO workaround : update link column id
                                if (linkCol != null) {
                                    linkCol.settings.linkColumn = field.id;
                                    linkCol.save().then(() => {

                                        // refresh linked object model
                                        linkCol.object.model().refresh();

                                        // refresh source object model
                                        // NOTE: M:1 relation has to refresh model after linked object's refreshed
                                        field.object.model().refresh();
                                    });
                                }

                                $$(ids.buttonSave).enable();
                                $$(ids.component).hideProgress();
                                _currentEditor.clear();
                                _logic.hide();
                                _logic.callbacks.onSave(field)
                            })
                            .catch((err) => {
                                OP.Validation.isFormValidationError(err, $$(editor.ui.id));
                                $$(ids.buttonSave).enable();
                                $$(ids.component).hideProgress();
                            })
                        }


                    } else {
                        $$(ids.buttonSave).enable();
                        $$(ids.component).hideProgress();
                    }

                }  else {

                    OP.Dialog.Alert({
                        title: '! Could not find the current editor.',
                        text: 'go tell a developer about this.'
                    })
                    $$(ids.buttonSave).enable();
                    $$(ids.component).hideProgress();
                }

    // if (!inputValidator.validateFormat(fieldInfo.name)) {
    //  self.enable();
    //  return;
    // }

    // // Validate duplicate field name
    // var existsColumn = $.grep(dataTable.config.columns, function (c) { return c.id == fieldInfo.name.replace(/ /g, '_'); });
    // if (existsColumn && existsColumn.length > 0 && !data.editFieldId) {
    //  webix.alert({
    //      title: labels.add_fields.duplicateFieldTitle,
    //      text: labels.add_fields.duplicateFieldDescription,
    //      ok: labels.common.ok
    //  });
    //  this.enable();
    //  return;
    // }

    // if (fieldInfo.weight == null)
    //  fieldInfo.weight = dataTable.config.columns.length;

    // // Call callback function
    // if (base.saveFieldCallback && base.fieldName) {
    //  base.saveFieldCallback(base.fieldName, fieldInfo)
    //      .then(function () {
    //          self.enable();
    //          base.resetState();
    //          base.hide();
    //      });
    // }


            },


            callbacks:{
                onCancel: function() { console.warn('NO onCancel()!') },
                onSave  : function(field) { console.warn('NO onSave()!') },
            },



            hide:function() {
                $$(ids.component).hide();
            },



            modeAdd:function() {

                // show default editor:
                defaultEditorComponent.show(false, false);
                _currentEditor = defaultEditorComponent;

                // show the ability to switch data types
                $$(ids.types).show();

                // change button text to 'add'
                $$(ids.buttonSave).define('label', labels.component.addNewField);
                $$(ids.buttonSave).refresh();
            },


            modeEdit: function(field) {

                if (_currentEditor) _currentEditor.hide();

                // switch to this field's editor:
                // hide the rest
                for(var c in _componentsByType) {
                    if (c == field.key) {
                        _componentsByType[c].show(false, false);
                        _componentsByType[c].populate(field);
                        _currentEditor = _componentsByType[c];

                    } else {
                        _componentsByType[c].hide();
                    }
                }

                // disable elements that disallow to edit
                if (_currentEditor && _currentEditor.ui && _currentEditor.ui.elements) {

                    var disableElem = (elem) => {

                        if (elem.disallowEdit && $$(elem.id) && $$(elem.id).disable) {
                            $$(elem.id).disable();
                        }

                    };


                    _currentEditor.ui.elements.forEach((elem) => {

                        disableElem(elem);

                        // disable elements are in rows/cols
                        var childElems = elem.cols || elem.rows;
                        if (childElems && childElems.forEach) {
                            childElems.forEach((childElem) => {
                                disableElem(childElem);
                            });
                        }

                    });
                }

                // hide the ability to switch data types
                $$(ids.types).hide();

                // change button text to 'save'
                $$(ids.buttonSave).define('label', labels.common.save);
                $$(ids.buttonSave).refresh();
            },


            /**
             * @function onChange
             * swap the editor view to match the data field selected in the menu.
             *
             * @param {string} name  the menuName() of the submenu that was selected.
             */
            onChange: function (name) {
                // note, the submenu returns the Field.menuName() values.
                // we use that to lookup the Field here:
                var editor = _componentHash[name];
                if (editor) {
                    editor.show();
                    _currentEditor = editor;
                    $$(ids.types).blur();
                } else {

                    // most likely they clicked on the menu button itself.
                    // do nothing.

                    // OP.Error.log("App Builder:Workspace:Object:NewDataField: could not find editor for submenu item:"+name, { name:name });
                }

            },




            resetState: function() {

                // enable elements that disallow to edit
                if (_currentEditor && _currentEditor.ui && _currentEditor.ui.elements) {

                    var enableElem = (elem) => {

                        if (elem.disallowEdit && $$(elem.id) && $$(elem.id).enable) {
                            $$(elem.id).enable();
                        }

                    };


                    _currentEditor.ui.elements.forEach((elem) => {

                        enableElem(elem);

                        // enable elements are in rows/cols
                        var childElems = elem.cols || elem.rows;
                        if (childElems && childElems.forEach) {
                            childElems.forEach((childElem) => {
                                enableElem(childElem);
                            });
                        }

                    });
                }


                defaultEditorComponent.show(); // show the default editor
                _currentEditor = defaultEditorComponent;

                // set the richselect to the first option by default.
                $$(ids.types).setValue(submenus[0].id);

            },



            /**
             * @function show()
             *
             * Show this component.
             * @param {obj} $view  the webix.$view to hover the popup around.
             * @param {ABField} field the ABField to edit.  If not provided, then
             *                        this is an ADD operation.
             */
            show:function($view, field) {

                _editField = field;

                if (_editField) {

                    _logic.modeEdit(field);

                } else {

                    _logic.modeAdd();

                }

                $$(ids.component).show($view);
            },



            typeClick:function() {
                // NOTE: for functional testing we need a way to display the submenu
                // (functional tests don't do .hover very well)
                // so this routine is to enable .click() to show the submenu.

                var subMenuId = $$(ids.types).config.data[0].submenu;

                // #HACK Sub-menu popup does not render on initial
                // Force it to render popup by use .getSubMenu()
                if (typeof subMenuId != 'string') {
                    $$(ids.types).getSubMenu($$(ids.types).config.data[0].id);
                    subMenuId = $$(ids.types).config.data[0].submenu;
                }

                if ($$(subMenuId))
                    $$(subMenuId).show();
            }
        }



        // Expose any globally accessible Actions:
        this.actions({

            populateObjectPopupAddDataField: function(object) {
                _currentObject = object;

                // TODO : should load current object to data field popup here ?
                for (var menuName in _componentHash) {
                    if (_componentHash[menuName] && _componentHash[menuName]._logic.objectLoad) {
                        _componentHash[menuName]._logic.objectLoad(_currentObject);
                    }
                }

            }

        })



        // 
        // Define our external interface methods:
        //
        this.applicationLoad = _logic.applicationLoad; // {fn}     fn(ABApplication) 
        this.show = _logic.show;       // {fn}     fn(node, ABField)
    }

}
