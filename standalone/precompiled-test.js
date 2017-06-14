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

suite(
    'PrecompiledTest',

    function () {
      var myTestFixture;

      setup(function () {
        myTestFixture = fixture('precompiled-test-fixture');
      });

      test('innocuous_string', function() {
        var link = myTestFixture.$$('a');
        myTestFixture.x = 'http://example.com/foo';

        assert.equal('http://example.com/foo', link.href);
      });

      test('evil_payload', function() {
        var link = myTestFixture.$$('a');
        myTestFixture.x = 'javascript:evil()';

        assert.equal(
            'about:invalid#zClosurez',
            link.href);
      });
    });
