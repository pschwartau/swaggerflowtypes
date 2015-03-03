#! /usr/bin/env node

var Q = require('q');
var _ = require('underscore');
_.mixin(require('underscore.deep'));

var cliArgs = require('command-line-args');
var fs = require('fs');
var path = require('path');
var request = require('request');



var get = function(url, dataCallback) {
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      dataCallback(JSON.parse(body));
    } else {
      console.log(error);
    }
  });
};

var getAPIModels = function(apiJson) {
  return Q.all(_(apiJson.apis).map(function(api) {
    var deferred = Q.defer();
    get(options.swaggerUrl + api.path, function(data) {
      deferred.resolve(data.models);
    });
    return deferred.promise;
  }));
};

var scalarTypeFunction = function(type) {
  return function() { return type; };
};

// maps schema type to a function that takes a schema
// and returns the string type for the schema.
var jsonSchemaTypeMap = {
  // 'A JSON array.'
  'array': function(array) {
    return 'Array<' + jsonSchemaToFlowObject(array.items) + '>';
  },
  // 'A JSON object.'
  'object': function(object) {
    return JSON.stringify(_(object.properties)
      .chain()
      .map(function(value, key) {
        return [key, jsonSchemaToFlowObject(value)];
      })
      .object()).replace(/,/g, ';');
  },
  'boolean': scalarTypeFunction('boolean'),
  'integer': scalarTypeFunction('number'),
  'number': scalarTypeFunction('number'),
  'null': scalarTypeFunction('void'),
  'string': scalarTypeFunction('string')
};

// returns the string type for the given schema;
var jsonSchemaToFlowObject = function(schema, possibleImports) {
  // return ref if it's used and ok
  if ('$ref' in schema) {
    if (_(possibleImports).contains(schema.$ref)) {
      return schema.$ref;
    } else {
      console.log('invalid schema:' + JSON.stringify(schema), 'no such type available: ' + schema.$ref);
      return 'any';
    }
  }
  // otherwise serialize type
  if (!jsonSchemaTypeMap[schema.type]) {
    console.log('invalid schema:' + JSON.stringify(schema));
  }

  return jsonSchemaTypeMap[schema.type](schema);
};

var outputAPI = function(modelSets) {

  var possibleImports = _(modelSets)
    .chain()
    .map(function(modelSet) {
      return _(modelSet).map(function(value, key) { return key; });
    })
    .flatten()
    .value();

  var models = _(modelSets)
    .chain()
    .map(function(modelSet) {
      return _(modelSet)
        .chain()
        .values()
        .map(function(model) {
          // now we're dealing with the actual model
          var typeObject = _(model.properties)
            .chain()
            .map(function(schema, key) {
              return [key, jsonSchemaToFlowObject(schema, possibleImports)];
            })
            .object()
            .value();
          var classDefinition = JSON.stringify(typeObject)
            .replace(/"/g, '')
            .replace(/:/g, ': ')
            .replace(/,/g, '; ')
            .replace(/}/, ';}');
          var imports = _(_.deepToFlat(model))
            .chain()
            .filter(function(value, key) {
              return /\$ref$/.test(key) &&
                _(possibleImports).contains(value);
            })
            .map(function(name) {
              return 'var ' + name + " = require('./" + name + "');\n";
            })
            .unique()
            .value()
            .join('');

          return imports + '\nclass ' + model.id + ' ' + classDefinition;
        })
        .value();
    })
    .flatten()
    .each(function(typeBody) {
      var typeName = typeBody.match(/class ([^ ]*) {/)[1];
      var outPath = path.join(options.output, typeName + '.js');
      var outputBody = '/* @flow */\n' + typeBody + '\nmodule.exports = ' + typeName + ';\n';
      fs.writeFileSync(outPath, outputBody);
      console.log('wrote to ' + outPath);
    })
    .value();
};

/* define the command-line options */
var cli = cliArgs([
  { name: 'swaggerUrl', type: String, defaultOption: true, description: 'url of your swagger api docs' },
  { name: 'output', type: String, alias: 'o', description: 'directory to place output files' },
  { name: 'help', type: Boolean, description: 'Print usage instructions' },
]);

var options = cli.parse();

if (options.help) {
  var usage = cli.getUsage({
    header: 'Flow type class definitions from Swagger API JSON.',
    footer: 'For more information, visit https://github.com/jackphel/swaggerflowtypes'
  });
  console.log(usage);
} else {
  get(options.swaggerUrl, function (data) {
    getAPIModels(data).then(outputAPI);
  });
}
