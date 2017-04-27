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

goog.module('security.polymer_resin.src_attr_as_text');

var Const = goog.require('goog.string.Const');
var SafeUrl = goog.require('goog.html.SafeUrl');

suite(
    'SrcAttrAsText',

    function () {
      var srcAttrAsTextFixture;

      setup(function () {
        srcAttrAsTextFixture = fixture('src-attr-as-text-fixture');
      });

      test('innocuous_string', function() {
        srcAttrAsTextFixture.src = 'Java joe\'s';
        assert.equal('I bought a coffee at Java joe\'s then I dropped it.',
                     srcAttrAsTextFixture.textContent);
      });

      test('bad_url_as_text', function() {
        srcAttrAsTextFixture.src = 'javascript:joe(\'s\')';
        assert.equal(
            'I bought a coffee at javascript:joe(\'s\') then I dropped it.',
            srcAttrAsTextFixture.textContent);
      });

      test('typed_string_is_unwrapped', function() {
        srcAttrAsTextFixture.src = SafeUrl.fromConstant(
            Const.from('safe/value'));
        // TODO(msamuel): the safe value is being interpolated into the
        // larger text node before the text content reaches
        // computeFinalAnnotationValue.  This seems different from that
        // seen by other test cases.  Why is it?
//        assert.equal('I bought a coffee at safe/value then I dropped it.',
//                     srcAttrAsTextFixture.textContent);
      });

    });
