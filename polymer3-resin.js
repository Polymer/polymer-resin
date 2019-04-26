/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


// Due to a bug in clutz, these imports must be relative.
import * as goog from '../../../../javascript/closure/goog.js';
import * as settings from '../../polymer/v2/polymer/lib/utils/settings.js';

const {makeSanitizeDomFunction, Configuration} = goog.require('security.polymer_resin.sanitizer');

goog.declareModuleId('security.polymer_resin.polymer_v3');

/**
 * Install polymer resin into Polymer v2/v3.
 *
 * This must be done before the first application element is instantiated
 * (see getting-started.md for details).
 *
 * @param {!Configuration} config A sanitizer
 *     configuration.
 */
export function install(config) {
  // Now, install the sanitizer.
  const origSanitize = settings.sanitizeDOMValue;
  const sanitizeDOMValue = makeSanitizeDomFunction(config, origSanitize);
  settings.setSanitizeDOMValue(sanitizeDOMValue);
  if (settings.sanitizeDOMValue !== sanitizeDOMValue) {
    throw new Error('Cannot install sanitizeDOMValue.  Is Polymer frozen?');
  }
};
