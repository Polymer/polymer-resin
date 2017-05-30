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

goog.provide('text_node_tests');

suite(
    'TestNodeTests',

    function () {
      var nodes;
      var divElement;
      var objectElement;
      var scriptElement;


      var payload = 'pay.load';


      setup(function () {
        nodes = fixture('text-node-test');
        divElement = nodes.$$('div');
        objectElement = nodes.$$('object');
        scriptElement = nodes.$$('script');
      });


      test('text_in_div', function() {
        nodes.text = payload;

        assert.isOk(divElement.textContent.indexOf(payload) >= 0);
      });

      test('text_in_object', function() {
        nodes.text = payload;

        assert.isOk(objectElement.textContent.indexOf(payload) < 0);
      });

      test('text_in_script', function() {
        nodes.text = payload;

        if (scriptElement) {
          assert.isOk(scriptElement.textContent.indexOf(payload) < 0);
        } else {
          // The combination of JSCompiler + vulcanize helpfully removes
          // script elements even from <template>, so make sure we're not
          // in raw mode or else there's something wrong with the test.
          assert.isOk(COMPILED);
        }
      });

    });
