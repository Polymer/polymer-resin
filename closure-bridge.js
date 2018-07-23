/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
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

"use strict";


/**
 * @fileoverview
 * Provides a safe types bridge that recognizes goog.html.Safe*.
 */


goog.provide('security.polymer_resin.closure_bridge');

goog.require('goog.html.SafeHtml');
goog.require('goog.html.SafeScript');
goog.require('goog.html.SafeStyle');
goog.require('goog.html.SafeUrl');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.string');
goog.require('goog.string.Const');
goog.require('goog.string.TypedString');


/**
 * @typedef {{typeToUnwrap: !Function, unwrap: !Function}}
 */
security.polymer_resin.closure_bridge.unwrapper;

/**
 * @typedef {function (string, *): ?}
 */
security.polymer_resin.closure_bridge.filter;

/**
 * Unwraps any typed string input.
 * @param {*} value A value that might be a typed string.
 * @return {?} the content if value is a wrapped string, or value otherwise.
 * @private
 */
security.polymer_resin.closure_bridge.unwrapString_ = function (value) {
  return (value && value.implementsGoogStringTypedString)
      ? (/** @type {!goog.string.TypedString} */(value))
        .getTypedStringValue()
      : value;
};
/**
 * @type {!Object<string, !security.polymer_resin.closure_bridge.unwrapper>}
 * @private
 * @const
 */
security.polymer_resin.closure_bridge.UNWRAPPERS_ = {
  // Keys are security.polymer_resin.SafeType but adding a dependency on
  // polymer_resin just to get that type breaks webcomponent_binaries since
  // polymer_resin is depended upon as both a js_dep and a wc_dep.
  'CONSTANT': {
    typeToUnwrap: goog.string.Const,
    unwrap: goog.string.Const.unwrap
  },
  'JAVASCRIPT': {
    typeToUnwrap: goog.html.SafeScript,
    unwrap: goog.html.SafeScript.unwrap
  },
  'HTML': {
    typeToUnwrap: goog.html.SafeHtml,
    unwrap: goog.html.SafeHtml.unwrap
  },
  'RESOURCE_URL': {
    typeToUnwrap: goog.html.TrustedResourceUrl,
    unwrap: goog.html.TrustedResourceUrl.unwrap
  },
  'STRING': {
    typeToUnwrap: Object,
    unwrap: security.polymer_resin.closure_bridge.unwrapString_
  },
  'STYLE': {
    typeToUnwrap: goog.html.SafeStyle,
    unwrap: goog.html.SafeStyle.unwrap
  },
  'URL': {
    typeToUnwrap: goog.html.SafeUrl,
    unwrap: goog.html.SafeUrl.unwrap
  }
};


/**
 * @type {!security.polymer_resin.closure_bridge.filter}
 * @private
 * @const
 */
security.polymer_resin.closure_bridge.disallow_ = function (value, fallback) {
  return fallback;
};

/**
 * @type {!Object<string, !security.polymer_resin.closure_bridge.filter>}
 * @private
 * @const
 */
security.polymer_resin.closure_bridge.FILTERS_ = {
  /* Just returns the safe replacement value because we have no
   * way of knowing that a raw string is a compile-time constant.
   */
  'CONSTANT': security.polymer_resin.closure_bridge.disallow_,
  /* Just returns the safe replacement value because we have no
   * way of knowing that a raw string is safe JavaScript so rely
   * on RTTI in all cases.
   */
  'JAVASCRIPT': security.polymer_resin.closure_bridge.disallow_,
  /* Converts plain text to HTML that parses to a text node with
   * equivalent content.
   */
  'HTML': goog.string.htmlEscape,
  /* Just returns the safe replacement value because we have no
   * way of declaring that a raw string is a trusted resource so
   * rely on RTTI in all cases.
   */
  'RESOURCE_URL': security.polymer_resin.closure_bridge.disallow_,
  'STRING': String,
  /* Just returns the safe replacement value because we have no
   * way of knowing that a raw string is safe CSS so rely on RTTI
   * in all cases.
   */
  'STYLE': security.polymer_resin.closure_bridge.disallow_,
  'URL': (
      /**
       * Allows safe URLs through, but rejects unsafe ones.
       * @param {string} value attribute value
       * @return {string}
       */
      function allowSafeUrl(value) {
        // TODO: Can we do without creating a SafeUrl instance?
        return goog.html.SafeUrl.sanitize(value).getTypedStringValue();
      })
};

/**
 * A security.polymer_resin.SafeTypeBridge.
 *
 * @param {*} value the value whose trustedness is being check.
 * @param {string} type a security.polymer_resin.SafeType value
 * @param {*} fallback the value to return if value is not trusted as a value of type.
 * @return {?}
 */
security.polymer_resin.closure_bridge.safeTypesBridge =
    function (value, type, fallback) {
      /** @type {!security.polymer_resin.closure_bridge.unwrapper} */
      var unwrapper = security.polymer_resin.closure_bridge.UNWRAPPERS_[type];
      if (value instanceof unwrapper.typeToUnwrap) {
        var uw = unwrapper.unwrap(value, fallback);
        if (uw !== fallback) {
          return uw;
        }
      }

      /** @type {!security.polymer_resin.closure_bridge.filter} */
      var filter = security.polymer_resin.closure_bridge.FILTERS_[type];
      return filter(
          '' + security.polymer_resin.closure_bridge.unwrapString_(value),
          fallback);
    };
