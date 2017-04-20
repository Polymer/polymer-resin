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

goog.module('security.polymer_resin.attr_property_aliasing_tests');

var Const = goog.require('goog.string.Const');
var SafeUrl = goog.require('goog.html.SafeUrl');

suite(
    'AttrPropertyAliasingTests',

    function () {
      var buttons;
      var regularButton;
      var customButton;

      setup(function () {
        buttons = fixture('attr-property-aliasing-fixture');
        regularButton = buttons.querySelector('.regular-button');
        customButton = buttons
            .querySelector('.custom-button')
            .querySelector('button');
      });


      var TYPED_STRING_TEXT = 'javascript:safe(this)';
      var SAFE_ACTION = SafeUrl.fromConstant(Const.from(TYPED_STRING_TEXT));
      var UNSAFE_ACTION = 'javascript:evil()';
      var INNOCUOUS_ACTION = SafeUrl.INNOCUOUS_STRING;

      test('innocuous_action_via_attribute', function() {
        buttons.setAttribute('action', '/safe');

        assert.equal('/safe', regularButton.getAttribute('formaction'));
        assert.equal('/safe', customButton.getAttribute('formaction'));
      });

      test('innocuous_action_via_attribute_case_insensitive', function() {
        buttons.setAttribute('ACTION', '/safe');

        assert.equal('/safe', regularButton.getAttribute('formaction'));
        assert.equal('/safe', customButton.getAttribute('formaction'));
      });

      test('safe_action_via_property', function() {
        buttons.action = SAFE_ACTION;

        assert.equal(TYPED_STRING_TEXT, regularButton.getAttribute('formaction'));
        assert.equal(TYPED_STRING_TEXT, customButton.getAttribute('formaction'));
      });

      test('unsafe_action_via_attribute', function() {
        buttons.setAttribute('action', UNSAFE_ACTION);

        assert.equal(INNOCUOUS_ACTION, regularButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, customButton.getAttribute('formaction'));
      });

      test('unsafe_action_via_attribute_case_insensitive', function() {
        buttons.setAttribute('ACTION', UNSAFE_ACTION);

        assert.equal(INNOCUOUS_ACTION, regularButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, customButton.getAttribute('formaction'));
      });

      test('unsafe_action_via_property', function() {
        buttons.action = UNSAFE_ACTION;

        assert.equal(INNOCUOUS_ACTION, regularButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, customButton.getAttribute('formaction'));
      });
    });
