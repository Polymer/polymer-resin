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

goog.provide('a_tag_tests');

goog.require('goog.html.SafeUrl');
goog.require('goog.string.Const');

/**
 * An array with the same set of elements as the input but whose values are
 * lexicographically ordered and unique.
 * @param {!Array.<string>} arr
 * @return {!Array.<string>}
 */
function uniq(arr) {
  return arr.slice().sort().filter(
      function (element, index, array) {
        return index === 0 || element !== array[index - 1];
      });
}

suite(
    'ATagtests',

    function () {
      var toCheck;

      setup(function () {
        toCheck = fixture('a-tag-tests');
      });

      teardown(function () {
        var reports = uniq(
            document.getElementById('resin-reports').textContent.split('\n'));
        assert.equal(
            'Failed to sanitize attribute of <a>: <a href="javascript:doEvil()">',
            reports.join('\n').replace(/^\n+|\n+$/g, ''));
      });

      function getA(id) {
        return toCheck.$$('#' + id);
      }

      test('innocuous_string', function() {
        assert.equal(
            getA('a1').href,
            'http://example.com/ok');
      });

      test('safe_url', function() {
        toCheck.safeUrl = goog.html.SafeUrl.fromConstant(
            goog.string.Const.from('javascript:safe()'));

        assert.equal(
            getA('a2').href,
            'javascript:safe()');
      });

      test('evil_payload', function() {
        assert.equal(
            getA('a3').href,
            'about:invalid#zClosurez');
      });

      test('literal', function() {
        assert.equal(
            getA('a4').href,
            'javascript:safe()');
      });
    });
