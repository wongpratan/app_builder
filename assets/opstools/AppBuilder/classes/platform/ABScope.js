const ABScopeCore = require("../core/ABScopeCore");

module.exports = class ABScope extends ABScopeCore {

	constructor(values, application) {

		super(values, application);

	}

	fromValues(values) {

		super.fromValues(values);

		// multilingual fields: name, description
		OP.Multilingual.translate(this, this, ['name', 'description']);

	}

	toObj() {

		OP.Multilingual.unTranslate(this, this, ['name', 'description']);

		var result = super.toObj();
		return result;

	}

	save() {

		return this.application.scopeSave(this);

	}

	destroy() {

		return this.application.scopeDestroy(this);

	}

};