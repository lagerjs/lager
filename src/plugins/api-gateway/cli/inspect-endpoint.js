'use strict';

const lager = require('@lager/lager/lib/lager');
const Promise = lager.getPromise();
const _ = lager.getLodash();
const cliTools = require('@lager/lager/lib/cli-tools');

module.exports = function(program, inquirer) {
  // We have to require the plugin inside the function
  // Otherwise we could have a circular require occuring when Lager is registering it
  const plugin = lager.getPlugin('api-gateway');

  // First, retrieve possible values for the identifier parameter
  return plugin.loadEndpoints()
  .then(endpoints => {
    // Build the list of available resource paths and lists of available HTTP methods for each resource path
    const choicesLists = _.reduce(endpoints, (choicesLists, endpoint) => {
      const resourcePath = endpoint.getResourcePath();
      const httpMethod = endpoint.getMethod();
      if (choicesLists.resourcePath.indexOf(resourcePath) === -1) {
        choicesLists.resourcePath.push(resourcePath);
        choicesLists.httpMethod[resourcePath] = [];
      }
      if (choicesLists.httpMethod[resourcePath].indexOf(httpMethod) === -1) {
        choicesLists.httpMethod[resourcePath].push(httpMethod);
      }
      return choicesLists;
    }, { resourcePath: [], httpMethod: [] });
    // Build the list of available specification versions for input verification and interactive selection
    choicesLists.specVersion = [
      { value: 'doc', name: cliTools.format.info('doc') + ' - version of the specification for documentation purpose (Swagger UI, Postman ...)' },
      { value: 'aws', name: cliTools.format.info('aws') + ' - version of the specification used for publication in API Gateway' },
      { value: 'complete', name: cliTools.format.info('complete') + ' - version of the specification containing everything (doc + aws)' }
    ];

    const config = {
      cmd: 'inspect-endpoint',
      description: 'inspect an endpoint specification',
      parameters: [{
        cmdSpec: '[resource-path]',
        type: 'list',
        choices: choicesLists.resourcePath,
        validationMsgLabel: 'resource path',
        question: {
          message: 'What is the resource path of the endpoint that you want to inspect?',
          when: (cliParameters, answers) => { return !cliParameters.resourcePath; }
        }
      }, {
        cmdSpec: '[http-method]',
        type: 'list',
        choices: (answers, cmdParameterValues) => { return choicesLists.httpMethod[answers.resourcePath]; },
        validate: (value, answers, cliParameters) => {
          // We construct a validator based on the value selected for "resourcePath"
          // This validator should not be called with the "answer" parameter, because in the prompt
          // the user will have choosen a value in a list and cannot enter something wrong
          // but we test the "answer" parameter anyway to show an example
          const resourcePath = (answers ? answers.resourcePath : null) || cliParameters.resourcePath;
          const validator = cliTools.generateListValidator(choicesLists.httpMethod[resourcePath], 'http method for the resource path ' + cliTools.format.info(resourcePath));
          return validator(value);
        },
        question: {
          message: 'What is the http method of the endpoint that you want to inspect?',
          when: (cliParameters, answers) => { return !cliParameters.httpMethod; }
        }
      }, {
        cmdSpec: '-c, --colors',
        description: 'output with colors',
        type: 'confirm',
        default: true,
        question: {
          message: 'Do you want to use syntax highlighting?',
          when: (cliParameters, answers) => { return !cliParameters.colors; }
        }
      }, {
        cmdSpec: '-s, --spec-version <version>',
        description: 'select the type of specification to retrieve: doc|aws|complete',
        type: 'list',
        choices: choicesLists.specVersion,
        validationMsgLabel: 'specification version',
        question: {
          message: 'Which version of the specification do ou want to see?',
          when: (cliParameters, answers) => { return !cliParameters.specVersion; }
        }
      }]
    };


    return createCmdAndPrompt(program, inquirer, config, parameters => {
      console.log(parameters);
      return plugin.getEndpointSpec(parameters.httpMethod, parameters.resourcePath, parameters.specVersion, parameters.colors)
      .then(spec => {
        console.log(spec);
      });
    });

    // return createCmdAndPrompt(program, inquirer, config)
    // .then(parameters => {
    //   return plugin.getEndpointSpec(parameters.httpMethod, parameters.resourcePath, parameters.specVersion, parameters.colors);
    // })
    // .then(spec => {
    //   console.log('la bas', spec);
    // });
  });
};



function createCmdAndPrompt(program, inquirer, config, cb) {
  // create the command
  const cmd = program.command(config.cmd);
  cmd.description(config.description);

  // Is used to extract arguments parameters (aka not parameters that are not options)
  const args = [];
  const validators = {};

  // Add options, extracts arguments
  // Enrich parameter configs with a name calculated from "cmdSpec"
  // and create automatic validators
  _.forEach(config.parameters, parameter => {
    if (_.startsWith(parameter.cmdSpec, '-')) {
      // case the parameter is an option
      // We add it to the command
      cmd.option(parameter.cmdSpec, parameter.description);
      // @see https://github.com/tj/commander.js/blob/33751b444a578259a7e37a0971d757452de3f228/index.js#L44-L46
      const flags = parameter.cmdSpec.split(/[ ,|]+/);
      if (flags.length > 1 && !/^[[<]/.test(flags[1])) { flags.shift(); }
      parameter.name = _.camelCase(flags.shift());
    } else {
      // case the parameter is an argument
      args.push(parameter.cmdSpec);
      parameter.name = _.camelCase(parameter.cmdSpec);
    }

    // Automaticaly add validators
    // If the parameter configuration already has a validator, we do not override it
    if (!parameter.validate) {
      // We create validators for all "list" and "checkbox" parameters
      if (['list', 'checkbox'].indexOf(parameter.type) !== -1) {
        // We automatically add a validator to list and checkbox parameters
        parameter.validate = generateListValidation(parameter.choices, parameter.validationMsgLabel);
      }
    }
  });

  // Add command arguments
  if (args.length) {
    cmd.arguments(args.join(' '));
  }


  cmd.action(function () {
    // Hook that allows to tranform the result of the commander parsing, before converting it in parameters
    const args = config.commanderAction ? config.commanderAction.apply(this, arguments) : arguments;
    const cmdParameterValues = cliTools.processCliArgs(args, validators);

    // If the cli arguments are correct, we can prepare the questions for the interactive prompt
    // Launch the interactive prompt
    return inquirer.prompt(parametersToQuestions(config.parameters, cmdParameterValues))
    .then(answers => {
      if (config.afterPrompt) { config.afterPrompt(answers, cmdParameterValues); }

      // Merge the parameters provided in the command and in the prompt
      cb(_.merge(cmdParameterValues, answers));
    });
  });

  // const p = new Promise((resolve, reject) => {
  //   console.log('yo');
  // });
  // return p;
}


function parametersToQuestions(parameters, cmdParameterValues) {
  const questions = [];
  _.forEach(parameters, parameter => {
    // the question parameter is already an inquirer question
    const question = parameter.question;

    // But we can extend it with data that comes from the parameter configuration
    question.type = question.type || parameter.type;
    question.name = question.name || parameter.name;
    if (!question.choices && parameter.choices) {
      if (_.isFunction(parameter.choices)) {
        question.choices = answers => {
          // When defined at the "parameter" level, choices() provide the command parameter values as an extra argument
          return parameter.choices(answers, cmdParameterValues);
        };
      } else {
        question.choices = parameter.choices;
      }
    }
    if (!question.validate && parameter.validate) {
      question.validate = (input, answers) => {
        // When defined at the "parameter" level, validate() provide the command parameter values as an extra argument
        return parameter.validate(input, answers, cmdParameterValues);
      };
    }
    if (!question.when) {
      if (parameter.when) {
        question.when = (answers) => {
          // When defined at the "parameter" level, when() provide the command parameter values as an extra argument
          return parameter.when(answers, cmdParameterValues);
        };
      } else {
        question.when = (answers) => {
          // skip the question if the value have been set in the command and no other when() parameter has been defined
          return !cmdParameterValues[parameter.name];
        };
      }
    }
    questions.push(question);
  });
  return questions;
}



/**
 * Generate a function that check if an item belongs to a list
 * @param  {Array} list - the list of available values
 * @param  {string} label - a label to identify the type of the list items
 * @return {function}
 */
function generateListValidation(list, label) {
  return function(providedValues) {
    // If the parameter is not a list of value, we create it
    if (!_.isArray(providedValues)) { providedValues = [providedValues]; }

    // Normalize the list if some items a object { value, label }
    const availableValues = _.map(list, item => { return item.value || item; });

    const errorMessages = [];
    _.forEach(providedValues, providedValue => {
      if (_.indexOf(availableValues, providedValue) === -1) {
        let help = 'available value: ' + cliTools.format.info(availableValues[0]);
        if (availableValues.length > 1) {
          help = 'available values: ' +  _.map(availableValues, cliTools.format.info).join(', ');
        }
        errorMessages.push(cliTools.format.ko(providedValue) + ' is not a valid ' + label + ' - ' + help);
      }
    });
    if (errorMessages.length > 0) {
      return errorMessages;
    }
    return true;
  };
}
