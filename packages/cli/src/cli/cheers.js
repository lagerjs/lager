#!/usr/bin/env node
'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const figlet = Promise.promisify(require('./figlet'));
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
  'french': 'Santé',
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
  'serbian': 'ziveli',
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

const latinFonts = [
  'Big', 'Slant', 'Small', 'Small Slant', 'Standard', 'Block', 'Def Leppard', 'Efti Font', 'Efti Italic',
  'Georgi16', 'Georgia11', 'Lean', 'Mini', 'Mirror', 'Mnemonic', 'Script', 'Shadow', 'Wavy'
];

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli) => {
  // Build the lists of choices
  const choicesLists = getChoices();

  const config = {
    section: 'CLI core',
    cmd: 'cheers',
    description: 'Have a beer! You deserve it',
    options: { noHelp: true },
    parameters: [{
      cmdSpec: '-l, --language <language>',
      type: 'list',
      choices: choicesLists.language
    }, {
      cmdSpec: '-f, --font <font name>',
      type: 'list',
      choices: choicesLists.font
    }],
    execute: executeCommand
  };

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config);

  /**
   * Build the choices for "list" and "checkbox" parameters
   * @param {Array} endpoints - the list o available endpoint specifications
   * @returns {Object} - collection of lists of choices for "list" and "checkbox" parameters
   */
  function getChoices() {
    return {
      language: _.keys(cheers),
      font: () => {
        return figlet.fonts();
      }
    };
  }

  /**
   * The following code cannot be correcltly tested because icli.getProgram().parse() fire an event to execute it and we cannot
   * know when its execution is finished. Pebo could gracefully handle this kind of behavior.
   */
  /**
   * Create the new project
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    const language = parameters.language || _.sample(_.keys(cheers));
    let word = cheers[language];
    return figlet.fonts()
    .then(fonts => {
      const font = parameters.font ? parameters.font : _.sample(fonts);
      if (latinFonts.indexOf(font) === -1) { word = _.deburr(word); }
      icli.print('language: ' + language);
      icli.print('font: ' + font);
      return figlet(word, { font });
    })
    .then(cheers => {
      const b = txt => { return icli.format.custom(txt, '\x1b[93m'); };
      const m = txt => { return icli.format.custom(txt, '\x1b[1m'); };
      let beer = ['',
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
      const termWidth = process.stdout.columns;
      const cheersWidth = _.max(_.map(cheers, (o) => { return o.length; }));
      const beerWidth = _.max(_.map(beer, (o) => { return o.length; }));
      // The test "termWidth === 0" is useful in the travis environment
      if (termWidth === 0 || (beerWidth + cheersWidth < termWidth)) {
        const top = Math.round((beer.length - cheers.length) / 2);
        for (let i = 0; i < cheers.length; i++) {
          beer[top + i + 1] += '   ' + cheers[i];
        }
      } else if (cheersWidth < termWidth) {
        beer = _.concat(beer, cheers);
      }
      icli.print(beer.join('\n'));
      return Promise.resolve(true);
    });
  }

};
