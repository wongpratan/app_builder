/*
 * ABProcessTaskManager
 *
 * An interface for managing the different ABProcessTasks in AppBuilder.
 *
 */
var path = require("path");

var ABProcessTaskEmail = require(path.join(__dirname, "ABProcessTaskEmail"));
var ABProcessTaskEnd = require(path.join(__dirname, "ABProcessTaskEnd"));
var ABProcessTaskTrigger = require(path.join(
    __dirname,
    "ABProcessTaskTrigger"
));

/*
 * Tasks
 * A name => ABProcessTask  hash of the different ABProcessTask available.
 */
var Tasks = {};
Tasks[ABProcessTaskEmail.defaults().key] = ABProcessTaskEmail;
Tasks[ABProcessTaskEnd.defaults().key] = ABProcessTaskEnd;
Tasks[ABProcessTaskTrigger.defaults().key] = ABProcessTaskTrigger;

module.exports = {
    /*
     * @function allTasks
     * return all the currently defined ABProcessTasks in an array.
     * @return [{ABProcessTask},...]
     */
    allTasks: function() {
        var tasks = [];
        for (var t in Tasks) {
            tasks.push(Tasks[t]);
        }
        return tasks;
    },

    /*
     * @function newTask
     * return an instance of an ABProcessTask based upon the def.key value.
     * @return {ABProcessTask}
     */
    newTask: function(def, process, application) {
        if (def.key) {
            return new Tasks[def.key](def, process, application);
        } else {
            //// TODO: what to do here?
        }
    }
};
