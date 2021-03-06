/*
 * OP.Multilingual
 *
 * A set of helpers for Multilingual Data.
 *
 */

export default {
   /**
    * @function defaultTranslations()
    * return an initial .translations entry to initialize the
    * translations values of a given translateable object.
    * @param {array} fields  the multilingual fields this obj manages.
    * @param {json}  values  a default set of values for this object.
    * @return {array}  of translation entries.
    */
   defaultTranslations: function(fields, values) {
      values = values || {};

      var entry = {
         language_code: AD.lang.currentLanguage || "en"
      };

      fields.forEach((f) => {
         entry[f] = values[f] || f;
      });

      return [entry];
   },

   /**
    * @function OP.Multilingual.translate
    *
    * Given a set of json data, pull out any multilingual translations
    * and flatten those values to the base object.
    *
    * @param {obj} obj  The instance of the object being translated
    * @param {json} json The json data being used for translation.
    *						There should be json.translations = [ {transEntry}, ...]
    *						where transEntry = {
    *							language_code:'en',
    *							field1:'value',
    *							...
    *						}
    * @param {array} fields an Array of multilingual fields to pull to
    *						 the obj[field] value.
    *
    */
   translate: function(obj, json, fields, languageCode = null) {
      json = json || {};
      fields = fields || [];

      if (!json.translations) {
         json.translations = [];
      }

      if (typeof json.translations == "string") {
         json.translations = JSON.parse(json.translations);
      }

      var currLanguage = languageCode || AD.lang.currentLanguage || "en";

      if (fields && fields.length > 0) {
         // [fix] if no matching translation is in our json.translations
         // 		 object, then just use the 1st one.
         var first = null; // the first translation entry encountered
         var found = false; // did we find a matching translation?

         json.translations.forEach(function(t) {
            if (!first) first = t;

            // find the translation for the current language code
            if (t.language_code == currLanguage) {
               found = true;

               // copy each field to the root object
               fields.forEach(function(f) {
                  if (t[f] != null) obj[f] = t[f];

                  obj[f] = obj[f] || ""; // default to '' if not found.
               });
            }
         });

         // if !found, then use the 1st entry we did find.  prepend desired
         // [language_code] to each of the fields.
         if (!found && first) {
            // copy each field to the root object
            fields.forEach(function(f) {
               if (first[f] != null && first[f] != "")
                  obj[f] = `[${currLanguage}]${first[f]}`;
               else obj[f] = ""; // default to '' if not found.
            });
         }
      }
   },

   /**
    * @function OP.Multilingual.unTranslate
    *
    * Take the multilingual information in the base obj, and push that
    * down into the json.translations data.
    *
    * @param {obj} obj  The instance of the object with the translation
    * @param {json} json The json data being used for translation.
    *						There should be json.translations = [ {transEntry}, ...]
    *						where transEntry = {
    *							language_code:'en',
    *							field1:'value',
    *							...
    *						}
    * @param {array} fields an Array of multilingual fields to pull from
    *						 the obj[field] value.
    *
    */
   unTranslate: function(obj, json, fields) {
      json = json || {};
      fields = fields || [];

      if (!json.translations) {
         json.translations = [];
      }

      var currLanguage = AD.lang.currentLanguage || "en";

      if (fields && fields.length > 0) {
         var foundOne = false;

         json.translations.forEach(function(t) {
            // find the translation for the current language code
            if (t.language_code == currLanguage) {
               // copy each field to the root object
               fields.forEach(function(f) {
                  // verify obj[f] is defined
                  // --> DONT erase the existing translation
                  if (obj[f] != null) {
                     t[f] = obj[f];
                  }
               });

               foundOne = true;
            }
         });

         // if we didn't update an existing translation
         if (!foundOne) {
            // create a translation entry:
            var trans = {};

            // assume current languageCode:
            trans.language_code = currLanguage;

            fields.forEach(function(field) {
               if (obj[field] != null) {
                  trans[field] = obj[field];
               }
            });

            json.translations.push(trans);
         }
      }
   }
};
