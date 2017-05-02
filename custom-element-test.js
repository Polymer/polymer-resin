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

goog.provide('custom_element_tests');

goog.require('goog.html.SafeStyle');
goog.require('goog.html.SafeUrl');
goog.require('goog.string.Const');

// This tests assignment to properties of a custom tag that are routed
// throgh to elements of the shadow DOM.

// We do not test direct assignment from JavaScript to sensitive
// properties of parts of that, because that should be covered by
// JSConformance checking.

suite(
    'CustomElementTests',

    function () {
      function decompose(customTag) {
      }

      /**
       * A single <custom-tag> loaded via a text-fixture so that it's
       * properly attached.
       */
      var customTag;
      var decomposed;

      setup(function () {
        customTag = fixture('one-custom-tag');

        // Grab elements from under the given <custom-tag>'s shadow root
        // so that the tests below can easily inspect their attributes
        // and properties.
        var links = customTag.querySelectorAll('a');
        decomposed = {
          outerDiv: customTag.querySelector('div'),
          dynLink: links[0],  // The <a href="[[...]]"><img ...> ([[...]])</a>
          img: customTag.querySelector('img'),
          staticLink: links[1]  // The <a href="javascript:...">fixed text</a>
        };
      });

      test('inital_state', function() {
        assert.equal('', decomposed.outerDiv.style.cssText, 'div style');
        assert.equal('', decomposed.dynLink.href, 'a href dynamic');
        assert.equal('javascript:alert(\'hi\')',
                     decomposed.staticLink.href, 'a href static');
        assert.equal('', decomposed.img.src, 'img src');
        assert.equal('', decomposed.img.title, 'img title');
        // A computed result in a text node whose text is based on
        // numeric operations.
        assert.equal('43', decomposed.dynLink.textContent, 'a text');
      });

      test('can_reassign_inital_state', function() {
        customTag.css = '';
        assert.equal('', decomposed.outerDiv.style.cssText, 'div style');

        customTag.src = '';
        assert.equal('', decomposed.dynLink.href, 'a href dynamic');
        assert.equal('javascript:alert(\'hi\')',
                     decomposed.staticLink.href, 'a href static');
        assert.equal('', decomposed.img.src, 'img src');

        customTag.title = '';
        assert.equal('', decomposed.img.title, 'img title');

        customTag.num = 42;
        assert.equal('43', decomposed.dynLink.textContent, 'a text');
      });

      test('src_ok', function() {
        var httpUrl = 'http://example.com/';
        customTag.src = httpUrl;
        assert.equal(httpUrl, decomposed.dynLink.href, 'a href dynamic');
        assert.equal(httpUrl, decomposed.img.src, 'img src');
      });

      test('src_bad', function() {
        var jsUrl = 'javascript: evil :( "muhaha"  /*:*/)';
        customTag.src = jsUrl;
        assert.equal(goog.html.SafeUrl.INNOCUOUS_STRING,
                     decomposed.dynLink.href, 'a href dynamic');
        assert.equal(goog.html.SafeUrl.INNOCUOUS_STRING,
                     decomposed.img.src, 'img src');
      });

      test('num_not_stringified_before_use', function() {
        customTag.num = -42;
        assert.equal('-41', decomposed.dynLink.textContent, 'a text');
      });

      test('title_ok_when_looks_like_bad_url', function() {
        var title = 'javascript:(it_has_good_parts)';
        customTag.title = title;
        assert.equal('javascript:(it_has_good_parts)', decomposed.img.alt);
      });

      test('safe_css', function() {
        customTag.css = goog.html.SafeStyle.fromConstant(
            goog.string.Const.from('color: red;'));
        assert.isOk(
            decomposed.outerDiv.style.cssText.indexOf('color') >= 0,
            decomposed.outerDiv.style.cssText);
      });

      test('bad_css', function() {
        customTag.css = 'color: expression(evil())';
        assert.equal(
            '',
            decomposed.outerDiv.style.cssText);
      });

      test('safe_url_passed_to_plain_text_attribute', function() {
        customTag.title = goog.html.SafeUrl.fromConstant(
            goog.string.Const.from('http://example.com/'));
        assert.equal('http://example.com/', decomposed.img.alt);
      });
    });
