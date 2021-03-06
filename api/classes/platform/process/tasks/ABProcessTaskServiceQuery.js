const path = require("path");
const ABProcessTaskServiceQueryCore = require(path.join(
   __dirname,
   "..",
   "..",
   "..",
   "core",
   "process",
   "tasks",
   "ABProcessTaskServiceQueryCore.js"
));

const ABProcessParticipant = require(path.join(
   __dirname,
   "..",
   "ABProcessParticipant"
));

const AB = require("ab-utils");
const reqAB = AB.reqAB({}, {});
reqAB.jobID = "ABProcessTaskServiceQuery";

module.exports = class ABProcessTaskServiceQuery extends ABProcessTaskServiceQueryCore {
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
         var myState = this.myState(instance);

         if (!this.qlObj) {
            var msg = `ABProcessTaskServiceQuery.do(): ${this.id} : Unable to create instance of our QL operations.`;
            var qlError = new Error(msg);
            reject(qlError);
            return;
         }

         // tell our QueryLanguage Operation to .do() it's thang
         this.qlObj
            .do(instance)
            .then(() => {
               // this resolves when all the operations are finished
               // so we are done!

               this.log(instance, `${this.name} completed successfully`);
               this.stateCompleted(instance);
               resolve(true);
            })
            .catch((err) => {
               this.log(
                  instance,
                  `${
                     this.name
                  } : QL Operation reported an error: ${err.toString()}`
               );
               reject(err);
            });
      });
   }
};
