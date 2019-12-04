// import ABApplication from "./ABApplication"
// const ABApplication = require("./ABApplication"); // NOTE: change to require()
const ABProcessTask = require("./ABProcessTask.js");

var ABProcessTaskEmailDefaults = {
    key: "Email", // unique key to reference this specific Task
    icon: "email" // font-awesome icon reference.  (without the 'fa-').  so 'user'  to reference 'fa-user'
};

module.exports = class ABProcessTaskEmail extends ABProcessTask {
    constructor(attributes, process, application) {
        attributes.type = attributes.type || "process.task.email";
        super(attributes, process, application, ABProcessTaskEmailDefaults);

        // listen
    }

    // return the default values for this DataField
    static defaults() {
        return ABProcessTaskEmailDefaults;
    }

    static DiagramReplace() {
        return {
            label: "Send Task",
            actionName: "replace-with-send-task",
            className: "bpmn-icon-send",
            target: {
                type: "bpmn:SendTask"
            }
        };
    }

    ////
    //// Process Instance Methods
    ////

    /**
     * do()
     * this method actually performs the action for this task.
     * @param {obj} instance  the instance data of the running process
     * @return {Promise}
     *      resolve(true/false) : true if the task is completed.
     *                            false if task is still waiting
     */
    do(instance) {
        return new Promise((resolve, reject) => {
            // for testing:
            var myState = this.myState(instance);
            myState.status = "completed";
            this.log(instance, "Email Sent successfully");
            resolve(true);
        });
    }

    /**
     * initState()
     * setup this task's initial state variables
     * @param {obj} context  the context data of the process instance
     * @param {obj} val  any values to override the default state
     */
    initState(context, val) {
        var myDefaults = {
            to: "",
            from: "",
            subject: "",
            message: ""
        };

        super.initState(context, myDefaults, val);
    }
};
