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

goog.provide('security.polymer_resin.attr_property_aliasing_tests');

goog.require('goog.html.SafeUrl');
goog.require('goog.string.Const');

suite(
    'AttrPropertyAliasingTests',

    function () {
      var buttons;
      var propertyButton;
      var attributeButton;
      var customButton;

      setup(function () {
        buttons = fixture('attr-property-aliasing-fixture');
        propertyButton = buttons.$$('.property-button');
        attributeButton = buttons.$$('.attribute-button');
        customButton = buttons
            .$$('.custom-button')
            .$$('button');
      });


      var TYPED_STRING_TEXT = 'javascript:safe(this)';
      var SAFE_ACTION = goog.html.SafeUrl.fromConstant(
          goog.string.Const.from(TYPED_STRING_TEXT));
      var UNSAFE_ACTION = 'javascript:evil()';
      var INNOCUOUS_ACTION = goog.html.SafeUrl.INNOCUOUS_STRING;

      test('innocuous_action_via_attribute', function() {
        buttons.setAttribute('action', '/safe');

        assert.equal('/safe', propertyButton.getAttribute('formaction'));
        assert.equal('/safe', attributeButton.getAttribute('formaction'));
        assert.equal('/safe', customButton.getAttribute('formaction'));
      });

      test('innocuous_action_via_attribute_case_insensitive', function() {
        buttons.setAttribute('ACTION', '/safe');

        assert.equal('/safe', propertyButton.getAttribute('formaction'));
        assert.equal('/safe', attributeButton.getAttribute('formaction'));
        assert.equal('/safe', customButton.getAttribute('formaction'));
      });

      test('safe_action_via_property', function() {
        buttons.action = SAFE_ACTION;

        assert.equal(TYPED_STRING_TEXT, propertyButton.getAttribute('formaction'));
        assert.equal(TYPED_STRING_TEXT, attributeButton.getAttribute('formaction'));
        assert.equal(TYPED_STRING_TEXT, customButton.getAttribute('formaction'));
      });

      test('unsafe_action_via_attribute', function() {
        buttons.setAttribute('action', UNSAFE_ACTION);

        assert.equal(INNOCUOUS_ACTION, propertyButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, attributeButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, customButton.getAttribute('formaction'));
      });

      test('unsafe_action_via_attribute_case_insensitive', function() {
        buttons.setAttribute('ACTION', UNSAFE_ACTION);

        assert.equal(INNOCUOUS_ACTION, propertyButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, attributeButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, customButton.getAttribute('formaction'));
      });

      test('unsafe_action_via_property', function() {
        buttons.action = UNSAFE_ACTION;

        assert.equal(INNOCUOUS_ACTION, propertyButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, attributeButton.getAttribute('formaction'));
        assert.equal(INNOCUOUS_ACTION, customButton.getAttribute('formaction'));
      });

    });
