
steal(
	// List your Controller's dependencies here:
	'opstools/BuildApp/controllers/ObjectList.js',
	'opstools/BuildApp/controllers/ObjectWorkspace.js',

	'opstools/BuildApp/controllers/utils/ModelCreator.js',

	'opstools/BuildApp/models/ABColumn.js',
	'opstools/BuildApp/models/ABList.js',

	function () {
		System.import('appdev').then(function () {
			steal.import('appdev/ad',
				'appdev/control/control').then(function () {

					// Namespacing conventions:
					// AD.Control.extend('[application].[controller]', [{ static },] {instance} );
					AD.Control.extend('opstools.BuildApp.ObjectPage', {


						init: function (element, options) {
							var self = this;
							options = AD.defaults({
								selectedObjectEvent: 'AB_Object.Selected',
								createdObjectEvent: 'AB_Object.Created',
								updatedObjectEvent: 'AB_Object.Updated',
								deletedObjectEvent: 'AB_Object.Deleted'
							}, options);
							this.options = options;

							// Call parent init
							this._super(element, options);

							this.Model = {
								ABColumn: AD.Model.get('opstools.BuildApp.ABColumn'),
								ABList: AD.Model.get('opstools.BuildApp.ABList')
							};

							this.data = {};

							this.initControllers();
							this.initWebixUI();
							this.initEvents();
						},

						initControllers: function () {
							var self = this;
							self.controllers = {};

							var ObjectList = AD.Control.get('opstools.BuildApp.ObjectList'),
								ObjectWorkspace = AD.Control.get('opstools.BuildApp.ObjectWorkspace'),
								ModelCreator = AD.Control.get('opstools.BuildApp.ModelCreator');

							self.controllers.ObjectList = new ObjectList(self.element, {
								selectedObjectEvent: self.options.selectedObjectEvent,
								updatedObjectEvent: self.options.updatedObjectEvent,
								deletedObjectEvent: self.options.deletedObjectEvent
							});
							self.controllers.ObjectWorkspace = new ObjectWorkspace(self.element);
							self.controllers.ModelCreator = new ModelCreator(self.element);
						},

						initWebixUI: function () {
							var self = this;

							var objectListUI = self.controllers.ObjectList.getUIDefinition();
							var objectWorkspaceUI = self.controllers.ObjectWorkspace.getUIDefinition();

							self.data.definition = {
								id: self.options.objectView,
								cols: [
									objectListUI,
									{ view: "resizer", autoheight: true },
									objectWorkspaceUI
								]
							};

						},

						initEvents: function () {
							var self = this;

							self.controllers.ObjectList.on(self.options.selectedObjectEvent, function (event, id) {
								var curObj = AD.classes.AppBuilder.currApp.objects.filter(function (obj) { return obj.id == id });
								if (curObj && curObj.length > 0)
									AD.classes.AppBuilder.currApp.currObj = curObj[0];

								self.controllers.ObjectWorkspace.showTable();
							});

							self.controllers.ObjectList.on(self.options.deletedObjectEvent, function (event, data) {
								// Clear cache
								self.controllers.ObjectWorkspace.deleteObject(data.object);
							});
						},

						getUIDefinition: function () {
							return this.data.definition;
						},

						webix_ready: function () {
							var self = this;

							self.controllers.ObjectList.webix_ready();
							self.controllers.ObjectWorkspace.webix_ready();
						},

						refresh: function () {
							var self = this;

							self.controllers.ObjectList.resetState();
							self.controllers.ObjectList.refreshObjectList();
							self.controllers.ObjectList.refreshUnsyncNumber();

							self.controllers.ObjectWorkspace.resetState();
							self.controllers.ObjectWorkspace.showTable();
						},

						syncObjectFields: function () {
							var self = this,
								q = $.Deferred();

							if (AD.classes.AppBuilder.currApp.objects.length > 0) {
								async.eachSeries(AD.classes.AppBuilder.currApp.objects.attr(), function (object, next) {
									async.waterfall([
										function (cb) {
											// Get object model
											self.controllers.ModelCreator.getModel(object.name)
												.fail(function (err) { cb(err); })
												.then(function (objectModel) {
													cb(null, objectModel);
												});
										},
										function (objectModel, cb) {
											// Get cached fields
											var newFields = objectModel.Cached.getNewFields();

											newFields.sort(function (a, b) { return a.weight - b.weight; });

											if (!newFields || newFields.length < 1) {
												cb();
											}
											else {
												var saveFieldsTasks = [];

												newFields.forEach(function (field, index) {
													saveFieldsTasks.push(function (callback) {
														var tempId = field.id;
														delete field.id;

														field.weight = object.columns.length + (index + 1);

														async.waterfall([
															// Create object column
															function (ok) {
																self.Model.ABColumn.create(field)
																	.fail(ok)
																	.then(function (result) {
																		// Delete field cache
																		objectModel.Cached.deleteCachedField(tempId);

																		ok(null, result);
																	});
															},
															// Create link column
															function (column, ok) {
																if (field.linkObject && field.linkVia) {
																	self.createLinkColumn(field.linkObject, field.linkVia, column.id)
																		.fail(ok)
																		.then(function (linkCol) {
																			// set linkVia
																			column.attr('linkVia', linkCol.id);
																			column.save()
																				.fail(function (err) { ok(err) })
																				.then(function (result) {
																					ok(null, result);
																				});
																		});
																}
																else {
																	ok(null, column);
																}
															},
															// Create list option of select column
															function (column, ok) {
																if (field.setting.editor === 'richselect' && field.setting.filter_options) {
																	var createOptionEvents = [];

																	field.setting.filter_options.forEach(function (opt, index) {
																		createOptionEvents.push(function (createOk) {
																			var list_key = self.Model.ABList.getKey(object.application.name, object.name, column.name);

																			self.Model.ABList.create({
																				key: list_key,
																				weight: index + 1,
																				column: column.id,
																				label: opt,
																				value: opt
																			})
																				.fail(createOk)
																				.then(function () { createOk(); });
																		});
																	});

																	async.parallel(createOptionEvents, ok);
																}
																else {
																	ok();
																}
															}
														], callback);
													});
												});

												async.parallel(saveFieldsTasks, cb);
											}
										}
									], next);
								}, function (err) {
									if (err) {
										q.reject(err);
										return;
									}

									q.resolve();
								});
							}
							else {
								q.resolve();
							}

							return q;
						},

						syncData: function () {
							var q = $.Deferred(),
								self = this;

							if (!AD.classes.AppBuilder.currApp.objects || AD.classes.AppBuilder.currApp.objects.length < 1) {
								q.resolve();
								return q;
							}

							var syncDataTasks = [];

							AD.classes.AppBuilder.currApp.objects.forEach(function (object) {
								syncDataTasks.push(function (next) {

									async.waterfall([
										function (cb) {
											self.controllers.ModelCreator.getModel(object.name)
												.fail(function (err) { cb(err); })
												.then(function (objectModel) {
													cb(null, objectModel);
												});
										},
										function (objectModel, cb) {
											objectModel.Cached.syncDataToServer()
												.fail(function (err) { cb(err); })
												.then(function () {
													cb(null);
													next();
												});
										}
									]);

								});
							});

							async.parallel(syncDataTasks, function (err) {
								if (err) {
									q.reject(err);
									return;
								}

								q.resolve();
							});

							return q;
						},

						createLinkColumn: function (linkObject, linkVia, linkColumnId) {
							var q = $.Deferred(),
								self = this;

							// Find link object
							var linkObj = AD.classes.AppBuilder.currApp.objects.filter(function (obj) { return obj.id == linkObject })[0];

							// Get object model
							self.controllers.ModelCreator.getModel(linkObj.name)
								.fail(function (err) { ok(err); })
								.then(function (objModel) {
									// Get cache
									var cachedFields = objModel.Cached.getNewFields(),
										linkCol = cachedFields.filter(function (f) { return f.id == linkVia; })[0],
										tempId = linkCol.id;

									linkCol.linkVia = linkColumnId;
									linkCol.weight = linkObj.columns.length + Object.keys(cachedFields).indexOf(linkVia) + 1;

									delete linkCol.id;

									// Create
									self.Model.ABColumn.create(linkCol)
										.fail(function (err) { q.reject(err) })
										.then(function (result) {
											objModel.Cached.deleteCachedField(tempId);

											if (result.translate) result.translate();

											q.resolve(result);
										});

								});

							return q;
						},

						resize: function (height) {
							var self = this;

							if ($$(self.options.objectView)) {
								$$(self.options.objectView).define('height', height - 120);
								$$(self.options.objectView).adjust();
							}

							self.controllers.ObjectWorkspace.resize(height);
						}


					});

				});
		});

	});