const ABFieldCustomIndexCore = require("../../core/dataFields/ABFieldCustomIndexCore");

module.exports = class ABFieldCustomIndex extends ABFieldCustomIndexCore {
   constructor(values, object) {
      super(values, object);
   }

   ///
   /// DB Migrations
   ///

   /**
    * @function migrateCreate
    * perform the necessary sql actions to ADD this column to the DB table.
    * @param {knex} knex the Knex connection.
    * @return {Promise}
    */
   migrateCreate(knex) {
      let tableName = this.object.dbTableName();

      return (
         Promise.resolve()
            .then(
               () =>
                  new Promise((next, bad) => {
                     // if this column doesn't already exist (you never know)
                     knex.schema
                        .hasColumn(tableName, this.columnName)
                        .then((exists) => {
                           return knex.schema
                              .table(tableName, (t) => {
                                 if (exists) return next();

                                 // Create a new column here.
                                 t.specificType(
                                    this.columnName,
                                    "VARCHAR(535) NULL UNIQUE"
                                 );
                              })
                              .then(() => {
                                 next();
                              })
                              .catch(bad);
                        });
                  })
            )
            // Create trigger to update value when UPDATE exists row
            .then(
               () =>
                  new Promise((next, bad) => {
                     let combinedFieldIds = (
                        this.settings.combinedFields || ""
                     ).split(",");

                     let columnNames = [];
                     (combinedFieldIds || []).forEach((fId) => {
                        let field = this.object.fields((f) => f.id == fId)[0];
                        if (!field) return;

                        columnNames.push(`new.\`${field.columnName}\``);
                     });

                     if (!columnNames || !columnNames.length) return next();

                     knex
                        .raw(
                           `CREATE TRIGGER ${this.updateTriggerName}
                           BEFORE UPDATE ON ${tableName}
                           FOR EACH ROW
                           SET new.\`${
                              this.columnName
                           }\` = CONCAT(${columnNames.join(", '+', ")});`
                           // SET new.\`${this.columnName}\` = CONCAT(new.`COLUMN1`, '+', new.`COLUMN2`, '+', ...);`
                        )
                        .then(() => {
                           next();
                        })
                        .catch((error) => {
                           if (error.code == "ER_TRG_ALREADY_EXISTS") {
                              next();
                           } else {
                              bad(error);
                           }
                        });
                  })
            )
      );
   }

   /**
    * @function migrateUpdate
    * perform the necessary sql actions to MODIFY this column to the DB table.
    * @param {knex} knex the Knex connection.
    */
   migrateUpdate(knex) {
      return this.migrateCreate(knex);
   }

   /**
    * @function migrateDrop
    * perform the necessary sql actions to drop this column from the DB table.
    * @param {knex} knex the Knex connection.
    */
   migrateDrop(knex) {
      return Promise.resolve()
         .then(
            () =>
               new Promise((next, bad) => {
                  knex
                     .raw(`DROP TRIGGER IF EXISTS ${this.updateTriggerName}`)
                     .then(() => {
                        next();
                     })
                     .catch(bad);
               })
         )
         .then(() => super.migrateDrop(knex));
   }

   ///
   /// DB Model Services
   ///

   /**
    * @method jsonSchemaProperties
    * register your current field's properties here:
    */
   jsonSchemaProperties(obj) {
      // take a look here:  http://json-schema.org/example1.html

      // if our field is not already defined:
      if (!obj[this.columnName]) {
         // Set json schema type to validate
         // obj[this.columnName] = { type:'string' }
         obj[this.columnName] = { type: "null" };
      }
   }

   /**
    * @method requestParam
    * return the entry in the given input that relates to this field.
    * @param {obj} allParameters  a key=>value hash of the inputs to parse.
    * @return {obj} or undefined
    */
   requestParam(allParameters) {
      var myParameter = super.requestParam(allParameters);

      // Remove every values
      if (myParameter && myParameter[this.columnName] != null)
         delete myParameter[this.columnName];

      return myParameter;
   }

   /**
    * @method isValidParams
    * Parse through the given parameters and return an error if this field's
    * data seems invalid.
    * @param {obj} allParameters  a key=>value hash of the inputs to parse.
    * @return {array}
    */
   isValidData(allParameters) {
      var errors = [];

      return errors;
   }

   get safeTableName() {
      return (this.object.dbTableName() || "")
         .replace(/ /g, "")
         .substring(0, 15);
   }

   get safeColumnName() {
      return (this.columnName || "").replace(/ /g, "").substring(0, 15);
   }

   get updateTriggerName() {
      return `${this.safeTableName}_${this.safeColumnName}_update`;
   }
};
