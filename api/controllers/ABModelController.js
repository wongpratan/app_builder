/**
 * ABModelController
 *
 * @description :: Server-side logic for managing the data related to a given Object 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var AD = require('ad-utils');
var _ = require('lodash');
var path = require('path');
var async = require('async');
var cJSON = require('circular-json');


const ValidationError = require('objection').ValidationError;


var reloading = null;


function updateRelationValues(query, id, updateRelationParams) {

    var updateTasks = [];

    // NOTE : There is a error when update values and foreign keys at same time
    // - Error: Double call to a write method. You can only call one of the write methods 
    // - (insert, update, patch, delete, relate, unrelate, increment, decrement) and only once per query builder
    if (updateRelationParams != null && Object.keys(updateRelationParams).length > 0) {

        // clear relative values
        Object.keys(updateRelationParams).forEach((colName) => {

            updateTasks.push(() => {

                var clearRelationName = AppBuilder.rules.toFieldRelationFormat(colName);

                return new Promise((resolve, reject) => {

                    query.where('id', id).first()
                        .catch(err => reject(err))
                        .then(record => {

                            if (record == null) return resolve();

                            record.$relatedQuery(clearRelationName).unrelate()
                                .catch(err => reject(err))
                                .then(() => { resolve(); });

                        });

                });


            });


        });


        // update relative values
        Object.keys(updateRelationParams).forEach((colName) => {

            // convert relation data to array
            if (!Array.isArray(updateRelationParams[colName])) {
                updateRelationParams[colName] = [updateRelationParams[colName]];
            }

            // We could not insert many relation values at same time
            // NOTE : Error: batch insert only works with Postgresql
            updateRelationParams[colName].forEach(val => {

                // insert relation values of relation
                updateTasks.push(() => {

                    return new Promise((resolve, reject) => {

                        var relationName = AppBuilder.rules.toFieldRelationFormat(colName);

                        query.where('id', id).first()
                            .catch(err => reject(err))
                            .then(record => {

                                if (record == null) return resolve();

                                record.$relatedQuery(relationName).relate(val)
                                    .catch(err => reject(err))
                                    .then(() => { resolve(); });

                            });
                    });

                });



            });

        });

    }

    return updateTasks;
}


/**
 * @function populateFindConditions
 * Add find conditions and include relation data to Knex.query
 * 
 * @param {Knex.query} query 
 * @param {ABObject} object 
 * @param {Object} options - {
 *                              where : {Array}
 *                              sort :  {Array}
 *                              offset: {Integer}
 *                              limit:  {Integer}
 *                              includeRelativeData: {Boolean}
 *                           }
 * @param {string} userData - {
 *                              username: {string},
 *                              guid: {string},
 *                              languageCode: {string}, - 'en', 'th'
 *                              ...
 *                             }
 */
function populateFindConditions(query, object, options, userData) {

    var where = options.where,
        sort = options.sort,
        offset = options.offset,
        limit = options.limit;

    // Apply filters
    if (!_.isEmpty(where)) {


console.log('', '-----------------');
console.log('WHERE:', JSON.stringify(where, null, 4));
console.log();


/*
        where.forEach(function (w) {

            if (!w.fieldName || !w.operator) return;

            // 1:1 - Get rows that no relation with 
            if (w.operator == 'have no relation') {
                var relation_name = AppBuilder.rules.toFieldRelationFormat(w.fieldName);

                query
                    .leftJoinRelation(relation_name)
                    .whereRaw('{relation_name}.id IS NULL'.replace('{relation_name}', relation_name));

                return;
            }

            // We need to put back together our sql statment
            switch (w.operator) {
                case "contains":
                    var operator = "LIKE";
                    var input = "%" + w.inputValue + "%";
                    break;
                case "doesn't contain":
                    var operator = "NOT LIKE";
                    var input = "%" + w.inputValue + "%";
                    break;
                case "is not":
                    var operator = "!=";
                    var input = w.inputValue;
                    break
                case "is before":
                    var operator = "<";
                    var input = w.inputValue;
                    break;
                case "is after":
                    var operator = ">";
                    var input = w.inputValue;
                    break;
                case "is on or before":
                    var operator = "<=";
                    var input = w.inputValue;
                    break;
                case "is on or after":
                    var operator = ">=";
                    var input = w.inputValue;
                    break;
                case ":":
                    var operator = "=";
                    var input = w.inputValue;
                    break;
                case "≠":
                    var operator = "!=";
                    var input = w.inputValue;
                    break;
                case "<":
                    var operator = "<";
                    var input = w.inputValue;
                    break;
                case ">":
                    var operator = ">";
                    var input = w.inputValue;
                    break;
                case "≤":
                    var operator = "<=";
                    var input = w.inputValue;
                    break;
                case "≥":
                    var operator = ">=";
                    var input = w.inputValue;
                    break;
                case "equals":
                    var operator = "=";
                    var input = w.inputValue;
                    break;
                case "does not equal":
                    var operator = "!=";
                    var input = w.inputValue;
                    break;
                case "is checked":
                    var operator = "=";
                    var input = w.inputValue;
                    break;
                case "is not checked":
                    var operator = "=";
                    var input = w.inputValue;
                    break;
                case "is null":
                    var operator = "IS NULL";
                    var input = null;
                    break;
                case "is not null":
                    var operator = "IS NOT NULL";
                    var input = null;
                    break;
                case "is current user":
                    var operator = "=";
                    var input = userData.username;
                    break;
                case "is not current user":
                    var operator = "!=";
                    var input = userData.username;
                    break;
                default:
                    var operator = "=";
                    var input = w.inputValue;
            }

            // if we are searching a multilingual field it is stored in translations so we need to search JSON
            var field = object._fields.filter(field => field.columnName == w.fieldName)[0];
            if (field && field.settings.supportMultilingual == 1) {
                var fieldName = 'JSON_UNQUOTE(JSON_EXTRACT(JSON_EXTRACT(translations, SUBSTRING(JSON_UNQUOTE(JSON_SEARCH(translations, "one", "' + userData.languageCode + '")), 1, 4)), \'$."' + w.fieldName + '"\'))';
            } else { // If we are just searching a field it is much simpler
                var fieldName = '`' + w.fieldName + '`';
            }

            if (field && field.key == "list" && field.settings && field.settings.options && field.settings.options.filter) {
                // NOTE: Should get 'id' or 'text' from client ??
                var inputID = field.settings.options.filter(option => (option.id == input || option.text == input))[0];
                if (inputID)
                    input = inputID.id;
            }

            // We are going to use the 'raw' queries for knex becuase the '.' for JSON searching is misinterpreted as a sql identifier
            var whereRaw = '{fieldName} {operator} {input}'
                .replace('{fieldName}', fieldName)
                .replace('{operator}', operator)
                .replace('{input}', ((input != null) ? "'" + input + "'" : ''));

            // Now we add in all of our where statements
            if (index == 0) {
                query.whereRaw(whereRaw);
            } else if (w.combineCondition == "Or") {
                query.orWhereRaw(whereRaw);
            } else {
                // the default whereRaw will provide an "AND" if there is already one present
                query.whereRaw(whereRaw);
            }
            index++;
        })
*/

        function parseCondition(condition) {

            // if this is a grouping condition, then decide how to group and 
            // process our sub rules:
            if (condition.glue) {

                var nextCombineKey = 'where';
                if (condition.glue == 'or') {
                    nextCombineKey = 'orWhere';
                }
                condition.rules.forEach((r)=>{

                    query[nextCombineKey]( function() { parseCondition(r); });
                    
                })
                
                return;
            }


            //// Handle a basic rule:
            // { 
            //     key: fieldName,
            //     rule: 'qb_rule',
            //     value: ''
            // }

console.log('... condition:', JSON.stringify(condition, null, 4));

            // We are going to use the 'raw' queries for knex becuase the '.' 
            // for JSON searching is misinterpreted as a sql identifier
            // our basic where statement will be:
             var whereRaw = '{fieldName} {operator} {input}';


            // convert QB Rule to SQL operation:
            var conversionHash = {
                'equals'        : '=',
                'not_equals'    : '<>',
                'is_null'       : 'IS NULL',
                'is_not_null'   : 'IS NOT NULL',
                'is_empty'      : '=',
                'is_not_empty'  : '<>',
                'greater'       : '>',
                'greater_or_equal' : '>=',
                'less'          : '<',
                'less_or_equal' : '<=' 
            }

            // basic case:  simple conversion
            var operator = conversionHash[condition.rule];
            var value = condition.value;
console.log('operator:', operator);
console.log('value:', value);


            // special operation cases:
            switch (condition.rule) {
                case "begins_with":
                    operator = 'LIKE';
                    value = value + '%';
                    break;

                case "not_begins_with":
                    operator = "NOT LIKE";
                    value = value + '%';
                    break;

                case "contains":
                    operator = 'LIKE';
                    value = '%' + value + '%';
                    break;

                case "not_contains":
                    operator = "NOT LIKE";
                    value = '%' + value + '%';
                    break;

                case "ends_with":
                    operator = 'LIKE';
                    value = '%' + value;
                    break;

                case "not_ends_with":
                    operator = "NOT LIKE";
                    value = '%' + value;
                    break;

                case "between": 
                    operator = "BETWEEN";
                    value = condition.value.join(' AND ');
                    break;

                case 'not_between':
                    operator = "NOT BETWEEN";
                    value = condition.value.join(' AND ');
                    break;

                case "is_current_user":
                    var operator = "=";
                    var value = userData.username;
                    break;

                case "is_not_current_user":
                    var operator = "<>";
                    var value = userData.username;
                    break;

            }

console.log('    -> operator:', operator);
console.log('    -> value:', value );

            // normal field name:
            var fieldName = '`' + condition.key + '`';

            // if we are searching a multilingual field it is stored in translations so we need to search JSON
            var field = object._fields.filter(field => field.columnName == condition.key)[0];
            if (field && field.settings.supportMultilingual == 1) {
                fieldName = 'JSON_UNQUOTE(JSON_EXTRACT(JSON_EXTRACT(translations, SUBSTRING(JSON_UNQUOTE(JSON_SEARCH(translations, "one", "' + userData.languageCode + '")), 1, 4)), \'$."' + condition.key + '"\'))';
            } 

            // if this is from a LIST, then make sure our value is the .ID
            if (field && field.key == "list" && field.settings && field.settings.options && field.settings.options.filter) {
                // NOTE: Should get 'id' or 'text' from client ??
                var inputID = field.settings.options.filter(option => (option.id == value || option.text == value))[0];
                if (inputID)
                    value = inputID.id;
            }

console.log('  fieldName:', fieldName);

            // update our where statement:
            whereRaw = whereRaw
                .replace('{fieldName}', fieldName)
                .replace('{operator}', operator)
                .replace('{input}', ((value != null) ? "'" + value + "'" : ''));


            // Now we add in our where
            query.whereRaw(whereRaw);
        }

        parseCondition(where);


    }

    // Apply Sorts
    if (!_.isEmpty(sort)) {
        sort.forEach(function (o) {
            // if we are ordering by a multilingual field it is stored in translations so we need to search JSON but this is different from filters
            // because we are going to sort by the users language not the builder's so the view will be sorted differntly depending on which languageCode
            // you are using but the intent of the sort is maintained
            if (o.isMulti == 1) {
                var by = 'JSON_UNQUOTE(JSON_EXTRACT(JSON_EXTRACT(translations, SUBSTRING(JSON_UNQUOTE(JSON_SEARCH(translations, "one", "' + userData.languageCode + '")), 1, 4)), \'$."' + o.by + '"\'))';
            } else { // If we are just sorting a field it is much simpler
                var by = "`" + o.by + "`";
            }
            query.orderByRaw(by + " " + o.dir);
        })
    }


    // apply any offset/limit if provided.
    if (offset) {
        query.offset(offset);
    }
    if (limit) {
        query.limit(limit);
    }

    // query relation data
    if (options.includeRelativeData) {
        var relationNames = object.connectFields()
            .filter((f) => f.fieldLink() != null)
            .map((f) => f.relationName());

        if (relationNames.length > 0)
            query.eager('[#fieldNames#]'.replace('#fieldNames#', relationNames.join(', ')));
    }

console.log('');
console.log('SQL:', query.toString() );
console.log('');

}



module.exports = {

    create: function (req, res) {


        AppBuilder.routes.verifyAndReturnObject(req, res)
            .then(function (object) {


                var allParams = req.allParams();
                sails.log.verbose('ABModelController.create(): allParams:', allParams);

                // return the parameters from the input params that relate to this object
                var createParams = object.requestParams(allParams);

                // return the parameters of connectObject data field values 
                var updateRelationParams = object.requestRelationParams(allParams);


                var validationErrors = object.isValidData(createParams);
                if (validationErrors.length == 0) {

                    // this is a create operation, so ... 
                    // createParams.created_at = (new Date()).toISOString();
                    createParams.created_at = AppBuilder.rules.toSQLDateTime(new Date());

                    sails.log.verbose('ABModelController.create(): createParams:', createParams);

                    var query = object.model().query();

                    query.insert(createParams)
                        .then((newObj) => {

                            // create a new query to update relation data
                            // NOTE: when use same query, it will have a "created duplicate" error
                            var query2 = object.model().query();
                            var updateTasks = updateRelationValues(query2, newObj.id, updateRelationParams);


                            // update relation values sequentially
                            return updateTasks.reduce((promiseChain, currTask) => {
                                return promiseChain.then(currTask);
                            }, Promise.resolve([]))
                                .catch((err) => { return Promise.reject(err); })
                                .then((values) => {

                                    // Query the new row to response to client
                                    var query3 = object.model().query();
                                    populateFindConditions(query3, object, {
                                        where: {
                                            glue:'and',
                                            rules:[
                                                {
                                                    key: "id",
                                                    rule: "equals",
                                                    vlue: newObj.id
                                                }
                                            ]
                                        },
                                        offset: 0,
                                        limit: 1,
                                        includeRelativeData: true
                                    },
                                    req.user.data);

                                    return query3
                                        .catch((err) => { return Promise.reject(err); })
                                        .then((newItem) => {

                                            res.AD.success(newItem[0]);
                                            Promise.resolve();

                                        });


                                });


                        }, (err) => {

                            // handle invalid values here:
                            if (err instanceof ValidationError) {

                                //// TODO: refactor these invalid data handlers to a common OP.Validation.toErrorResponse(err)

                                // return an invalid values response:
                                var errorResponse = {
                                    error: 'E_VALIDATION',
                                    invalidAttributes: {

                                    }
                                }

                                var attr = errorResponse.invalidAttributes;

                                for (var e in err.data) {
                                    attr[e] = attr[e] || [];
                                    err.data[e].forEach((eObj) => {
                                        eObj.name = e;
                                        attr[e].push(eObj);
                                    })
                                }

                                res.AD.error(errorResponse);
                            }

                        })
                        .catch((err) => {
                            console.log('... catch(err) !');

                            if (!(err instanceof ValidationError)) {
                                ADCore.error.log('Error performing update!', { error: err })
                                res.AD.error(err);
                                sails.log.error('!!!! error:', err);
                            }
                        })



                } else {

                    // return an invalid values response:
                    var errorResponse = {
                        error: 'E_VALIDATION',
                        invalidAttributes: {

                        }
                    }

                    var attr = errorResponse.invalidAttributes;

                    validationErrors.forEach((e) => {
                        attr[e.name] = attr[e.name] || [];
                        attr[e.name].push(e);
                    })

                    res.AD.error(errorResponse);
                }

            })

    },



    /**
     * find
     *
     * get /app_builder/model/application/:appID/object/:objID
     */
    find: function (req, res) {


        AppBuilder.routes.verifyAndReturnObject(req, res)
            .then(function (object) {

                var query = object.model().query();


                var where = req.options._where;
                var sort = req.options._sort;
                var offset = req.options._offset;
                var limit = req.options._limit;

                populateFindConditions(query, object, {
                    where: where,
                    sort: sort,
                    offset: offset,
                    limit: limit,
                    includeRelativeData: true
                },
                req.user.data);

                // promise for the total count. this was moved below the filters because webix will get caught in an infinte loop of queries if you don't pass the right count
                var queryCount = object.model().query();
                populateFindConditions(queryCount, object, { where: where, includeRelativeData: false }, req.user.data);
                // added tableName to id because of non unique field error
                var pCount = queryCount.count('{tableName}.id as count'.replace("{tableName}", object.model().tableName)).first();
                    
                Promise.all([
                    pCount,
                    query
                ]).then(function (values) {
                    var result = {};
                    var count = values[0].count;
                    var rows = values[1];
                    result.data = rows;

                    // webix pagination format:
                    result.total_count = count;
                    result.pos = offset;

                    result.offset = offset;
                    result.limit = limit;

                    if ((offset + rows.length) < count) {
                        result.offset_next = offset + limit;
                    }



                    //// TODO: evaluate if we really need to do this: 
                    //// ?) do we have a data field that actually needs to post process it's data
                    ////    before returning it to the client?

                    // object.postGet(result.data)
                    // .then(()=>{


                    if (res.header) res.header('Content-type', 'application/json');

                    res.send(result, 200);


                    // })


                })
                    .catch((err) => {

                        res.AD.error(err);

                    });


            });

    },


    delete: function (req, res) {

        var id = req.param('id', -1);


        if (id == -1) {
            var invalidError = ADCore.error.fromKey('E_MISSINGPARAM');
            invalidError.details = 'missing .id';
            sails.log.error(invalidError);
            res.AD.error(invalidError, 400);
            return;
        }

        AppBuilder.routes.verifyAndReturnObject(req, res)
            .then(function (object) {


                object.model().query()
                    .deleteById(id)
                    .then((numRows) => {

                        res.AD.success({ numRows: numRows });

                    }, (err) => {

                        // console.log('...  (err) handler!', err);

                        res.AD.error(err);


                    })
                    .catch((err) => {
                        // console.log('... catch(err) !');

                        if (!(err instanceof ValidationError)) {
                            ADCore.error.log('Error performing update!', { error: err })
                            res.AD.error(err);
                            sails.log.error('!!!! error:', err);
                        }
                    })

            })

    },


    update: function (req, res) {

        var id = req.param('id', -1);


        if (id == -1) {
            var invalidError = ADCore.error.fromKey('E_MISSINGPARAM');
            invalidError.details = 'missing .id';
            sails.log.error(invalidError);
            res.AD.error(invalidError, 400);
            return;
        }

        AppBuilder.routes.verifyAndReturnObject(req, res)
            .then(function (object) {


                var allParams = req.allParams();
                sails.log.verbose('ABModelController.update(): allParams:', allParams);

                // return the parameters from the input params that relate to this object
                // exclude connectObject data field values
                var updateParams = object.requestParams(allParams);

                // return the parameters of connectObject data field values 
                var updateRelationParams = object.requestRelationParams(allParams);

                var validationErrors = object.isValidData(updateParams);
                if (validationErrors.length == 0) {

                    // this is an update operation, so ... 
                    // updateParams.updated_at = (new Date()).toISOString();
                    updateParams.updated_at = AppBuilder.rules.toSQLDateTime(new Date());

                    // Check if there are any properties set otherwise let it be...let it be...let it be...yeah let it be
                    if (allParams.properties != "") {
                        updateParams.properties = allParams.properties;
                    } else {
                        updateParams.properties = null;
                    }

                    sails.log.verbose('ABModelController.update(): updateParams:', updateParams);

                    var query = object.model().query();

                    // Do Knex update data tasks
                    query.patch(updateParams || { id: id }).where('id', id)
                        .then((values) => {

                            // create a new query when use same query, then new data are created duplicate
                            var query2 = object.model().query();
                            var updateTasks = updateRelationValues(query2, id, updateRelationParams);

                            // update relation values sequentially
                            return updateTasks.reduce((promiseChain, currTask) => {
                                return promiseChain.then(currTask);
                            }, Promise.resolve([]))
                                .catch((err) => { return Promise.reject(err); })
                                .then((values) => {

                                    // Query the new row to response to client
                                    var query3 = object.model().query();
                                    populateFindConditions(query3, object, {
                                        where: {
                                            glue:'and',
                                            rules:[{
                                                key: "id",
                                                rule: "equals",
                                                value: id
                                            }]
                                        },
                                        offset: 0,
                                        limit: 1,
                                        includeRelativeData: true
                                    },
                                    req.user.data);

                                    return query3
                                        .catch((err) => { return Promise.reject(err); })
                                        .then((newItem) => {
                                            res.AD.success(newItem[0]);
                                            Promise.resolve();
                                        });

                                });

                        }, (err) => {

                            console.log('...  (err) handler!', err);

                            // handle invalid values here:
                            if (err instanceof ValidationError) {

                                //// TODO: refactor these invalid data handlers to a common OP.Validation.toErrorResponse(err)

                                // return an invalid values response:
                                var errorResponse = {
                                    error: 'E_VALIDATION',
                                    invalidAttributes: {

                                    }
                                }

                                var attr = errorResponse.invalidAttributes;

                                for (var e in err.data) {
                                    attr[e] = attr[e] || [];
                                    err.data[e].forEach((eObj) => {
                                        eObj.name = e;
                                        attr[e].push(eObj);
                                    })
                                }

                                res.AD.error(errorResponse);
                            }

                        })
                        .catch((err) => {
                            console.log('... catch(err) !');

                            if (!(err instanceof ValidationError)) {
                                ADCore.error.log('Error performing update!', { error: err })
                                res.AD.error(err);
                                sails.log.error('!!!! error:', err);
                            }
                        })



                } else {

                    // return an invalid values response:
                    var errorResponse = {
                        error: 'E_VALIDATION',
                        invalidAttributes: {

                        }
                    }

                    var attr = errorResponse.invalidAttributes;

                    validationErrors.forEach((e) => {
                        attr[e.name] = attr[e.name] || [];
                        attr[e.name].push(e);
                    })

                    res.AD.error(errorResponse);
                }

            })

    },



    refresh: function (req, res) {

        AppBuilder.routes.verifyAndReturnObject(req, res)
            .then(function (object) {

                object.modelRefresh();

                res.AD.success({});

            });

    }


};