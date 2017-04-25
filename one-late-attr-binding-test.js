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

goog.module('security.polymer_resin.one_late_attr_binding');

var Const = goog.require('goog.string.Const');
var SafeUrl = goog.require('goog.html.SafeUrl');

suite(
    'OneLateAttrBinding',

    function () {
      var oneLateAttrFixture;

      setup(function () {
        oneLateAttrFixture = fixture('one-late-attr-binding-fixture');
      });

      test('innocuous_string', function(done) {
        oneLateAttrFixture.items = ['http://example.com/foo'];
        flush(
            function () {
              var link = oneLateAttrFixture.querySelector('a');
              assert.equal('http://example.com/foo', link.href);
              done();
            });
      });

      test('safe_url', function(done) {
        oneLateAttrFixture.items = [
          SafeUrl.fromConstant(Const.from('javascript:safe()'))];
        flush(
            function () {
              var link = oneLateAttrFixture.querySelector('a');
              assert.equal('javascript:safe()', link.href);
              done();
            });
      });

      test('evil_payload', function(done) {
        oneLateAttrFixture.items = ['javascript:evil()'];
        flush(function () {
          var link = oneLateAttrFixture.querySelector('a');
          assert.equal(
              SafeUrl.INNOCUOUS_STRING,
              link.href);
          done();
        });
      });
    });
