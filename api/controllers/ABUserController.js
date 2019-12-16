/**
 * ABUserController
 *
 * @description :: Server-side logic for managing Abobjects
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	// REST API: /app_builder/abuser
	_config: {
		model: "siteuser", // all lowercase model name
		//       actions: true,
		//       shortcuts: true,
		rest: true
	},

	// GET: /app_builder/user/roles
	getRoles: function (req, res) {
		Permissions.getUserRoles(req, true)
			.fail(function (err) { res.AD.error(err); })
			.then(function (result) { res.AD.success(result); });
	},

	// GET: /app_builder/user/list
	getUserList: function (req, res) {

		ABUser.find({}, {
			select: [
				'username',
				'image_id'
			]
		})
			.fail(function (err) { res.AD.error(err); })
			.then(function (result) {
				res.AD.success(result || []);
			});

	}

};