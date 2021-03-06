const ABIndexCore = require("../core/ABIndexCore");

module.exports = class ABIndex extends ABIndexCore {
   constructor(attributes, object) {
      super(attributes, object);
   }

   isExist(knex) {
      return new Promise((resolve, reject) => {
         let indexName = this.indexName;
         let tableName = this.object.dbTableName();

         knex.schema
            .raw(
               `SHOW INDEXES FROM ${tableName} WHERE \`Key_name\` = '${indexName}';`
            )
            .catch(reject)
            .then((data) => {
               let exists = (data[0] || []).length > 0;

               resolve(exists);
            });
      });
   }

   ///
   /// DB Migrations
   ///

   migrateCreate(knex) {
      if (this.fields == null || !this.fields.length) return Promise.resolve();

      let indexName = this.indexName;
      let tableName = this.object.dbTableName();
      let columnNames = this.fields.map((f) => f.columnName);

      return Promise.resolve()
         .then(() => this.isExist(knex))
         .then((exists) => {
            if (exists) return Promise.resolve();

            if (this.unique) {
               // Create Unique & Index
               return knex.schema.raw(
                  `ALTER TABLE ${tableName} ADD UNIQUE INDEX ${indexName}(${knex.client
                     .formatter()
                     .columnize(columnNames)})`
               );
            } else {
               return knex.schema.table(tableName, (table) => {
                  // ALTER TABLE {tableName} ADD INDEX {indexName} ({columnNames})
                  table.index(columnNames, indexName);
               });
            }
         });
   }

   migrateDrop(knex) {
      if (this.fields == null || !this.fields.length) return Promise.resolve();

      let indexName = this.indexName;
      let tableName = this.object.dbTableName();
      // let columnNames = this.fields.map((f) => f.columnName);

      return new Promise((resolve, reject) => {
         knex.schema
            .raw(`ALTER TABLE ${tableName} DROP INDEX \`${indexName}\``)
            .then(() => resolve())
            .catch((err) => {
               // Not exists
               if (err.code == "ER_CANT_DROP_FIELD_OR_KEY") return resolve();

               reject(err);
            });
      });

      // return new Promise((resolve, reject) => {
      //    knex.schema
      //       .table(tableName, (table) => {
      //          // Drop Unique
      //          if (this.unique) {
      //             table.dropUnique(columnNames, this.uniqueName);
      //          }

      //          // Drop Index
      //          table.dropIndex(columnNames, indexName);
      //       })
      //       .catch((err) => {
      //          console.error(err);
      //          resolve();
      //       })
      //       .then(() => resolve());
      // });
   }
};
