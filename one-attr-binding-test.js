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

goog.module('security.polymer_resin.one_attr_binding');

var Const = goog.require('goog.string.Const');
var SafeUrl = goog.require('goog.html.SafeUrl');

suite(
    'OneAttrBinding',

    function () {
      var oneAttrFixture;

      setup(function () {
        oneAttrFixture = fixture('one-attr-binding-fixture');
      });

      test('innocuous_string', function() {
        var link = oneAttrFixture.querySelector('a');
        oneAttrFixture.x = 'http://example.com/foo';

        assert.equal('http://example.com/foo', link.href);
      });

      test('safe_url', function() {
        var link = oneAttrFixture.querySelector('a');
        oneAttrFixture.x = SafeUrl.fromConstant(
            Const.from('javascript:safe()'));

        assert.equal('javascript:safe()', link.href);
      });

      test('evil_payload', function() {
        var link = oneAttrFixture.querySelector('a');
        oneAttrFixture.x = 'javascript:evil()';

        assert.equal(
            SafeUrl.INNOCUOUS_STRING,
            link.href);
      });
    });
