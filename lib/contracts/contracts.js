// **** GENERATED CODE, DO NOT MODIFY ****


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

/**
 * @fileoverview
 * Determines the appropriate safe HTML type for HTML attribute value
 * given HTML document context.
 *
 * Public APIs take canonical names -- HTML element and attribute
 * names should be lower-case.
 *
 * For questions or help, contact ise-hardening@.
 *
 * @visibility {//visibility:public}
 */

goog.provide('security.html.contracts');


/**
 * The types of attributes.
 *
 * @enum {number}
 */
security.html.contracts.AttrType = {
  // Copied from html_contract.proto
  /** May be an arbitrary string. */
  NONE: 1,
  SAFE_HTML: 2,
  SAFE_URL: 3,
  TRUSTED_RESOURCE_URL: 4,
  SAFE_STYLE: 5,
  SAFE_SCRIPT: 7,
  /** Attribute must be one of enum_values. */
  ENUM: 8,
  COMPILE_TIME_CONSTANT: 9,
  /** a compile time constant prefix and a variable suffix. */
  IDENTIFIER: 10
};


/**
 * The types of content allowed to specify text nodes.
 *
 * @enum {number}
 */
security.html.contracts.ElementContentType = {
  /** Must be specified, raise error if not present. */
  CONTRACT_UNSPECIFIED: 0,
  /** Element with SafeHtml contents. The common case. */
  SAFE_HTML: 1,
  /** Element with SafeStyleSheet contents. */
  SAFE_STYLESHEET: 2,
  /** Element with SafeScript contents. */
  SAFE_SCRIPT: 3,
  /**
   * Disallow this element entirely.
   *
   * Implementations may rely either on blacklisting or
   * whitelisting.  If whitelisting, blacklisted elements might
   * still raise a special error message to explain the security
   * problems with this element.
   */
  BLACKLIST: 4,
  /**
   * Void element, no contents, only attributes.
   * @see http://whatwg.org/html/syntax.html#void-elements
   */
  VOID: 5,
  /**
   * String safe to include in an RCDATA context.
   * @see https://www.w3.org/TR/html51/syntax.html#rcdata-state
   */
  STRING_RCDATA: 6
};


/**
 * The type of value allowed for the given attribute.
 *
 * @param {string} elName The name of the element containing the attribute.
 *     Canonical.
 * @param {string} attrName The name of the attribute whose value type
 *     should be returned.  Canonical.
 * @param {function (string) : *} getValue
 *     Gets the value of the given attribute in the element.
 *     Called for attributes whose meaning is contingent on other attributes.
 *     A null or undefined result indicates that the attribute value is
 *     unknown or undefined.
 * @return {?security.html.contracts.AttrType} null to indicate unknown.
 */
security.html.contracts.typeOfAttribute =
    function (elName, attrName, getValue) {
  // First look for an element specific attribute.
  if (Object.hasOwnProperty.call(
          security.html.contracts.ELEMENT_CONTRACTS_, elName)) {
    var elementInfo = security.html.contracts.ELEMENT_CONTRACTS_[elName];
    if (Object.hasOwnProperty.call(elementInfo, attrName)) {
      var attrInfoArray = elementInfo[attrName];
      if (attrInfoArray instanceof Array) {
        var valueCache = null;  // Cache calls to getValue
        var requiredValueNotFound = false;
        for (var i = 0, n = attrInfoArray.length; i < n; ++i) {
          var attrInfo = attrInfoArray[i];
          var contingentAttr = attrInfo.contingentAttribute;
          if (!contingentAttr) {
            return attrInfo.contract;  // Not contingent
          }
          if (valueCache === null) { valueCache = {}; }
          var actualValue =
              Object.hasOwnProperty.call(
                  /** @type{!Object} */(valueCache), contingentAttr)
              ? valueCache[contingentAttr]
              : valueCache[contingentAttr] = getValue(contingentAttr);
          if (actualValue === attrInfo.requiredValue) {
            return attrInfo.contract;
          } else if (actualValue == null /* intentionally match undefined */) {
            requiredValueNotFound = true;
          }
        }
        // Do not fall back to global attributes if there are contingent
        // attributes defined for which we could not find a value that
        // definitely ruled out a match.
        if (requiredValueNotFound) {
          return null;
        }
      }
    }
  }

  var globalAttrType = security.html.contracts.GLOBAL_ATTRS_[attrName];
  return (typeof globalAttrType === 'number') ? globalAttrType : null;
};


/**
 * The type of content allowed to specify child text or CDATA nodes for elements
 * with the given name.
 *
 * @param {string} elemName A canonical (lower-case) HTML element name.
 * @return {?security.html.contracts.ElementContentType}
 */
security.html.contracts.contentTypeForElement = function (elemName) {
  if (Object.hasOwnProperty.call(
          security.html.contracts.ELEMENT_CONTENT_TYPES_, elemName)) {
    return security.html.contracts.ELEMENT_CONTENT_TYPES_[elemName];
  }
  return null;
};

/**
 * True if the given value is allowed for the specified ENUM attribute.
 *
 * @param {string} elemName A canonical (lower-case) HTML element name of the
 *    element containing the attribute.
 * @param {string} attrName A canonical (lower-case) HTML attribute name.
 * @param {string} value The value of the named attribute.
 * @return {boolean} true if the named attribute has attribute type
 *    {@link security.html.contracts.AttrType.ENUM} and value is in the
 *    allowed value set.
 *
 *    Do not rely on the return value for an attribute that is not an
 *    enum attribute, because the return value will probably be false
 *    even though whether it is allowed should be based on the
 *    contract, but it could be true for an attribute that has a
 *    global contract ENUM but is overridden to have a different type
 *    contract on elements with the given name.
 */
security.html.contracts.isEnumValueAllowed =
    function (elemName, attrName, value) {
  /** @type {?number} */
  var valueSetIndex = null;
  var attrToValueSetIndex =
      security.html.contracts.ENUM_VALUE_SET_BY_ATTR_[elemName];
  if (attrToValueSetIndex) {
    valueSetIndex = attrToValueSetIndex[attrName];
  }
  if (!goog.isNumber(valueSetIndex)) {
    attrToValueSetIndex =
        security.html.contracts.ENUM_VALUE_SET_BY_ATTR_['*'];
    if (attrToValueSetIndex) {
      valueSetIndex = attrToValueSetIndex[attrName];
    }
    if (!goog.isNumber(valueSetIndex)) {
      return false;
    }
  }
  /** @type {!Object<string, boolean>} */
  var valueSet = security.html.contracts.ENUM_VALUE_SETS_[valueSetIndex];

  // Keyword values in HTML attribute values tend to be case insensitive.
  var lcValue = String(value).toLowerCase();

  // Comparing directly to true filters out values on Object.prototype.
  return true === valueSet[lcValue];
};


/**
 * Contracts that affect all elements unless there is an applicable
 * per-element contract.
 *
 * @type {!Object.<string,
 *                 security.html.contracts.AttrType>}
 * @private
 * @const
 */
security.html.contracts.GLOBAL_ATTRS_ = {
  'align': security.html.contracts.AttrType.NONE,
  'alt': security.html.contracts.AttrType.NONE,
  'autocapitalize': security.html.contracts.AttrType.NONE,
  'autocomplete': security.html.contracts.AttrType.NONE,
  'autocorrect': security.html.contracts.AttrType.NONE,
  'autofocus': security.html.contracts.AttrType.NONE,
  'bgcolor': security.html.contracts.AttrType.NONE,
  'border': security.html.contracts.AttrType.NONE,
  'checked': security.html.contracts.AttrType.NONE,
  'class': security.html.contracts.AttrType.NONE,
  'color': security.html.contracts.AttrType.NONE,
  'cols': security.html.contracts.AttrType.NONE,
  'colspan': security.html.contracts.AttrType.NONE,
  'dir': security.html.contracts.AttrType.ENUM,
  'disabled': security.html.contracts.AttrType.NONE,
  'draggable': security.html.contracts.AttrType.NONE,
  'face': security.html.contracts.AttrType.NONE,
  'for': security.html.contracts.AttrType.IDENTIFIER,
  'frameborder': security.html.contracts.AttrType.NONE,
  'height': security.html.contracts.AttrType.NONE,
  'hidden': security.html.contracts.AttrType.NONE,
  'href': security.html.contracts.AttrType.TRUSTED_RESOURCE_URL,
  'hreflang': security.html.contracts.AttrType.NONE,
  'id': security.html.contracts.AttrType.IDENTIFIER,
  'ismap': security.html.contracts.AttrType.NONE,
  'label': security.html.contracts.AttrType.NONE,
  'lang': security.html.contracts.AttrType.NONE,
  'list': security.html.contracts.AttrType.IDENTIFIER,
  'loop': security.html.contracts.AttrType.NONE,
  'max': security.html.contracts.AttrType.NONE,
  'maxlength': security.html.contracts.AttrType.NONE,
  'min': security.html.contracts.AttrType.NONE,
  'multiple': security.html.contracts.AttrType.NONE,
  'muted': security.html.contracts.AttrType.NONE,
  'name': security.html.contracts.AttrType.IDENTIFIER,
  'placeholder': security.html.contracts.AttrType.NONE,
  'preload': security.html.contracts.AttrType.NONE,
  'rel': security.html.contracts.AttrType.NONE,
  'required': security.html.contracts.AttrType.NONE,
  'reversed': security.html.contracts.AttrType.NONE,
  'role': security.html.contracts.AttrType.NONE,
  'rows': security.html.contracts.AttrType.NONE,
  'rowspan': security.html.contracts.AttrType.NONE,
  'selected': security.html.contracts.AttrType.NONE,
  'shape': security.html.contracts.AttrType.NONE,
  'size': security.html.contracts.AttrType.NONE,
  'sizes': security.html.contracts.AttrType.NONE,
  'span': security.html.contracts.AttrType.NONE,
  'spellcheck': security.html.contracts.AttrType.NONE,
  'src': security.html.contracts.AttrType.TRUSTED_RESOURCE_URL,
  'start': security.html.contracts.AttrType.NONE,
  'step': security.html.contracts.AttrType.NONE,
  'style': security.html.contracts.AttrType.SAFE_STYLE,
  'summary': security.html.contracts.AttrType.NONE,
  'tabindex': security.html.contracts.AttrType.NONE,
  'target': security.html.contracts.AttrType.ENUM,
  'title': security.html.contracts.AttrType.NONE,
  'translate': security.html.contracts.AttrType.NONE,
  'valign': security.html.contracts.AttrType.NONE,
  'value': security.html.contracts.AttrType.NONE,
  'width': security.html.contracts.AttrType.NONE,
  'wrap': security.html.contracts.AttrType.NONE,
};

/**
 * @typedef {
 *   {
 *     contract: security.html.contracts.AttrType,
 *     contingentAttribute: (string|undefined),
 *     requiredValue: (string|undefined)
 *   }
 * }
 */
security.html.contracts.AttributeContract_;

/**
 * Maps attribute names to details about the attribute.
 * @typedef {!Object.<string,
 *                    !Array.<!security.html.contracts.AttributeContract_>>}
 */
security.html.contracts.ElementContract_;


/**
 * Per element contracts.
 *
 * @type {!Object.<string,
 *                 !security.html.contracts.ElementContract_>}
 * @private
 * @const
 */
security.html.contracts.ELEMENT_CONTRACTS_ = {
  'a': {
    'href': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'area': {
    'href': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'audio': {
    'src': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'blockquote': {
    'cite': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'button': {
    'formaction': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
    'formmethod': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'type': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'command': {
    'type': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'del': {
    'cite': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'form': {
    'action': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
    'method': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'iframe': {
    'srcdoc': [
      {
        contract: security.html.contracts.AttrType.SAFE_HTML,
      },
    ],
  },
  'img': {
    'src': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'input': {
    'formaction': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
    'formmethod': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'pattern': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'readonly': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'src': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
    'type': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'ins': {
    'cite': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'li': {
    'type': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'link': {
    'href': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'alternate'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'author'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'bookmark'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'canonical'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'cite'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'help'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'icon'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'license'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'next'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'prefetch'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'prerender'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'preconnect'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'preload'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'prev'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'search'
      },
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
        contingentAttribute: 'rel',
        requiredValue: 'subresource'
      },
    ],
    'media': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'nonce': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'type': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'menuitem': {
    'icon': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'ol': {
    'type': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'q': {
    'cite': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'script': {
    'nonce': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'source': {
    'media': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'src': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
  'style': {
    'media': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'nonce': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'time': {
    'datetime': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
  },
  'video': {
    'autoplay': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'controls': [
      {
        contract: security.html.contracts.AttrType.NONE,
      },
    ],
    'poster': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
    'src': [
      {
        contract: security.html.contracts.AttrType.SAFE_URL,
      },
    ],
  },
};


/**
 * The type of text content per element.
 *
 * @type {!Object.<string, security.html.contracts.ElementContentType>}
 * @private
 * @const
 */
security.html.contracts.ELEMENT_CONTENT_TYPES_ = {
  'a': security.html.contracts.ElementContentType.SAFE_HTML,
  'abbr': security.html.contracts.ElementContentType.SAFE_HTML,
  'address': security.html.contracts.ElementContentType.SAFE_HTML,
  'applet': security.html.contracts.ElementContentType.BLACKLIST,
  'area': security.html.contracts.ElementContentType.VOID,
  'article': security.html.contracts.ElementContentType.SAFE_HTML,
  'aside': security.html.contracts.ElementContentType.SAFE_HTML,
  'audio': security.html.contracts.ElementContentType.SAFE_HTML,
  'b': security.html.contracts.ElementContentType.SAFE_HTML,
  'base': security.html.contracts.ElementContentType.BLACKLIST,
  'bdi': security.html.contracts.ElementContentType.SAFE_HTML,
  'bdo': security.html.contracts.ElementContentType.SAFE_HTML,
  'blockquote': security.html.contracts.ElementContentType.SAFE_HTML,
  'body': security.html.contracts.ElementContentType.SAFE_HTML,
  'br': security.html.contracts.ElementContentType.VOID,
  'button': security.html.contracts.ElementContentType.SAFE_HTML,
  'canvas': security.html.contracts.ElementContentType.SAFE_HTML,
  'caption': security.html.contracts.ElementContentType.SAFE_HTML,
  'cite': security.html.contracts.ElementContentType.SAFE_HTML,
  'code': security.html.contracts.ElementContentType.SAFE_HTML,
  'col': security.html.contracts.ElementContentType.VOID,
  'colgroup': security.html.contracts.ElementContentType.SAFE_HTML,
  'command': security.html.contracts.ElementContentType.SAFE_HTML,
  'data': security.html.contracts.ElementContentType.SAFE_HTML,
  'datalist': security.html.contracts.ElementContentType.SAFE_HTML,
  'dd': security.html.contracts.ElementContentType.SAFE_HTML,
  'del': security.html.contracts.ElementContentType.SAFE_HTML,
  'details': security.html.contracts.ElementContentType.SAFE_HTML,
  'dfn': security.html.contracts.ElementContentType.SAFE_HTML,
  'dialog': security.html.contracts.ElementContentType.SAFE_HTML,
  'div': security.html.contracts.ElementContentType.SAFE_HTML,
  'dl': security.html.contracts.ElementContentType.SAFE_HTML,
  'dt': security.html.contracts.ElementContentType.SAFE_HTML,
  'em': security.html.contracts.ElementContentType.SAFE_HTML,
  'embed': security.html.contracts.ElementContentType.BLACKLIST,
  'fieldset': security.html.contracts.ElementContentType.SAFE_HTML,
  'figcaption': security.html.contracts.ElementContentType.SAFE_HTML,
  'figure': security.html.contracts.ElementContentType.SAFE_HTML,
  'font': security.html.contracts.ElementContentType.SAFE_HTML,
  'footer': security.html.contracts.ElementContentType.SAFE_HTML,
  'form': security.html.contracts.ElementContentType.SAFE_HTML,
  'frame': security.html.contracts.ElementContentType.SAFE_HTML,
  'frameset': security.html.contracts.ElementContentType.SAFE_HTML,
  'h1': security.html.contracts.ElementContentType.SAFE_HTML,
  'h2': security.html.contracts.ElementContentType.SAFE_HTML,
  'h3': security.html.contracts.ElementContentType.SAFE_HTML,
  'h4': security.html.contracts.ElementContentType.SAFE_HTML,
  'h5': security.html.contracts.ElementContentType.SAFE_HTML,
  'h6': security.html.contracts.ElementContentType.SAFE_HTML,
  'head': security.html.contracts.ElementContentType.SAFE_HTML,
  'header': security.html.contracts.ElementContentType.SAFE_HTML,
  'hr': security.html.contracts.ElementContentType.VOID,
  'html': security.html.contracts.ElementContentType.SAFE_HTML,
  'i': security.html.contracts.ElementContentType.SAFE_HTML,
  'iframe': security.html.contracts.ElementContentType.SAFE_HTML,
  'img': security.html.contracts.ElementContentType.VOID,
  'input': security.html.contracts.ElementContentType.VOID,
  'ins': security.html.contracts.ElementContentType.SAFE_HTML,
  'kbd': security.html.contracts.ElementContentType.SAFE_HTML,
  'keygen': security.html.contracts.ElementContentType.VOID,
  'label': security.html.contracts.ElementContentType.SAFE_HTML,
  'legend': security.html.contracts.ElementContentType.SAFE_HTML,
  'li': security.html.contracts.ElementContentType.SAFE_HTML,
  'link': security.html.contracts.ElementContentType.VOID,
  'main': security.html.contracts.ElementContentType.SAFE_HTML,
  'map': security.html.contracts.ElementContentType.SAFE_HTML,
  'mark': security.html.contracts.ElementContentType.SAFE_HTML,
  'math': security.html.contracts.ElementContentType.BLACKLIST,
  'menu': security.html.contracts.ElementContentType.SAFE_HTML,
  'menuitem': security.html.contracts.ElementContentType.SAFE_HTML,
  'meta': security.html.contracts.ElementContentType.BLACKLIST,
  'meter': security.html.contracts.ElementContentType.SAFE_HTML,
  'nav': security.html.contracts.ElementContentType.SAFE_HTML,
  'noscript': security.html.contracts.ElementContentType.SAFE_HTML,
  'object': security.html.contracts.ElementContentType.BLACKLIST,
  'ol': security.html.contracts.ElementContentType.SAFE_HTML,
  'optgroup': security.html.contracts.ElementContentType.SAFE_HTML,
  'option': security.html.contracts.ElementContentType.SAFE_HTML,
  'output': security.html.contracts.ElementContentType.SAFE_HTML,
  'p': security.html.contracts.ElementContentType.SAFE_HTML,
  'param': security.html.contracts.ElementContentType.VOID,
  'picture': security.html.contracts.ElementContentType.SAFE_HTML,
  'pre': security.html.contracts.ElementContentType.SAFE_HTML,
  'progress': security.html.contracts.ElementContentType.SAFE_HTML,
  'q': security.html.contracts.ElementContentType.SAFE_HTML,
  'rb': security.html.contracts.ElementContentType.SAFE_HTML,
  'rp': security.html.contracts.ElementContentType.SAFE_HTML,
  'rt': security.html.contracts.ElementContentType.SAFE_HTML,
  'rtc': security.html.contracts.ElementContentType.SAFE_HTML,
  'ruby': security.html.contracts.ElementContentType.SAFE_HTML,
  's': security.html.contracts.ElementContentType.SAFE_HTML,
  'samp': security.html.contracts.ElementContentType.SAFE_HTML,
  'script': security.html.contracts.ElementContentType.SAFE_SCRIPT,
  'section': security.html.contracts.ElementContentType.SAFE_HTML,
  'select': security.html.contracts.ElementContentType.SAFE_HTML,
  'slot': security.html.contracts.ElementContentType.SAFE_HTML,
  'small': security.html.contracts.ElementContentType.SAFE_HTML,
  'source': security.html.contracts.ElementContentType.VOID,
  'span': security.html.contracts.ElementContentType.SAFE_HTML,
  'strong': security.html.contracts.ElementContentType.SAFE_HTML,
  'style': security.html.contracts.ElementContentType.SAFE_STYLESHEET,
  'sub': security.html.contracts.ElementContentType.SAFE_HTML,
  'summary': security.html.contracts.ElementContentType.SAFE_HTML,
  'sup': security.html.contracts.ElementContentType.SAFE_HTML,
  'svg': security.html.contracts.ElementContentType.BLACKLIST,
  'table': security.html.contracts.ElementContentType.SAFE_HTML,
  'tbody': security.html.contracts.ElementContentType.SAFE_HTML,
  'td': security.html.contracts.ElementContentType.SAFE_HTML,
  'template': security.html.contracts.ElementContentType.BLACKLIST,
  'textarea': security.html.contracts.ElementContentType.STRING_RCDATA,
  'tfoot': security.html.contracts.ElementContentType.SAFE_HTML,
  'th': security.html.contracts.ElementContentType.SAFE_HTML,
  'thead': security.html.contracts.ElementContentType.SAFE_HTML,
  'time': security.html.contracts.ElementContentType.SAFE_HTML,
  'title': security.html.contracts.ElementContentType.STRING_RCDATA,
  'tr': security.html.contracts.ElementContentType.SAFE_HTML,
  'track': security.html.contracts.ElementContentType.VOID,
  'u': security.html.contracts.ElementContentType.SAFE_HTML,
  'ul': security.html.contracts.ElementContentType.SAFE_HTML,
  'var': security.html.contracts.ElementContentType.SAFE_HTML,
  'video': security.html.contracts.ElementContentType.SAFE_HTML,
  'wbr': security.html.contracts.ElementContentType.VOID,
};


/**
 * Sets of element values allowed for attributes with AttrType ENUM.
 * @type {!Array.<!Object<string,boolean>>}
 * @private
 * @const
 */
security.html.contracts.ENUM_VALUE_SETS_ = [
  {
    'auto': true,
    'ltr': true,
    'rtl': true,
  },
  {
    '_self': true,
    '_blank': true,
  },
];


/**
 * Maps element names (or '*' for global) to maps of attribute names
 * to indices into the ENUM_VALUE_SETS_ array.
 * @type {!Object.<string, !Object<string, number>>}
 * @private
 * @const
 */
security.html.contracts.ENUM_VALUE_SET_BY_ATTR_ = {
  '*': {
    'dir': 0,
    'target': 1,
  },
};
