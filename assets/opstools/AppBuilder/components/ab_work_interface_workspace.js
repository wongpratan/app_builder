
/*
 * ab_work_interface_workspace
 *
 * Display the form for creating a new Application.
 *
 */

import ABWorkspaceEditor from "./ab_work_interface_workspace_editor"
import ABWorkspaceDetails from "./ab_work_interface_workspace_details"

export default class AB_Work_Interface_Workspace extends OP.Component {
    
    constructor(App) {
        super(App, 'ab_work_interface_workspace');
        var L = this.Label;
        
        var labels = {
            common: App.labels,
            component: {
                // formHeader: L('ab.application.form.header', "*Application Info"),
                selectPage: L('ab.interface.selectPage', "*Select a Page to edit")
            }
        };
        
        
        // internal list of Webix IDs to reference our UI components.
        var ids = {
            component: this.unique('component'),

            noSelection: this.unique('nada'),

            selectedView: this.unique('selectedView'),

            
        };

        
        var ColumnEditor = new ABWorkspaceEditor(App);
        var ColumnDetails = new ABWorkspaceDetails(App);

        
        // webix UI definition:
        this.ui = {
            view:'multiview',
            id: ids.component,
            scroll: true,
            rows: [
                {
                    id: ids.noSelection,
                    rows:[
                        {
                            maxHeight: App.config.xxxLargeSpacer,
                            hidden: App.config.hideMobile
                        },
                        {
                            view:'label',
                            align: "center",
                            label:labels.component.selectPage
                        },
                        {
                            maxHeight: App.config.xxxLargeSpacer,
                            hidden: App.config.hideMobile
                        }
                    ]
                },
                {
                    id: ids.selectedView,
                    cols: [
                        ColumnEditor.ui,
                        { view: "resizer"},
                        ColumnDetails.ui
                    ]
                }
            ]
        };
        
        // setting up UI
        this.init = function() {
            // webix.extend($$(ids.form), webix.ProgressBar);
            $$(ids.noSelection).show();
            $$(ids.selectedView).hide();

            ColumnEditor.init();
            ColumnDetails.init();

            
        };
        


        var CurrentView = null;     // The current View in the Editor.

        
        // internal business logic 
        var _logic = this.logic = {
            
            // /**
            //  * @function formBusy
            //  *
            //  * Show the progress indicator to indicate a Form operation is in 
            //  * progress.
            //  */
            // formBusy: function() {
    
            //  $$(ids.form).showProgress({ type: 'icon' });
            // },
            
            
            // /**
            //  * @function formReady()
            //  *
            //  * remove the busy indicator from the form.
            //  */
            // formReady: function() {
            //  $$(ids.form).hideProgress();
            // },
            
            
            /**
             * @function show()
             *
             * Show this component.
             */
            show: function() {
                $$(ids.component).show();
            }
        };

        
        // Expose any globally accessible Actions:
        this.actions({
            

            /**
             * @function clearObjectWorkspace()
             *
             * Clear the object workspace.
             */
            clearInterfaceWorkspace:function(){

                // NOTE: to clear a visual glitch when multiple views are updating
                // at one time ... stop the animation on this one:
                $$(ids.noSelection).show(false, false);
                // $$(ids.selectedView).hide();
            },


            /**
             * @function populateObjectWorkspace()
             *
             * Initialize the Object Workspace with the provided ABObject.
             *
             * @param {ABObject} object     current ABObject instance we are working with.
             */
            populateInterfaceWorkspace: function(view) {
                // $$(ids.noSelection).hide();
                $$(ids.selectedView).show();

                CurrentView = view;

                ColumnEditor.viewLoad(view);
                ColumnDetails.viewLoad(view);

            }
            
        });
        
        
        // Interface methods for parent component:
        this.show = _logic.show;
        
    }
}