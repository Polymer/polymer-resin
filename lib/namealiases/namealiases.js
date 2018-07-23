
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

goog.provide('security.html.namealiases');

goog.require('goog.object');
goog.require('goog.string');

/**
 * @fileoverview
 * Provides a mapping from HTML attribute to JS object property names.
 */

/**
 * Maps JavaScript object property names to HTML attribute names.
 *
 * @param {string} propName a JavaScript object property name.
 * @return {string} an HTML element attribute name.
 */
security.html.namealiases.propertyToAttr = function (propName) {
  var propToAttr = security.html.namealiases.propToAttr_;
  if (!propToAttr) {
    var attrToProp = security.html.namealiases.getAttrToProp_();
    propToAttr = security.html.namealiases.propToAttr_ =
        goog.object.transpose(attrToProp);
  }
  var attr = propToAttr[propName];
  if (goog.isString(attr)) {
    return attr;
  }
  // Arguably we could do propName.toLowerCase, but these
  // two functions should be inverses.
  return goog.string.toSelectorCase(propName);
};

/**
 * Maps HTML attribute names to JavaScript object property names.
 *
 * @param {string} attrName an HTML element attribute name.
 * @return {string} a JavaScript object property name.
 */
security.html.namealiases.attrToProperty = function (attrName) {
  var canonAttrName = String(attrName).toLowerCase();
  var attrToProp = security.html.namealiases.getAttrToProp_();
  var prop = attrToProp[canonAttrName];
  if (goog.isString(prop)) {
    return prop;
  }
  return goog.string.toCamelCase(canonAttrName);
};

/**
 * Instead of trusting a property name, we assume the worst and
 * try to map it to a property name with known special semantics.
 *
 * @param {string} name a JavaScript object property or HTML attribute name.
 * @return {?string} a JavaScript object property name if there is a special
 *   mapping that is different from that given.
 */
security.html.namealiases.specialPropertyNameWorstCase = function (name) {
  var lcname = name.toLowerCase();
  var attrToProp = security.html.namealiases.getAttrToProp_();
  var prop = attrToProp[lcname];
  if (goog.isString(prop)) {
    return prop;
  }
  return null;
};

/**
 * Returns a mapping from lower-case HTML attribute names to
 * property names that reflect those attributes.
 *
 * @return {!Object.<string, string>}
 * @private
 */
security.html.namealiases.getAttrToProp_ = function () {
  if (!security.html.namealiases.attrToProp_) {
    security.html.namealiases.attrToProp_ = goog.object.clone(
        security.html.namealiases.ODD_ATTR_TO_PROP_);
    var noncanon = security.html.namealiases.NONCANON_PROPS_;
    for (var i = 0, n = noncanon.length; i < n; ++i) {
      var name = noncanon[i];
      security.html.namealiases.attrToProp_[name.toLowerCase()] = name;
    }
  }
  return security.html.namealiases.attrToProp_;
};

/**
 * Mixed-case property names that correspond directly to an attribute
 * name ignoring case.
 *
 * @type {!Array.<string>}
 * @const
 * @private
 */
security.html.namealiases.NONCANON_PROPS_ = [
  "aLink",
  "accessKey",
  "allowFullscreen",
  "bgColor",
  "cellPadding",
  "cellSpacing",
  "codeBase",
  "codeType",
  "contentEditable",
  "crossOrigin",
  "dateTime",
  "dirName",
  "formAction",
  "formEnctype",
  "formMethod",
  "formNoValidate",
  "formTarget",
  "frameBorder",
  "innerHTML",
  "innerText",
  "inputMode",
  "isMap",
  "longDesc",
  "marginHeight",
  "marginWidth",
  "maxLength",
  "mediaGroup",
  "minLength",
  "noHref",
  "noResize",
  "noShade",
  "noValidate",
  "noWrap",
  "nodeValue",
  "outerHTML",
  "outerText",
  "readOnly",
  "tabIndex",
  "textContent",
  "trueSpeed",
  "useMap",
  "vAlign",
  "vLink",
  "valueAsDate",
  "valueAsNumber",
  "valueType"
];

/**
 * Attribute name to property name mappings that are neither identity
 * nor simple lowercasing, like {@code "htmlFor"} -> {@code "for"}.
 *
 * @type {!Object.<string, string>}
 * @private
 */
security.html.namealiases.ODD_ATTR_TO_PROP_ = {
  "accept_charset": "acceptCharset",
  "char": "ch",
  "charoff": "chOff",
  "checked": "defaultChecked",
  "class": "className",
  "for": "htmlFor",
  "http_equiv": "httpEquiv",
  "muted": "defaultMuted",
  "selected": "defaultSelected",
  "value": "defaultValue"
};

/**
 * Maps lower-case HTML attribute names to property names that reflect
 * those attributes.
 *
 * <p>
 * This is initialized to a partial value that is then lazily fleshed out
 * based on ODD_ATTR_TO_PROP_ and NONCANON_PROPS_.
 * </p>
 *
 * @type {?Object.<string, string>}
 * @private
 */
security.html.namealiases.attrToProp_ = null;

/**
 * Maps property names to lower-case HTML attribute names
 * that are reflected by those properties.
 *
 * Lazily generated from attrToProp_.
 *
 * @type {?Object.<string, string>}
 * @private
 */
security.html.namealiases.propToAttr_ = null;
