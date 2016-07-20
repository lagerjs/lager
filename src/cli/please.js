#!/usr/bin/env node
'use strict';

// Nice ES6 syntax
// const { Promise, _, icli } = require('@lager/lager/src/lib/lager').import;
const lager = require('@lager/lager/src/lib/lager');
const _ = lager.import._;
const Promise = lager.import.Promise;
const figlet = Promise.promisify(require('figlet'));
figlet.fonts = Promise.promisify(figlet.fonts);

const cheers = {
  'afrikaans': 'Gesondheid',
  'albanian': 'Gëzuar',
  'arabic': 'Fe sahetek',
  'armenian': 'Genatzt',
  'azerbaijani': 'Nuş olsun',
  'bosnian': 'Živjeli',
  'bulgarian': 'Naz-dra-vey',
  'burmese': 'Aung myin par say',
  'catalan': 'Salut',
  'chamorro': 'Biba',
  'chinese': 'gān bēi',
  'croatian': 'Nazdravlje',
  'czech': 'Na zdravi',
  'danish': 'Skål',
  'dutch': 'Proost',
  'english': 'Cheers',
  'estonian': 'Terviseks',
  'filipino': 'Mabuhay',
  'finnish': 'Kippis',
  'french': 'Santé ',
  'french2': 'À la vôtre',
  'galician': 'Salud',
  'german': 'Prost',
  'german2': 'Zum wohl',
  'greek': 'Yamas',
  'hawaiian': 'Okole maluna',
  'hebrew': 'L\'chaim',
  'hungarian': 'Egészségedre',
  'hungarian2': 'Fenékig',
  'icelandic': 'Skál',
  'irish Gaelic': 'Sláinte',
  'italian': 'Salute',
  'italian2': 'Cin cin',
  'japanese': 'Kanpai',
  'korean': 'Gun bae',
  'latvian': 'Priekā',
  'latvian2': 'Prosit',
  'lithuanian': 'į sveikatą',
  'norwegian': 'Skål',
  'polish': 'Na zdrowie',
  'portuguese': 'Saúde',
  'romanian': 'Noroc',
  'romanian2': 'Sanatate',
  'russian': 'Budem zdorovi',
  'russian2': 'Na zdorovie',
  'serbian': 'živeli',
  'slovak': 'Na zdravie',
  'slovenian': 'Na zdravje',
  'spanish': 'Salud',
  'swedish': 'Skål',
  'thai': 'Chok dee',
  'turkish': 'Serefe',
  'ukranian': 'Boodmo',
  'vietnamese': 'Môt hai ba, yo',
  'welsh': 'Iechyd da',
  'yiddish': 'Sei gesund',
};

const latinFonts = ['Big', 'Slant', 'Small', 'Small Slant', 'Standard', 'Block', 'Def Leppard', 'Efti Font', 'Efti Italic',
               'Georgi16', 'Georgia11', 'Lean', 'Mini', 'Mirror', 'Mnemonic', 'Script', 'Shadow', 'Wavy'];

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {
  // Build the lists of choices
  return getChoices()
  .then(choicesLists => {
    const config = {
      section: 'Core plugin',
      cmd: 'please',
      description: 'create a new project',
      options: { noHelp: true },
      parameters: [{
        cmdSpec: '--language <language>',
        type: 'list',
        choices: choicesLists.language
      }, {
        cmdSpec: '--font <font name>',
        type: 'list',
        choices: choicesLists.font
      }]
    };

    /**
     * Create the command and the prompt
     */
    return icli.createSubCommand(config, executeCommand);
  });

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @param {Array} endpoints - the list o available endpoint specifications
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return figlet.fonts()
    .then(font => {
      return {
        font,
        language: _.keys(cheers)
      };
    });
  }

  /**
   * Create the new project
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    let word = parameters.language ? cheers[parameters.language] : _.sample(cheers);
    figlet.fonts()
    .then(fonts => {
      const font = parameters.font ? parameters.font : _.sample(fonts);
      if (latinFonts.indexOf(font) === -1) { word = _.deburr(word); }
      return figlet(word, { font });
    })
    .then(cheers => {
      const b = txt => { return icli.format.custom(txt, '\x1b[93m'); };
      const m = txt => { return icli.format.custom(txt, '\x1b[1m'); };
      const beer = ['',
        m('    ,~~~,,`´´°°,,,~~~°°~`´´~°°o,         '),
        m('   ( °      °        °      °°  )        '),
        m('  (    °    °)          (     °  )       '),
        m(' (      )          °°  (       ,)°       '),
        m(' (  °    ),,,,,°°o,,,O°°~,~,,,,)         '),
        m('  (    )°') + '°)°  °( °  )  °°( ° )°|         ',
        m('   o') + '|' + m('°') + '( ° ) °  ( ° o) ° °(   ) |         ',
        '    |o(°°°)°°oo(~o~~)~O°°(°°°)¨|         ',
        '    |' + b(' (   ) °  ( °  )    (   ) ') + '|___      ',
        '    |' + b(' (   )    (°   )    (   )°') + '    `\\    ',
        '    |' + b(' (   )  ° ( °  )    (   ) ') + ' __   \\   ',
        '    |' + b(' (   )  ° (°   )    ( ° ) ') + '|  `\\  \\  ',
        '    |' + b(' (   ) °  (    )    (   ) ') + '|    \\  \\ ',
        '    |' + b(' (   )    (°   )    (   ) ') + '|    )  ) ',
        '    |' + b(' (   )  ° ( °  )    (   ) ') + '|    )  ) ',
        '    |' + b(' (   )  ° ( °  )  ° (   ) ') + '|    )  ) ',
        '    |' + b(' (°  ) °  ( °  )    (   ) ') + '|    )  ) ',
        '    |' + b(' (   ) °  (°   )    (   ) ') + '|    /  / ',
        '    |' + b(' (   )  ° (    )    (   ) ') + '|__,/  /  ',
        '    |' + b(' (   ) °  ( °  )    (   ) ') + '      /   ',
        '    |' + b(' (   ) °  (°   )  ° (   ) ') + ' ___,/    ',
        '    |' + b(' (   )  ° (°   )  ° (   ) ') + '|         ',
        '    |' + b(' (   )  ° ( °  )    (  °) ') + '|         ',
        '    |' + b('°(   )  ° ( °  )    (   ) ') + '|         ',
        '    |' + b('  ¨¨¨  °  `~~~~´     ¨¨¨  ') + '|         ',
        '    l__' + b('     °   °            ') + '__j         ',
        'ah     ````¨¨¨^~~~~~~^¨¨¨´´´´            ',
        ''
      ];
      cheers = cheers.split('\n');
      const top = Math.round((beer.length - cheers.length) / 2);
      for (let i = 0; i < cheers.length; i++) {
        beer[top + i + 1] += '   ' + cheers[i];
      }
      console.log(beer.join('\n'));
    });
  }

};
