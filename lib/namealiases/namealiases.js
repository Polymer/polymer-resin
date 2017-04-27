

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
  var mixed_to_lcase = security.html.namealiases.mixed_to_lcase_;
  if (!mixed_to_lcase) {
    mixed_to_lcase = security.html.namealiases.mixed_to_lcase_ =
        goog.object.transpose(security.html.namealiases.LCASE_TO_MIXED_);
  }
  var attr = mixed_to_lcase[propName];
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
  var prop = security.html.namealiases.LCASE_TO_MIXED_[canonAttrName];
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
  var prop = security.html.namealiases.LCASE_TO_MIXED_[lcname];
  if (goog.isString(prop)) {
    return prop;
  }
  return null;
};

/**
 * Maps lower-case HTML attribute names to mixed-case property names
 * that reflect those attributes.
 *
 * @type {!Object.<string, string>}
 * @const
 * @private
 */
security.html.namealiases.LCASE_TO_MIXED_ = {
  "accept_charset": "acceptCharset",
  "accesskey": "accessKey",
  "alink": "aLink",
  "allowfullscreen": "allowFullscreen",
  "bgcolor": "bgColor",
  "cellpadding": "cellPadding",
  "cellspacing": "cellSpacing",
  "char": "ch",
  "charoff": "chOff",
  "checked": "defaultChecked",
  "class": "className",
  "codebase": "codeBase",
  "codetype": "codeType",
  "contenteditable": "contentEditable",
  "crossorigin": "crossOrigin",
  "datetime": "dateTime",
  "dirname": "dirName",
  "for": "htmlFor",
  "formaction": "formAction",
  "formenctype": "formEnctype",
  "formmethod": "formMethod",
  "formnovalidate": "formNoValidate",
  "formtarget": "formTarget",
  "frameborder": "frameBorder",
  "http_equiv": "httpEquiv",
  "innerhtml": "innerHTML",
  "innertext": "innerText",
  "inputmode": "inputMode",
  "ismap": "isMap",
  "longdesc": "longDesc",
  "marginheight": "marginHeight",
  "marginwidth": "marginWidth",
  "maxlength": "maxLength",
  "mediagroup": "mediaGroup",
  "minlength": "minLength",
  "muted": "defaultMuted",
  "nodevalue": "nodeValue",
  "nohref": "noHref",
  "noresize": "noResize",
  "noshade": "noShade",
  "novalidate": "noValidate",
  "nowrap": "noWrap",
  "outerhtml": "outerHTML",
  "outertext": "outerText",
  "readonly": "readOnly",
  "selected": "defaultSelected",
  "tabindex": "tabIndex",
  "textcontent": "textContent",
  "truespeed": "trueSpeed",
  "usemap": "useMap",
  "valign": "vAlign",
  "value": "defaultValue",
  "valueasdate": "valueAsDate",
  "valueasnumber": "valueAsNumber",
  "valuetype": "valueType",
  "vlink": "vLink"
};

/**
 * Maps lower-case HTML attribute names to mixed-case property names
 * that reflect those attributes.
 *
 * Lazily generated from LCASE_TO_MIXED_.
 *
 * @type {?Object.<string, string>}
 * @private
 */
security.html.namealiases.mixed_to_lcase_ = null;
