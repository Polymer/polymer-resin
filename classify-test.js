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

goog.module('classify_tests');

var CustomElementClassification =
    goog.require('security.polymer_resin.CustomElementClassification');
var classifyElement = goog.require('security.polymer_resin.classifyElement');

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
               var classification = classifyElement(
                   el.localName, el.constructor);
               assert.equal(
                   classification,
                   expected,
                   el.outerHTML);
             });
      }

      assertClassification(
          '#link',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'b',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'table',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'tr',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'td',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'th',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'div',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'img',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'input',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'ul',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'li',
          CustomElementClassification.BUILTIN);

      assertClassification(
          'blink',
          CustomElementClassification.LEGACY);

      assertClassification(
          'my-custom',
          CustomElementClassification.CUSTOM);
      // Custom-builtin are classified as builtin because builtin
      // properties are own properties.
      // Calling code should check for the presence of is="...".
      assertClassification(
          '#mylink',
          CustomElementClassification.BUILTIN);
      assertClassification(
          'un-registered',
          CustomElementClassification.CUSTOMIZABLE);
    });
