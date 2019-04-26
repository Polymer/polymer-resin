/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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

"use strict";


/**
 * @fileoverview
 * Mitigates XSS in Polymer applications by intercepting and vetting
 * results of data binding expressions before they reach browser internals.
 */

goog.provide('security.polymer_resin');

goog.require('security.polymer_resin.hintUsesDeprecatedRegisterElement');
goog.require('security.polymer_resin.sanitizer');

/** @const */
security.polymer_resin.CONSOLE_LOGGING_REPORT_HANDLER =
    security.polymer_resin.sanitizer.CONSOLE_LOGGING_REPORT_HANDLER;

/** @typedef {security.polymer_resin.sanitizer.Configuration} */
security.polymer_resin.Configuration;

/**
 * Start polymer resin.
 * This must be done before the first application element is instantiated
 * (see getting-started.md for details).
 *
 * @param {?security.polymer_resin.Configuration=} opt_config
 *   An optional configuration object.
 */
security.polymer_resin.install = function(opt_config) {
  var sanitize =
      security.polymer_resin.sanitizer.makeSanitizer(opt_config || {});

  // Now, install the sanitizer.
  // There are two code-paths below for Polymer V1 and V2.
  // The code could be consolidated, except that
  // 1. In both cases I want to first delegate to any previously
  //    registered handler.
  // 2. If I tried to express the V1 logic in terms of V2, I would need
  //    to thread the info object through somehow hacky.
  // 3. I don't want to express the V2 logic in terms of V1 since the V1
  //    will hopefully eventually go away entirely.
  // So I just duplicate the logic which goes through these steps:
  // 1. fetch any previously declared function
  // 2. define an adapter
  // 3. install the adapter
  // 4. sanity check that the adapter was installed.
  if (/^1\./.test(Polymer.version)) {
    // In Polymer v1, the Polymer(...) method uses the deprecated
    // document.registerElement instead of window.customElements.
    security.polymer_resin.hintUsesDeprecatedRegisterElement();

    // sanitizeDOMValue is not defined for v1.
    // See https://github.com/Polymer/polymer/issues/4138
    var origCompute = Polymer.Base._computeFinalAnnotationValue;
    var computeFinalAnnotationSafeValue = function computeFinalAnnotationValue(
        node, property, value, info) {
      var finalValue = origCompute.call(this, node, property, value, info);
      var type = 'property';
      var name;
      if (info && info.propertyName) {
        name = info.propertyName;
      } else {
        name = property;
        type = info && info.kind || 'property';
      }

      return sanitize(node, name, type, finalValue);
    };
    Polymer.Base._computeFinalAnnotationValue =
        computeFinalAnnotationSafeValue;
    if (Polymer.Base._computeFinalAnnotationValue !==
        computeFinalAnnotationSafeValue) {
      // We're in use strict, so assignment should fail-fast, but
      // this is cheap.
      throw new Error(
          'Cannot replace _computeFinalAnnotationValue.  Is Polymer frozen?');
    }
  } else {
    var origSanitize = Polymer.sanitizeDOMValue || (
        Polymer.Settings && Polymer.Settings.sanitizeDOMValue);
    var sanitizeDOMValue =
        /**
         * @param {*} value
         * @param {string} name
         * @param {string} type
         * @param {!Node|null} node
         * @return {*}
         */
       function sanitizeDOMValue(value, name, type, node) {
          var origSanitizedValue = origSanitize
              ? origSanitize.call(Polymer, value, name, type, node)
              : value;
          var safeValue = node ?
              sanitize(node, name, type, origSanitizedValue) :
              security.polymer_resin.sanitizer.INNOCUOUS_STRING;
          return safeValue;
        };
    if (Polymer.Settings && Polymer.Settings.setSanitizeDOMValue) {
      Polymer.Settings.setSanitizeDOMValue(sanitizeDOMValue);
    } else {
      Polymer.sanitizeDOMValue = sanitizeDOMValue;
      if (Polymer.sanitizeDOMValue !== sanitizeDOMValue) {
        // We're in use strict, so assignment should fail-fast, but
        // this is cheap.
        throw new Error(
            'Cannot install sanitizeDOMValue.  Is Polymer frozen?');
      }
    }
  }
};

if (security.polymer_resin.STANDALONE) {
  goog.exportSymbol(
      'security.polymer_resin.install',
      security.polymer_resin.install);
  goog.exportSymbol(
      'security.polymer_resin.CONSOLE_LOGGING_REPORT_HANDLER',
      security.polymer_resin.CONSOLE_LOGGING_REPORT_HANDLER);
}
