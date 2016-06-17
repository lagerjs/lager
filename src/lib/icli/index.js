'use strict';

const _ = require('lodash');

/**
 * Private variable to store commander instance
 */
let program;

/**
 * Private variable to store inquirer instance
 */
let prompt;

/**
 * Interactive Command Line Interface
 * @type {Object}
 */
const icli = {

  /**
   * Colorize a portion of text
   * @type {Object}
   */
  format: {
    cmd:     msg => { return icli.format.custom(msg, '\x1b[33m'); }, // Yellow
    info:    msg => { return icli.format.custom(msg, '\x1b[36m'); }, // Cyan
    error:   msg => { return icli.format.custom(msg, '\x1b[31m'); }, // Red
    success: msg => { return icli.format.custom(msg, '\x1b[32m'); }, // Green
    custom: (msg, code) => { return code + msg + '\x1b[0m'; },
    // aliases
    ko: msg => { return icli.format.error(msg); },
    ok: msg => { return icli.format.success(msg); },
  },

  /**
   * Commander instance setter
   * @param {Object} p - commander instance
   * @return {Object} - the icli instance
   */
  setProgram(p) {
    program = p;
    return this;
  },

  /**
   * Inquirer instance setter
   * @param {Object} p - inquirer instance
   * @return {Object} - the icli instance
   */
  setPrompt(p) {
    prompt = p;
    return this;
  },

  /**
   * Create a new interactive command
   * @param  {Object} config - a configuration object
   * @param  {function} executeCommand - callback processing the property values once defined by the command line and the prompt
   * @return {void}
   */
  createSubCommand(config, executeCommand) {
    // create the command
    const cmd = program.command(config.cmd);
    cmd.description(config.description);

    // Extract commander arguments and options from the list of parameters
    // Also enrich parameter configs with a name calculated from "cmdSpec"
    // ES6 syntax:
    //   const { args, options } = parseParameters(config.parameters);
    const tmp = parseParameters(config.parameters);
    const args = tmp.args;
    const options = tmp.options;

    // Add command arguments
    if (args.length) {
      cmd.arguments(args.join(' '));
    }
    // Add command options
    _.forEach(options, option => {
      cmd.option(
        option.flags,
        option.description,
        option.coercion
      );
    });

    cmd.action(getAction(config.parameters, executeCommand, config.commanderActionHook, config.inquirerPromptHook));
  },


  /**
   * Generate a function that check if an item belongs to a list
   * @param  {Array} list - the list of available values
   * @param  {string} label - a label to identify the type of the list items (used in error messages)
   * @return {function} - a validation function
   */
  generateListValidation(list, label) {
    return function listValidation(providedValues) {
      // If the parameter is not a list of value, we create it
      if (!_.isArray(providedValues)) { providedValues = [providedValues]; }

      // Normalize the list if some items a object { value, label }
      const availableValues = _.map(list, item => { return item.value || item; });

      const errorMessages = [];
      _.forEach(providedValues, providedValue => {
        if (_.indexOf(availableValues, providedValue) === -1) {
          let help = 'available value: ' + icli.format.info(availableValues[0]);
          if (availableValues.length > 1) {
            help = 'available values: ' + _.map(availableValues, icli.format.info).join(', ');
          }
          errorMessages.push(icli.format.ko(providedValue) + ' is not a valid ' + label + ' - ' + help);
        }
      });
      if (errorMessages.length > 0) {
        return errorMessages;
      }
      return true;
    };
  }
};

module.exports = icli;


/**
 * Calculate parameter names and add a "validate" property if needed
 * Return the list of commander arguments and the list of commander options
 * @param  {Array} parameters - a list of parameter configurations
 * @return {Object} - an object containing the list of arguments and the list of options
 */
function parseParameters(parameters) {
  const args = [];
  const options = [];

  // Extract options and arguments
  // Enrich parameter configs with a name calculated from "cmdSpec"
  // Create automatic validators
  _.forEach(parameters, parameter => {
    if (_.startsWith(parameter.cmdSpec, '-')) {
      // Case the parameter is an option
      options.push(parseOptionSpec(parameter));
    } else {
      // case the parameter is an argument
      args.push(parseArgumentSpec(parameter));
    }

    // Automaticaly add validators
    // If the parameter configuration already has a validator, we do not override it
    if (!parameter.validate) {
      // We create validators for all "list" and "checkbox" parameters
      if (['list', 'checkbox'].indexOf(parameter.type) !== -1) {
        // We automatically add a validator to list and checkbox parameters
        parameter.validate = icli.generateListValidation(parameter.choices, parameter.validationMsgLabel);
      }
    }
  });

  return { args, options };
}

/**
 * Parse a parameter of type "option" to calculate the name and generate the commander option
 * @param  {Object} parameter - a parameter definition that will be enriched with a correct name
 * @return {Object} - the properties of the commander option
 */
function parseOptionSpec(parameter) {
  // @see https://github.com/tj/commander.js/blob/33751b444a578259a7e37a0971d757452de3f228/index.js#L44-L46
  const flags = parameter.cmdSpec.split(/[ ,|]+/);
  if (flags.length > 1 && !/^[[<]/.test(flags[1])) { flags.shift(); }
  parameter.name = _.camelCase(flags.shift());
  return {
    flags: parameter.cmdSpec,
    description: parameter.description,
    coercion: parameter.coercion || getCoercionForType(parameter.type)
  };
}

/**
 * Parse a parameter of type "argument" to calculate the name and generate the commander option
 * @param  {Object} parameter - a parameter definition that will be enriched with a correct name
 * @return {Object} - a commander argument
 */
function parseArgumentSpec(parameter) {
  parameter.name = _.camelCase(parameter.cmdSpec);
  return parameter.cmdSpec;
}

/**
 * Get default coercion for a parameter type
 * @param  {string} type - a parameter type
 * @return {function|null} - the coercion function to applu to the command line argument/option
 */
function getCoercionForType(type) {
  switch (type) {
  case 'int':
    return parseInt;
  case 'checkbox':
    return val => { return _.map(val.split(','), _.trim); };
  default:
    return null;
  }
}

/**
 * Construct the action() function passed to commander
 * @param  {Array} parameters - the list of parameters
 * @param  {function} executeCommand - the function that perform the interactive command task with property values
 * @param  {function} commanderActionHook - a hook fuction that allows to alter the result of the command arguments/options
 * @param  {function} inquirerPromptHook - a hook fuction that allows to alter the result of the questions
 * @return {function} - The function that must be passed to cmd.action()
 */
function getAction(parameters, executeCommand, commanderActionHook, inquirerPromptHook) {
  return function action() {
    // Hook that allows to tranform the result of the commander parsing, before converting it into parameter values
    const args = commanderActionHook ? commanderActionHook.apply(this, arguments) : arguments;
    const validations = _.reduce(parameters, (result, parameter) => {
      if (parameter.validate) {
        result[parameter.name] = parameter.validate;
      }
      return result;
    }, {});
    const commandParameterValues = processCliArgs(args, validations);

    // If the cli arguments are correct, we can prepare the questions for the interactive prompt
    // Launch the interactive prompt
    return prompt.prompt(parametersToQuestions(parameters, commandParameterValues))
    .then(answers => {
      // Hook that allows to tranform the result of the inquirer prompt, before converting it into parameter values
      if (inquirerPromptHook) {
        return inquirerPromptHook(answers, commandParameterValues);
      }
      // Once we have all parameter values from the command and from the questions, we can execute the command
      _.forEach(answers, (value, key) => {
        if (!commandParameterValues[key] && answers[key]) {
          commandParameterValues[key] = answers[key];
        }
      });
      executeCommand(commandParameterValues);
    });
  };
}

/**
 * Transform the parameters of commander action() callback into a list of parameter values
 * and apply validations
 * @param  {Object} cliArgs - "arguments" object passed to the method action()
 * @param  {Object} validators - map of parameterKey / validation function
 * @return void
 */
function processCliArgs(cliArgs, validations) {
  // Initialize an object that will contain the final parameters (cli + prompt)
  const parameters = cliArgsToParameters(cliArgs);
  validations = validations || [];

  // We verify that arguments provided in the command are correct
  // For example, check if the provided api-identifier does really exist
  // If an argument is a comma separated list, we could also transform it into an Array here
  const validationResult = validateParameters(parameters, validations);
  if (validationResult !== true) {
    console.log('\n  ' + icli.format.ko('error') + ':\n    ' + validationResult.join('\n    ') + '\n');
    process.exit(1);
  }
  return parameters;
}

/**
 * Verify and transform cli args into parameters
 * @param  {Object} cliArgs - arguments and options that have been passed to the cli
 * @return {Object} - parameter values
 */
function cliArgsToParameters(cliArgs) {
  // Initialize an object that will contain the final parameters (cli + prompt)
  const parameters = {};

  const options = Array.prototype.pop.call(cliArgs);
  // Convert cli arguments to parameters
  _.forEach(options._args, (argsDefinition, i) => {
    parameters[_.camelCase(argsDefinition.name)] = cliArgs[i];
  });
  // Convert cli options to parameters
  _.forEach(options.options, option => {
    const key = _.camelCase(option.long);
    parameters[key] = options[key];
  });
  return parameters;
}

/**
 * Validate a list of parameter values
 * Used to validate parameters passed to the command before preparing prompt questions
 * @param  {Object} parameters - parameters that have been passed to the cli
 * @param  {Object} validations - validation functions
 * @return {Array|bool} - true if all validations passed, or else an array of error messages
 */
function validateParameters(parameters, validations) {
  let messages = [];
  _.forEach(parameters, (value, key) => {
    if (value && validations[key] ) {
      const validation = validations[key](value);
      if (validation !== true) {
        messages = _.concat(messages, validation);
      }
    }
  });
  return messages.length ? messages : true;
}

/**
 * Transform a list of parameter configurations into a list of inquirer questions
 * @param  {Array} parameters - a list of parameter configurations
 * @param  {Object} cmdParameterValues - the parameter values that have been set by the command
 * @return {Array} - a list of inquirer questions
 */
function parametersToQuestions(parameters, cmdParameterValues) {
  const questions = [];
  _.forEach(parameters, parameter => {
    // the question parameter is already an inquirer question
    const question = parameter.question;

    // But we can extend it with data that comes from the parameter configuration
    question.type = question.type || parameter.type;
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
