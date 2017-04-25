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

/**
 * @fileoverview
 * Test that sanitization of computed data bindings does not
 * force stringification of the function that computes the value
 * and gets the computed value in time to reject unsafe values.
 */

goog.module('security.polymer_resin.computed_value_tests');

var SafeUrl = goog.require('goog.html.SafeUrl');

suite(
    'ComputedValueTests',

    function () {
      var computedValueFixture;

      setup(function (done) {
        computedValueFixture = fixture('computed-value-fixture');
        computedValueFixture.links = links;
        flush(done);  // Don't run tests until dom-repeat terminates
      });

      var links = [
        { "url": "http://example.com/#frag", text: "example" },
        { "url": "javascript:alert(1)", text: "XSS" }
      ];

      function trim(s) {
        return (s || '').replace(/^\s+|\s+$/g, '');
      }

      test('urls', function() {
        var links = computedValueFixture.querySelectorAll('a');
        assert.equal(2, links.length);
        assert.equal('http://example.com/', links[0].href);
        assert.equal(goog.html.SafeUrl.INNOCUOUS_STRING, links[1].href);
      });

      test('text', function() {
        var links = computedValueFixture.querySelectorAll('a');
        assert.equal(2, links.length);
        assert.equal('example (example.com)', trim(links[0].textContent));
        assert.equal('XSS ()', trim(links[1].textContent));
      });
    });
