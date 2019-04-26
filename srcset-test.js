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

goog.provide('security.polymer_resin.srcset');

goog.require('goog.html.SafeUrl');
goog.require('goog.string.Const');

suite(
    'Srcset',

    function () {
      var testFixture;

      setup(function () {
        testFixture = fixture('srcset-fixture');
        document.getElementById('resin-reports').textContent = '';
      });

      function img() {
        return testFixture.$$('img');
        // Polymer.dom(testFixture.root).querySelector('img')
      }

      test('raw_string_with_relative_urls', function() {
        testFixture.sources = '/foo-1.png 1x, /foo-2.png 2x, /foo.png';
        assert.equal(
            '/foo-1.png 1x , /foo-2.png 2x , /foo.png',
            img().srcset);
        assert.equal(
            '',
            document.getElementById('resin-reports').textContent);
      });

      test('raw_string_with_dodgy_urls', function() {
        testFixture.sources = '/foo-1.png 1x, javascript:alert(1) 2x, /foo.png';
        assert.equal(
            '/foo-1.png 1x , /foo.png',
            img().srcset);
        assert.equal(
            'Failed to sanitize attribute value of <img>:'
              + ' <img srcset="/foo-1.png 1x, javascript:alert(1) 2x, /foo.png">:'
              + ' [{"url":"javascript:alert(1)","metadata":"2x"}]\n',
            document.getElementById('resin-reports').textContent);
      });

      test('structured_input', function () {
        testFixture.sources = [
          { 'url': '/foo-1.png', 'metadata': '1x' },
          { 'url': 'javascript:alert(1)', 'metadata': '2x' },
          { 'url': '/foo.png' },
        ];
        assert.equal(
            '/foo-1.png 1x , /foo.png',
            img().srcset);
        assert.equal(
            'Failed to sanitize attribute value of <img>:'
              + ' <img srcset="[object Object],[object Object],[object Object]">:'
              + ' [{"url":"javascript:alert(1)","metadata":"2x"}]\n',
            document.getElementById('resin-reports').textContent);
      });

      test('structured_input_with_safeurl', function () {
        testFixture.sources = [
          { 'url': '/foo-1.png', 'metadata': '1x' },
          {
            'url': goog.html.SafeUrl.fromConstant(
                goog.string.Const.from('javascript:safe()')),
            'metadata': '2x'
          },
          { 'url': '/foo.png' },
        ];
        assert.equal(
            '/foo-1.png 1x , javascript:safe() 2x , /foo.png',
            img().srcset);
        assert.equal(
            '',
            document.getElementById('resin-reports').textContent);
      });
    });
