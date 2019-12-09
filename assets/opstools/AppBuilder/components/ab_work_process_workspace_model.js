/*
 * ab_work_object_workspace_model
 *
 * Manage the Object Workspace area.
 *
 */
import BpmnModeler from "bpmn-js/lib/Modeler";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";

import CustomBPMN from "./ab_work_process_workspace_customBPMN";

export default class ABWorkProcessWorkspaceModel extends OP.Component {
    /**
     * @param {object} App
     * @param {string} idBase
     */
    constructor(App, idBase) {
        idBase = idBase || "ab_work_process_workspace_model";

        super(App, idBase);
        var L = this.Label;

        var labels = {
            common: App.labels,

            component: {
                label: L("ab.process.model.label", "*Model"),
                cancel: L("ab.common.cancel", "*Cancel"),
                confirmSave: L("ab.process.model.confirmSave", "*Save?"),
                confirmSaveMessage: L(
                    "ab.process.model.confirmSaveMessage",
                    "*Save your changes to {0}?"
                ),
                errorDisplay: L(
                    "ab.process.model.errorDisplay",
                    "*Error Displaying Process"
                ),
                errorDisplayMessage: L(
                    "ab.process.model.errorDisplayMessage",
                    "*Could not display the process definition for {0}. Do you want to start a blank process?"
                ),
                save: L("ab.common.save", "*Save")
            }
        };

        //// default settings

        // internal list of Webix IDs to reference our UI components.
        var ids = {
            button: this.unique("_button"),
            component: this.unique("_component"),
            modeler: this.unique("_modeler"),
            modelerBroken: this.unique("_modelerBroken"),
            modelerWorking: this.unique("_modelerWorking")
        };

        // Our webix UI definition:
        this.ui = {
            id: ids.component,
            rows: [
                {
                    cols: [
                        {
                            height: 32
                        },
                        {
                            id: ids.button,
                            view: "button",
                            type: "icon",
                            label: labels.component.save,
                            icon: "fa fa-save",
                            autowidth: true,
                            click: () => {
                                _logic.saveProcess(CurrentProcess);
                            }
                        },
                        {
                            height: 32
                        }
                    ]
                },
                {
                    id: ids.modelerWorking,
                    view: "template",
                    // height: 800,
                    template: `<div id="${ids.modeler}" style="width: 100%; height: 100%;"></div>`
                },
                {
                    id: ids.modelerBroken,
                    view: "template",
                    // height: 800,
                    template: `<div  style="width: 100%; height: 100%;"> Big Broken Icon Here </div>`
                }
                // {
                //     maxHeight: App.config.xxxLargeSpacer,
                //     hidden: App.config.hideMobile
                // }
            ]
        };

        var viewer = null;
        var unsavedChanges = false;

        // Our init() function for setting up our UI
        this.init = function() {
            //// NOTE: the webix template isn't created at this point.
            ////   we need to wait until the [process] tab and a Process are
            ////   selected before we are SURE this template exists in the DOM
            // viewer = new BpmnModeler({
            //     container: "#" + ids.modeler
            // });

            $$(ids.button).hide();
            $$(ids.modelerBroken).hide();
            $$(ids.modelerWorking).show();
        };

        var CurrentApplication = null;
        var CurrentProcess = null;

        // A list of the "Generic" BPMN Element Types we use as placeholders
        // until our own tasks are assigned to that element.
        var genericElementTypes = [
            "bpmn:Task",
            "bpmn:StartEvent",
            "bpmn:EndEvent"
        ];

        // our internal business logic
        var _logic = {
            ////

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
             * Clear the object workspace.
             */
            clearWorkspace: function() {
                // NOTE: to clear a visual glitch when multiple views are updating
                // at one time ... stop the animation on this one:
                $$(ids.noSelection).show(false, false);
            },

            saveProcess: (_process) => {
                return new Promise((resolve, reject) => {
                    viewer.saveXML({ preamble: true }, (err, xml) => {
                        // console.log(".saveXML() done:", err, xml);
                        if (err) {
                            reject(err);
                        }
                        _process.modelUpdate(xml);

                        _process
                            .save()
                            .then(() => {
                                unsavedChanges = false;
                                $$(ids.button).hide();
                                resolve();
                            })
                            .catch(reject);
                    });
                });
            },

            /**
             * @function populateWorkspace()
             *
             * Initialize the Object Workspace with the provided ABObject.
             *
             * @param {ABObject} object     current ABObject instance we are working with.
             */
            populateWorkspace: function(process) {
                // initialize the BPMN Viewer if not already initialized:
                if (!viewer) {
                    $$(ids.modelerBroken).hide();
                    $$(ids.modelerWorking).show();
                    viewer = new BpmnModeler({
                        container: "#" + ids.modeler,
                        additionalModules: [CustomBPMN]
                    });

                    // Modifying Attributes on a Diagram Shape:
                    // var elementRegistry = viewer.get('elementRegistry');
                    // var startEventShape = elementRegistry.get('StartEvent_1');
                    // var modeling = viewer.get("modeling");
                    // modeling.updateProperties(startEventShape, {
                    //   name: 'New name'
                    // });

                    // Adding color to a diagram element:
                    // var canvas = bpmnViewer.get('canvas');
                    // canvas.addMarker('UserTask_XYZ', 'highlight');
                    //   --> define svg style for "highlight"

                    // get currently selected shape:
                    // var selection = viewer.get("selection");
                    // var selectedElements = selection.get();

                    viewer.on(
                        [
                            "element.click"
                            // "element.updateId",
                            // "element.changed",
                            // "shape.remove"
                        ],
                        (event) => {
                            console.log(`${event.type}:`, event.element);
                        }
                    );
                    viewer.on("element.updateId", (event) => {
                        console.log("element.updateId:", event.element);
                        //
                    });
                    // viewer.on("element.changed", (event) => {
                    //     console.log("element.changed:", event.element);
                    // });

                    viewer.on("shape.remove", (event) => {
                        // console.log("shape.remove:", event.element);
                        if (CurrentProcess) {
                            // if our current process already has this Element/Task
                            var currTask = CurrentProcess.tasksForDiagramID(
                                event.element.id
                            )[0];
                            if (currTask) {
                                // send it an onChange(event.element);
                                currTask.destroy();
                            }
                        }
                    });
                    viewer.on("element.changed", (event) => {
                        console.log(`${event.type}:`, event.element);
                        var element = event.element;

                        // ignore sequence flow lines:
                        if (
                            element.type != "bpmn:SequenceFlow" &&
                            // SequenceFlow : seems to happen between tasks within the same Participant
                            element.type != "bpmn:MessageFlow"
                            // MessageFlow : seems to happen between tasks between Participants
                        ) {
                            // if this is not a Participant Lane:
                            if (
                                element.type != "bpmn:Participant" &&
                                element.type != "bpmn:Lane"
                            ) {
                                // if our current process already has this Element/Task
                                var currTask = CurrentProcess.tasksForDiagramID(
                                    element.id
                                )[0];
                                if (currTask) {
                                    // send it an onChange(event.element);
                                    currTask.onChange(element);
                                } else {
                                    // element.changed : can be triggered for deleted elements
                                    // make sure the shape for this element still exists,
                                    // before doing anything else here:
                                    var elementRegistry = viewer.get(
                                        "elementRegistry"
                                    );
                                    var currentElementShape = elementRegistry.get(
                                        element.id
                                    );
                                    if (currentElementShape) {
                                        // shape does exist, so:

                                        // if one of the generic elements
                                        // that doesn't have a definition attached
                                        // NOTE: EndEvents, are replaced with
                                        // elements.type=="EndEvent", but a
                                        // .eventDefinition[0].$type ==
                                        // "TerminateEndEvent"
                                        var def = null;
                                        var defType = null;
                                        if (
                                            event.element.businessObject
                                                .eventDefinitions
                                        ) {
                                            def =
                                                event.element.businessObject
                                                    .eventDefinitions[0];
                                        }
                                        if (def) {
                                            defType = def.$type;
                                        }

                                        if (
                                            genericElementTypes.indexOf(
                                                element.type
                                            ) != -1 &&
                                            !defType
                                        ) {
                                            // set the display to ".highlight"
                                            // so the user knows it hasn't been
                                            // fully configured yet.
                                            var canvas = viewer.get("canvas");
                                            canvas.addMarker(
                                                element.id,
                                                "highlight-undefined-task"
                                            );
                                        } else {
                                            // create new process task for this
                                            var newTask = CurrentProcess.taskNewForModelDefinition(
                                                element
                                            );
                                            if (newTask) {
                                                // if successful
                                                // try to remove the marker if it has one
                                                var canvas = viewer.get(
                                                    "canvas"
                                                );
                                                canvas.removeMarker(
                                                    element.id,
                                                    "highlight-undefined-task"
                                                );
                                            } else {
                                                debugger;
                                                console.warn(
                                                    "unknown ProcessTask for ",
                                                    element
                                                );
                                            }
                                        }
                                    }
                                }
                            } else {
                                // handle Participant lane update:

                                // if our current process already has this Participant
                                var currParticipant = CurrentProcess.participantsForDiagramID(
                                    element.id
                                )[0];
                                if (currParticipant) {
                                    // send it an onChange(event.element);
                                    currParticipant.onChange(element);
                                    //
                                } else {
                                    // create new process participant for this
                                    var newParticipant = CurrentProcess.participantNewForModelDefinition(
                                        element
                                    );
                                    if (newParticipant) {
                                    } else {
                                        debugger;
                                        console.warn(
                                            "!! Unable to add this participant:",
                                            element
                                        );
                                    }
                                }
                            }
                        }
                    });

                    viewer.on("selection.changed", (event) => {
                        console.log(
                            "selection.changed: New: ",
                            event.newSelection
                        );
                        console.log(
                            "selection.changed: Old: ",
                            event.oldSelection
                        );
                    });

                    var modeler = viewer.getModules();
                    // debugger;

                    // setup our Listeners:

                    // when a change is made, then make the [Save] button ready:
                    viewer.on("commandStack.changed", () => {
                        unsavedChanges = true;
                        $$(ids.button).show();
                    });
                }

                var processSequence = [];

                // if there are unsaved changes in our CurrentProcess
                if (CurrentProcess && unsavedChanges) {
                    // insert a save confirmation step
                    processSequence.push((done) => {
                        OP.Dialog.Confirm({
                            title: labels.component.confirmSave,
                            message: labels.component.confirmSaveMessage.replace(
                                "{0}",
                                CurrentProcess.name
                            ),
                            callback: (isOK) => {
                                if (isOK) {
                                    _logic
                                        .saveProcess(CurrentProcess)
                                        .then(() => {
                                            done();
                                        })
                                        .catch(done);
                                } else {
                                    // then ignore the unsaved changes
                                    unsavedChanges = false;
                                    $$(ids.button).hide();
                                    done();
                                }
                            }
                        });
                    });
                }

                // continue our sequence with loading the new process
                processSequence.push((done) => {
                    // NOTE: make sure CurrentProcess == null BEFORE .clear()
                    CurrentProcess = null;
                    viewer.clear();
                    CurrentProcess = process;

                    ///////
                    var xml = process.modelDefinition();
                    if (!xml) {
                        process.modelNew();
                        xml = process.modelDefinition();
                    }

                    viewer.importXML(xml, function(err) {
                        // console.log(".importXML(): done. ", err);
                        viewer.get("canvas").zoom("fit-viewport", "auto");
                        done(err);
                    });
                });

                async.series(processSequence, (err) => {
                    if (err) {
                        if (err.toString().indexOf("no diagram to display")) {
                            OP.Dialog.Confirm({
                                title: labels.component.errorDisplay,
                                message: labels.component.errorDisplayMessage.replace(
                                    "{0}",
                                    CurrentProcess.name
                                ),
                                callback: (isOK) => {
                                    if (isOK) {
                                        process.modelNew();
                                        _logic.populateWorkspace(
                                            CurrentProcess
                                        );
                                    } else {
                                        // show the broken Process page
                                        $$(ids.modelerWorking).hide();
                                        $$(ids.modelerBroken).show();
                                        viewer.clear();
                                        viewer.destroy();
                                        viewer = null;
                                    }
                                }
                            });
                        }
                        console.log(err);
                    }

                    $$(ids.modelerBroken).hide();
                    $$(ids.modelerWorking).show();
                });
            },

            /**
             * @function show()
             *
             * Show this component.
             */
            show: function() {
                $$(ids.component).show();
            },

            loadData: function() {}
        };
        this._logic = _logic;

        //
        // Define our external interface methods:
        //
        this.applicationLoad = this._logic.applicationLoad;
        this.populateWorkspace = this._logic.populateWorkspace;
        this.clearWorkspace = this._logic.clearWorkspace;
    }
}