var uuid = require('node-uuid');
var path = require('path');

var ABFieldBase = require(path.join(__dirname,  "..", "..", "assets", "opstools", "AppBuilder", "classes", "dataFields", "ABFieldBase.js"));

// Build a reference of AB defaults for all supported Sails data field types
var FieldManager = require(path.join('..', 'classes', 'ABFieldManager.js'));
var mysqlTypeToABFields = {};
FieldManager.allFields().forEach((Field) => {
	let field = new Field({ settings: {} }, {});
	field.fieldMysqlTypes().forEach((type) => {
		mysqlTypeToABFields[type] = {
			key: field.key,
			icon: field.icon,
			settings: field.settings,
		};
	});
});


function isSupportType(type) {
	return mysqlTypeToABFields[type] != null;
}

module.exports = {

	/**
	 * @method getTableList
	 * Get the list of table name
	 * 
	 * @return Promise -
	 * 			return {Array} [
	 * 				tableName {string}, ..., tableNameN {string}
	 * 			]
	 */
	getTableList: (appID) => {

		var allTableNames = [],
			existsTableNames = [];

		return Promise.resolve()
			.then(function () {

				return new Promise((resolve, reject) => {

					var knex = ABMigration.connection();

					// SELECT `TABLE_NAME` 
					// FROM information_schema.tables 
					// WHERE `TABLE_TYPE` = 'BASE TABLE' 
					// AND `TABLE_SCHEMA` = [CURRENT DB]
					// AND `TABLE_NAME`   NOT LIKE 'AB_%'
					// AND `TABLE_NAME`   NOT LIKE '%_trans';
					knex.select('TABLE_NAME')
						.from('information_schema.tables')
						.where('TABLE_TYPE', '=', 'BASE TABLE')
						.andWhere('TABLE_SCHEMA', '=', sails.config.connections.appBuilder.database)
						.andWhere('TABLE_NAME', 'NOT LIKE', 'AB_%')
						.andWhere('TABLE_NAME', 'NOT LIKE', '%_trans')
						.catch(reject)
						.then(function (result) {

							allTableNames = result.map(r => r.TABLE_NAME);

							resolve();

						});
				});
			})
			.then(function () {

				return new Promise((resolve, reject) => {

					ABApplication.find({ id: appID })
						.exec(function (err, list) {
							if (err) reject(err);
							else if (!list || !list[0]) {
								reject(new Error('Application not found: ' + appID));
							}
							else {
								let application = list[0].toABClass();

								application.objects().forEach(obj => {

									existsTableNames.push(obj.dbTableName());

								});

								resolve();
							}
						});
				});

			})
			.then(function () {

				// Get only not exists table names
				return new Promise((resolve, reject) => {

					resolve(allTableNames.filter(name => {
						return existsTableNames.indexOf(name) < 0;
					}));

				});

			});


	},

	/**
	 * @method getColumns
	 * Get the column info list of a table
	 * 
	 * @return Promise -
	 * 			return {
	 * 				columnName: {
	 * 								defaultValue: {null|string|integer},
	 *								type: {string},
	 * 								maxLength: {integer},
	 * 								nullable: {boolean},
	 * 
	 * 								supported: {boolean}, // flag support to convert to ABField
	 * 								icon: {string} [Optional]
	 * 							}
	 * 			}
	 */
	getColumns: (tableName) => {

		var columns = [];

		return Promise.resolve()
			.then(function () {

				return new Promise((resolve, reject) => {

					var knex = ABMigration.connection();

					knex(tableName).columnInfo()
						.catch(reject)
						.then(function (result) {

							columns = result;
							resolve();

						});

				});

			})
			.then(function () {

				return new Promise((resolve, reject) => {

					Object.keys(columns).forEach(name => {

						var col = columns[name];
						col.supported = isSupportType(col.type);

						if (col.supported) {
							col.icon = mysqlTypeToABFields[col.type].icon;
						}

					});

					resolve(columns);

				});

			});

	},

	/**
	 * Imports an existing MySql table for use in an AB application.
	 * An AB object will be created for that model.
	 *
	 * @param integer	appID
	 * @param string	tableName
	 * @param [{
	 *      name: string,
	 *      label: string,
	 * 		isVisible: bool
	 * }] columnList
	 * @return Promise
	 *     Resolves with the data of the new imported object
	 **/
	tableToObject: function (appID, tableName, columnList) {

		var knex = ABMigration.connection(),
			application,
			languages = [],
			columns = {},
			objectData = {};

		return Promise.resolve()

			// Find app in database
			.then(function () {

				return new Promise((resolve, reject) => {

					ABApplication.find({ id: appID })
						.exec(function (err, list) {
							if (err) {
								reject(err);
							}
							else if (!list || !list[0]) {
								reject(new Error('application not found: ' + appID));
							}
							else {
								application = list[0];
								resolve();
							}
						});

				});
			})

			// Find site languages
			.then(function () {

				return new Promise((resolve, reject) => {

					SiteMultilingualLanguage.find()
						.exec((err, list) => {
							if (err) reject(err);
							else if (!list || !list[0]) {
								languages = ['en'];
								resolve();
							}
							else {
								list.forEach((lang) => {
									languages.push(lang.language_code);
								});
								resolve();
							}
						});

				});

			})

			// Prepare object
			.then(function () {

				return new Promise((resolve, reject) => {

					objectData = {
						id: uuid(),
						name: tableName,
						tableName: tableName,
						labelFormat: "",
						isExternal: 1,
						translations: [],
						objectWorkspace: {
							hiddenFields: []
						},
						fields: []
					};

					// Add label translations
					let tableLabel = tableName.replace(/_/g, ' ');
					languages.forEach((langCode) => {
						objectData.translations.push({
							language_code: langCode,
							label: tableLabel
						});
					});

					resolve();


				});

			})

			// Pull column infos
			.then(function () {

				return new Promise((resolve, reject) => {

					ABExternal.getColumns(tableName)
						.catch(reject)
						.then(data => {

							columns = data;
							resolve();
						});

				});

			})

			// Prepare object fields
			.then(function () {

				return new Promise((resolve, reject) => {

					Object.keys(columns).forEach(colName => {

						var col = columns[colName];

						if (!col.supported || 
							ABFieldBase.reservedNames.indexOf(colName) > -1) return;

						// Clone the reference defaults for this type
						let colData = _.cloneDeep(mysqlTypeToABFields[col.type]);
						// Populate with imported values
						colData.id = uuid.v4();
						colData.columnName = colName;
						colData.settings.isImported = true;
						colData.settings.showIcon = 1;

						let inputCol = columnList.filter(enterCol => enterCol.name == colName)[0];

						// Add a hidden field
						if (inputCol && JSON.parse(inputCol.isHidden || false)) {
							objectData.objectWorkspace.hiddenFields.push(colData.id);
						}

						// Label of the column
						let colLabel = inputCol ? inputCol.label : colName;

						// Label translations
						colData.translations = [];
						languages.forEach((langCode) => {
							colData.translations.push({
								language_code: langCode,
								label: colLabel
							});
						});

						objectData.fields.push(colData);

					});

					resolve();

				});

			})

			// Create column associations in database
			.then(function () {

				return new Promise((resolve, reject) => {
					// TODO
					resolve();
				});

			})

			// Save to database
			.then(function () {

				return new Promise((resolve, reject) => {

					application.json.objects = application.json.objects || [];
					application.json.objects.push(objectData);

					ABApplication.update(
						{ id: appID },
						{ json: application.json }
					).exec((err, updated) => {
						if (err) {
							console.log('ERROR: ', err);
							reject(err);
						}
						else if (!updated || !updated[0]) {
							console.log('ERROR: app not updated');
							reject(new Error('Application not updated'));
						}
						else {
							resolve(objectData);
						}
					});

				});

			});

	}

};