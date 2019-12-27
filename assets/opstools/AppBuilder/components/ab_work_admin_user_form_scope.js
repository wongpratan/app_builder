const ABComponent = require("app_builder/assets/opstools/AppBuilder/classes/platform/ABComponent");

module.exports = class AB_Work_Admin_User_Form_Scope extends ABComponent {

	constructor(App) {
		super(App, 'ab_work_admin_user_form_scope');

		let L = this.Label;

		let ids = {
			list: this.unique('list')
		};

		let CurrentApplication;

		this._scopeDC = new webix.DataCollection();

		// Our webix UI definition:
		this.ui = {
			rows: [
				{ template: `<span class='fa fa-street-view'></span> ${L("ab.admin.userScope", "*Scopes")}`, type: "header" },
				{
					view: 'list',
					id: ids.list,
					select: false,
					template: '#name# <div class="remove fa fa-trash" style="float: right; margin-top: 8px;"></div>',
					onClick: {
						"remove": function (ev, id) {
							_logic.remove(id);
							return false;
						}
					}
				}
			]
		};


		// Our init() function for setting up our UI
		this.init = (userDC) => {

			this._userDC = userDC;

			if ($$(ids.list)) {
				webix.extend($$(ids.list), webix.ProgressBar);

				$$(ids.list).data.sync(this._scopeDC);
			}

		};


		// our internal business logic
		let _logic = {

			applicationLoad: (application) => {

				CurrentApplication = application;

			},

			show: () => {

				_logic.busy();

				if (!this._userDC) {
					_logic.ready();
					return;
				}

				let currUserId = this._userDC.getCursor();
				let currUser = this._userDC.getItem(currUserId);
				if (!currUser) {
					_logic.ready();
					return;
				}

				CurrentApplication.scopeOfUser(currUser.username)
					.catch(err => {
						console.error(err);
						_logic.ready();
					})
					.then((data) => {

						this._scopeDC.clearAll();
						this._scopeDC.parse(data || []);
						_logic.ready();

					});

			},

			remove: (scopeId) => {

				OP.Dialog.Confirm({
					title: L('ab.scope.removeTitle', '*Remove scope'),
					message: L('ab.scope.removeDescription', '*Do you want to remove this scope from user?'),
					callback: (result) => {

						if (!result)
							return;

						_logic.busy();

						let scope = this._scopeDC.find(s => s.id == scopeId)[0];
						if (!scope) {
							_logic.ready();
							return;
						}

						let currUserId = this._userDC.getCursor();
						let currUser = this._userDC.getItem(currUserId);
						if (!currUser) {
							_logic.ready();
							return;
						}

						scope.removeUser(currUser.username)
							.catch(err => {
								console.error(err);
								_logic.ready();
							})
							.then((data) => {

								this._scopeDC.remove(scopeId);
								_logic.ready();

							});

					}
				})


			},

			busy: () => {

				if ($$(ids.list) &&
					$$(ids.list).showProgress)
					$$(ids.list).showProgress({ type: "icon" });

			},

			ready: () => {

				if ($$(ids.list) &&
					$$(ids.list).hideProgress)
					$$(ids.list).hideProgress();

			},

		};

		// 
		// Define our external interface methods:
		// 
		this.applicationLoad = _logic.applicationLoad;
		this.show = _logic.show;

	}
};