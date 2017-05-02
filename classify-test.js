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

goog.provide('classify_tests');

goog.require('security.polymer_resin.CustomElementClassification');
goog.require('security.polymer_resin.classifyElement');

suite(
    'classify_tests',

    function () {
      var elements;

      setup(function () {
        elements = fixture('classify-tests');
      });

      function assertClassification(query, expected) {
        test('test ' + query,
             function () {
               var el = elements.querySelector(query);
               var classification = security.polymer_resin.classifyElement(
                   el.localName, el.constructor);
               assert.equal(
                   classification,
                   expected,
                   el.outerHTML);
             });
      }

      assertClassification(
          '#link',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'b',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'table',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'tr',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'td',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'th',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'div',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'img',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'input',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'ul',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'li',
          security.polymer_resin.CustomElementClassification.BUILTIN);

      assertClassification(
          'blink',
          security.polymer_resin.CustomElementClassification.LEGACY);

      assertClassification(
          'my-custom',
          security.polymer_resin.CustomElementClassification.CUSTOM);
      // Custom-builtin are classified as builtin because builtin
      // properties are own properties.
      // Calling code should check for the presence of is="...".
      assertClassification(
          '#mylink',
          security.polymer_resin.CustomElementClassification.BUILTIN);
      assertClassification(
          'un-registered',
          security.polymer_resin.CustomElementClassification.CUSTOMIZABLE);
    });
