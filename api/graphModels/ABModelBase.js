var path = require('path');
var uuid = require('uuid/v4');

var ABGraphDB = require(path.join('..', 'services', 'ABGraphDB'));


class ABModelBase {

	constructor(attributes) {

		// uuid from ._key to .id
		this.id = attributes._key;

		// ignore default properties of ArangoDB
		let ignoreProps = ['_key', '_id', '_rev'];

		// copy attributes
		attributes = attributes || {};
		for (let key in attributes) {

			if (ignoreProps.indexOf(key) > -1)
				continue;

			this[key] = attributes[key];
		}

	}

	save() {
		return this.constructor.upsert(this.id, this);
	}

	destroy() {
		return this.constructor.remove(this.id);
	}

	relate(relation, linkId) {

		if (typeof relation == 'string')
			relation = this.constructor._getRelation(relation);

		if (relation == null) {
			ADCore.error.log('.relate: No relation found', { node: linkId });
			return Promise.resolve();
		}

		let fromId = (relation.direction == ABModelBase.relateDirection.OUTBOUND ? this.id : linkId),
			toId = (relation.direction == ABModelBase.relateDirection.OUTBOUND ? linkId : this.id);

		return this.constructor.relate(relation, fromId, toId);
	}

	unrelate(relation, linkId) {

		if (typeof relation == 'string')
			relation = this.constructor._getRelation(relation);

		if (relation == null) {
			ADCore.error.log('.unrelate: No relation found', { node: linkId });
			return Promise.resolve();
		}

		let fromId = (relation.direction == ABModelBase.relateDirection.OUTBOUND ? this.id : linkId),
			toId = (relation.direction == ABModelBase.relateDirection.OUTBOUND ? linkId : this.id);

		return this.constructor.unrelate(relation, fromId, toId);
	}

	static get relations() {

		return {
			// relationName: {
			// 	edgeName: "Name of edge collection",
			// 	linkCollection: "Name of link collection",
			// 	direction: Enum of this.relateDirection
			// }
		};
	}

	// Lifecycle
	static beforeCreate(recordToCreate) { return Promise.resolve(); }
	static afterCreate(newlyCreatedRecord) { return Promise.resolve(); }
	static beforeUpdate(valuesToSet) { return Promise.resolve(); }
	static afterUpdate(updatedRecord) { return Promise.resolve(); }
	static beforeDestroy(id) { return Promise.resolve(); }
	static afterDestroy(destroyedRecord) { return Promise.resolve(); }


	static query(aqlCommand, returnArray = true) {

		return Promise.resolve()

			// Execute AQL command
			.then(() => {

				return new Promise((next, err) => {

					let db = ABGraphDB.database();

					db.query(aqlCommand)
						.catch(err)
						.then(cursor => {

							// pass result
							if (cursor && cursor.all) {
								cursor.all()
									.catch(err)
									.then(rows => {
										next(rows);
									});
							}
							else {
								next(null);
							}

						});

				});

			})

			// Return result
			.then(rows => {

				return new Promise((next, err) => {

					// return an Array
					if (returnArray) {

						// Convert to model
						let result = (rows || []).map(r => new this(r));
						next(result);

					}
					// return a Objct
					else {
						let result = (rows || [])[0];
						if (result)
							next(new this(result));
						else
							next(null);
					}


				});

			});

	}

	/**
	 * @method find
	 * 
	 * @param {Object} cond 
	 * @param {Array} relations 
	 * 
	 * @return {Promise}
	 */
	static find(cond, relations = []) {

		// TODO paging, sorting

		let aqlRelations = this._aqlRelations(relations);

		return this.query(`
						FOR row IN ${this.collectionName}
						RETURN MERGE(row, ${aqlRelations})
					`);

	}

	/**
	 * @method findOne
	 * 
	 * @param {uuid} id
	 * @param {Array} relations 
	 * 
	 * @return {Promise}
	 */
	static findOne(id, relations = []) {

		let aqlRelations = this._aqlRelations(relations);

		return this.query(`
						FOR row IN ${this.collectionName}
						FILTER row._key == '${id}'
						LIMIT 1
						RETURN MERGE(row, ${aqlRelations})
					`, false);

	}

	/**
	 * @method findOneSync
	 * 
	 * @param {uuid} id
	 * @param {Array} relations 
	 * 
	 * @return {Object} - A document
	 */
	static findOneSync(id, relations = []) {

		// NOTE: Convert async to sync because .relationMappings of Knex does not support async
		let findOneSync = rpc(this.findOne);

		return findOneSync(id, relations);

	}

	/**
	 * @function insert
	 * 
	 * @param {Object} values 
	 * @return {Promise} - return a new row
	 */
	static insert(values) {

		values = new this(values || {});
		values._key = uuid();

		let newlyCreatedRecord;

		return Promise.resolve()

			// Before create
			.then(() => this.beforeCreate(values))

			// Creating
			.then(() => {

				return new Promise((next, err) => {

					values = JSON.stringify(values);

					this.query(`
								INSERT ${values} INTO ${this.collectionName}
								RETURN NEW
							`, false)
						.catch(err)
						.then(doc => {
							newlyCreatedRecord = doc;
							next();
						});

				});

			})

			// After create
			.then(() => this.afterCreate(newlyCreatedRecord))

			// Return result
			.then(() => Promise.resolve(newlyCreatedRecord));

	}

	/**
	 * @function update
	 * 
	 * @param {string} id 
	 * @param {Object} updates 
	 * @return {Promise} - return a row is updated
	 */
	static update(id, updates) {

		updates = new this(updates || {});

		let updatedRecord;

		return Promise.resolve()

			// Before update
			.then(() => this.beforeUpdate(updates))

			// Updating
			.then(() => {

				return new Promise((next, err) => {

					updates = JSON.stringify(updates);

					this.query(`
							FOR row IN ${this.collectionName}
							FILTER row._key == '${id}'
							UPDATE row WITH ${updates} IN ${this.collectionName}
							RETURN NEW
						`, false)
						.catch(err)
						.then(doc => {
							updatedRecord = doc;
							next();
						});

				});

			})

			// After update
			.then(() => this.afterUpdate(updatedRecord))

			// Return result
			.then(() => Promise.resolve(updatedRecord));

	}

	/**
	 * @function upsert
	 * 
	 * @param {string} id 
	 * @param {Object} updates 
	 * @return {Promise} - return a row is created or updated
	 */
	static upsert(id, updates) {

		let addNew = updates.id == null,
			updatedRecord;

		updates = new this(updates || {});

		if (addNew)
			updates._key = uuid();

		return Promise.resolve()

			// Before create/update
			.then(() => addNew ? this.beforeCreate(updates) : this.beforeUpdate(updates))

			// Creating/Updating
			.then(() => {

				return new Promise((next, err) => {

					updates = JSON.stringify(updates);

					this.query(`
							UPSERT { _key: '${id}' }
							INSERT ${updates}
							UPDATE ${updates}
							IN ${this.collectionName}
							RETURN NEW
					`, false)
						// RETURN { doc: NEW, type: OLD ? 'insert': 'update' }
						.catch(err)
						.then(doc => {
							updatedRecord = doc;
							next();
						});

				});

			})

			// After create/update
			.then(() => addNew ? this.afterCreate(updatedRecord) : this.afterUpdate(updatedRecord))

			// Return result
			.then(() => Promise.resolve(updatedRecord));


	}

	/**
	 * @function remove
	 * 
	 * @param {string} id 
	 * @return {Promise} - return a removed row
	 */
	static remove(id) {

		let destroyedRecord;

		return Promise.resolve()

			// Before remove
			.then(() => this.beforeDestroy(id))

			// Removing
			.then(() => {

				return new Promise((next, err) => {

					this.query(`
							FOR row IN ${this.collectionName}
							FILTER row._key == '${id}'
							REMOVE row IN ${this.collectionName}
							RETURN OLD
						`, false)
						.catch(err)
						.then(doc => {
							destroyedRecord = doc;
							next();
						});

				});

			})

			// Clear relations
			.then(() => {

				if (destroyedRecord == null)
					return Promise.resolve();

				let tasks = [];

				for (let key in this.relations) {

					let rel = this.relations[key];

					tasks.push(this.clearRelate(rel, destroyedRecord.id));
				}

				return Promise.all(tasks);

			})

			// After remove
			.then(() => this.afterDestroy(destroyedRecord))

			// Return result
			.then(() => Promise.resolve(destroyedRecord));

	}

	static get relateDirection() {
		return {
			INBOUND: "INBOUND",
			OUTBOUND: "OUTBOUND"
		}
	}

	/**
	 * @function relate
	 * 
	 * @param {Object} relation - Relation settings
	 * @param {string} fromId - _key of node
	 * @param {string} toId - _key of node
	 * @return {Promise}
	 */
	static relate(relation, fromId, toId) {

		// Get _id of documents
		if (relation.direction == this.relateDirection.OUTBOUND) {
			fromId = this._getId(fromId);
			toId = this._getId(toId, relation.linkCollection);
		}
		else {
			fromId = this._getId(fromId, relation.linkCollection);
			toId = this._getId(toId);
		}

		return this.query(`
						UPSERT { _from: '${fromId}', _to: '${toId}' }
						INSERT { _from: '${fromId}', _to: '${toId}' }
						UPDATE { _from: '${fromId}', _to: '${toId}' }
						IN ${relation.edgeName}
					`);

	}

	/**
	 * @function unrelate
	 * 
	 * @param {Object} relation - Relation settings
	 * @param {string} fromId - _key of node
	 * @param {string} toId - _key of node
	 * @return {Promise}
	 */
	static unrelate(relation, fromId, toId) {

		// Get _id of documents
		if (relation.direction == this.relateDirection.OUTBOUND) {
			fromId = this._getId(fromId);
			toId = this._getId(toId, relation.linkCollection);
		}
		else {
			fromId = this._getId(fromId, relation.linkCollection);
			toId = this._getId(toId);
		}

		return this.query(`
						FOR row IN ${relation.edgeName}
						FILTER row._from == '${fromId}'
						AND row._to == '${toId}'
						REMOVE row IN ${relation.edgeName}
					`);

	}

	/**
	 * @function clearRelate
	 * 
	 * @param {Object} relation - Relation settings
	 * @param {string} key - _key of node
	 * @return {Promise}
	 */
	static clearRelate(relation, key) {

		let id = this._getId(key);

		return this.query(`
						FOR row IN ${relation.edgeName}
						FILTER row._from == '${id}'
						OR row._to == '${id}'
						REMOVE row IN ${relation.edgeName}
					`);

	}

	static collection() {

		let db = ABGraphDB.database();

		return db.collection(this.collectionName);

	}


	/** Private methods */

	/**
	 * @method _aqlRelations
	 * 
	 * @param {Array} relations - Array of relation name (string)
	 * 
	 * @return {string} - AQL command
	 */
	static _aqlRelations(relations = []) {

		let result = {};

		relations.forEach(relationName => {

			let r = this.relations[relationName];

			result[relationName] = `(FOR sub IN 1..1 ${r.direction} row ${r.edgeName} RETURN sub)`;
		});

		let aql = JSON.stringify(result)
			.replace(/"\(/g, "(")
			.replace(/\)"/g, ")");

		return aql;

	}


	/**
	 * @method _getRelation
	 * 
	 * @param {string} relationName - Name of relation
	 * 
	 * @return {Object} - Relation
	 */
	static _getRelation(relationName) {
		return this.relations[relationName];
	}

	/**
	 * @method _getId
	 * return _id format of ArangoDB
	 * 
	 * @param {string} key - key of a document
	 * @param {string} collectionName - [optional]
	 * 
	 * @return {string} - return _id format
	 */
	static _getId(key, collectionName = this.collectionName) {
		return `${collectionName}/${key}`;
	}

}

module.exports = ABModelBase;