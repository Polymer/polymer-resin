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

// TODO: check that this is running early in the application booting
// process.  Maybe check that web components are not ready.
// Will that cause problems if parts of the web components API are defined
// natively instead of polyfilled?

goog.provide('security.polymer_resin.allowIdentifierWithPrefix');

goog.require('goog.dom.NodeType');
goog.require('goog.html.SafeHtml');
goog.require('goog.html.SafeScript');
goog.require('goog.html.SafeStyle');
goog.require('goog.html.SafeUrl');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.string');
goog.require('goog.string.Const');
goog.require('goog.string.TypedString');
goog.require('security.html.contracts');
goog.require('security.html.namealiases');
goog.require('security.polymer_resin.CustomElementClassification');
goog.require('security.polymer_resin.classifyElement');
goog.require('security.polymer_resin.hintUsesDeprecatedRegisterElement');


/**
 * Maps Safe HTML types to handlers.
 *
 * @typedef {!{
 *   filter:          ?function(string, string, string):string,
 *   safeReplacement: ?string,
 *   typeToUnwrap:    ?Function,
 *   unwrap:          ?function(?):string
 * }}
 */
var ValueHandler;


/**
 * Specifies that attributes with type IDENTIFIER that have the given
 * prefix should be allowed.
 *
 * May be called multiple times with different prefixes.  The allowed
 * identifiers are the union of those allowed by all calls.
 *
 * By default, only the empty identifier is allowed.
 *
 * @param {string} prefix A string prefix.  The empty string is a prefix
 *    of all strings.
 */
security.polymer_resin.allowIdentifierWithPrefix = function (prefix) {
  security.polymer_resin.allowedIdentifierPattern_ = new RegExp(
      security.polymer_resin.allowedIdentifierPattern_.source
      + '|^' + goog.string.regExpEscape(prefix));
};
goog.exportSymbol(
    'security.polymer_resin.allowIdentifierWithPrefix',
    security.polymer_resin.allowIdentifierWithPrefix);


/**
 * @type {!RegExp}
 * @private
 */
security.polymer_resin.allowedIdentifierPattern_ = /^$/;
// This allows the empty identifier by default, which is redundant with
// the falsey value check in sanitize below, so effectively grants no
// authority.


(function () {
  "use strict";

  function initResin() {
    // TODO: check not in IE quirks mode.
    console.log('initResin');

    /**
     * @param {string} name
     * @this {!Element}
     * @return {*} null indicates unknown.
     */
    function getAttributeValue(name) {
      var value = this.getAttribute(name);
      if (!value || /[\[\{]/.test(name)) {
        // If a value contains '[' or '{',
        // assume that it is a bound attribute for which
        // we have not yet computed a value.
        // The consumer of this function cares only about
        // keyword values, so this loses us nothing.
        return null;
      }
      return value;
    }

    /**
     * Uncustomized versions of custom-builtin objects.
     * {@type Object.<string, !Element>}
     */
    var uncustomizedProxies = {};

    /**
     * An element that only has global attribute aliases.
     * @type {!Element}
     */
    var VANILLA_HTML_ELEMENT_ = document.createElement('polyresinuncustomized');

    /**
     * @param {!Element} element
     * @return {!Element}
     */
    function getUncustomizedProxy(element) {
      var elementName = element.localName;
      var customBuiltinElementName = element.getAttribute('is');

      if (!customBuiltinElementName) {
        // TODO: Test what happens when a Polymer element defines property
        // constructor.
        // Possible workaround:
        // 1. assert element instanceof element.constructor or
        // 2. use Object.getPrototypeOf(element).constructor.
        /** @type {security.polymer_resin.CustomElementClassification} */
        var classification = security.polymer_resin.classifyElement(
            elementName, /** @type{!Function} */(element.constructor));
        if (classification
            === security.polymer_resin.CustomElementClassification.CUSTOM) {
          // Custom elements have a layer between them and their prototype, so
          // we should not treat own properties assigned in the custom element's
          // constructor as builtin attribute aliases.
          return VANILLA_HTML_ELEMENT_;
        }
      }

      // For normal custom elements, the builtin property setters are defined
      // on a prototype, so we can check hasOwnProperty.
      // For custom builtin properties we can't do that since the object is
      // a builtin object that then has custom stuff mixed in.
      // We use a non-customized version of the builtin and check that.
      var uncustomizedProxy = uncustomizedProxies[elementName];
      if (!uncustomizedProxy) {
        uncustomizedProxy = uncustomizedProxies[elementName] =
            document.createElement(elementName);
      }
      return uncustomizedProxy;
    }

    /**
     * Filters and unwraps new property values in preparation for them
     * being attached to custom elements.
     *
     * @param {!Node} node a custom element, builtin element, or text node.
     * @param {string} name the name of the property
     * @param {string} type whether name is a 'property' or 'attribute' name.
     * @param {*} value a value that may have originated outside this document's
     *    origin.
     * @return {*} a value that is safe to embed in this document's origin.
     */
    function sanitize(node, name, type, value) {
      if (!value) {
        // We allow clearing properties and initial values.
        // This does mean that the following strings could be introduced into
        // safe string contexts:
        //     "", "null", "undefined", "0", "NaN", "false"
        // I consider these values innocuous.
        return value;
      }

      var nodeType = node.nodeType;
      if (nodeType !== goog.dom.NodeType.ELEMENT) {
        // TODO: does polymer use CDATA sections?
        if (nodeType === goog.dom.NodeType.TEXT) {
          // Whitelist and handle text node interpolation by checking
          // the content type of the parent node.
          var parentElement = node.parentElement;
          if (parentElement
              && parentElement.nodeType === goog.dom.NodeType.ELEMENT) {
            var parentElementName = parentElement.localName;
            var parentClassification = security.polymer_resin.classifyElement(
                parentElementName,
                /** @type{!Function} */(parentElement.constructor));
            var allowText = false;
            switch (parentClassification) {
              case security.polymer_resin.CustomElementClassification.BUILTIN:
              case security.polymer_resin.CustomElementClassification.LEGACY:
                var contentType = security.html.contracts.contentTypeForElement(
                    parentElementName);
                allowText = contentType
                    === security.html.contracts.ElementContentType.SAFE_HTML;
                break;
              case security.polymer_resin.CustomElementClassification.CUSTOMIZABLE:
              case security.polymer_resin.CustomElementClassification.CUSTOM:
                // Allow text in custom elements.
                allowText = true;
                break;
            }
            if (allowText) {
              return (
                  !!(value && value.implementsGoogStringTypedString)
                  ? (/** @type {!goog.string.TypedString} */(value))
                    .getTypedStringValue()
                  : String(value));
            }
          }
        }
        if (goog.DEBUG && 'undefined' !== typeof console) {
          console.warn('Failed to sanitize text %o in %o',
                       value, node.parentElement);
        }
        return INNOCUOUS_STRING;
      }

      var element = /** @type {!Element} */(node);
      var elementName = element.localName;

      // Check whether an uncustomized version has an own property.
      var elementProxy = getUncustomizedProxy(element);

      switch (type) {
        case 'attribute':
          // TODO: figure out why attr-property-aliasing test doesn't seem to be
          // reaching this branch but running under Polymer 1.7 inside
          // polygerrit does.
          var propName = security.html.namealiases.attrToProperty(name);
          if (propName in elementProxy) {
            break;
          }
          return value;
        case 'property':
          if (name in elementProxy) {
            break;
          }
          var worstCase =
              security.html.namealiases.specialPropertyNameWorstCase(name);
          if (worstCase && worstCase in elementProxy) {
            break;
          }
          return value;
        default:
          throw new Error(type + ': ' + typeof type);
      }

      /**
       * The HTML attribute name.
       * @type {string}
       */
      var attrName =
          (type == 'attribute')  // Closed set tested in switch above
          // toLowerCase is Turkish-I safe because
          // www.ecma-international.org/ecma-262/6.0/#sec-string.prototype.tolowercase
          // says
          // """
          // 5. For each code point c in cpList, if the Unicode Character
          // Database provides a LANGUAGE INSENSITIVE lower case equivalent of c
          // then replace c in cpList with that equivalent code point(s).
          // ""
          // modulo bugs in old versions of Rhino.
          ? name.toLowerCase()
          : security.html.namealiases.propertyToAttr(name);

      /** @type {?security.html.contracts.AttrType} */
      var attrType = security.html.contracts.typeOfAttribute(
          elementName, attrName, goog.bind(getAttributeValue, element));
      /** @type {string} */
      var safeValue = INNOCUOUS_STRING;
      if (attrType != null) {
        /** @type {!ValueHandler} */
        var valueHandler = VALUE_HANDLERS_[attrType];
        if (valueHandler.typeToUnwrap
            && value instanceof valueHandler.typeToUnwrap) {
          return valueHandler.unwrap(value);
        }
        var stringValue =
            !!(value && value.implementsGoogStringTypedString)
            ? (/** @type {!goog.string.TypedString} */(value))
              .getTypedStringValue()
            : String(value);
        safeValue =
            valueHandler.filter
            ? valueHandler.filter(elementName, attrName, stringValue)
            : stringValue;
        if (safeValue !== valueHandler.safeReplacement) {
          return safeValue;
        }
      }
      if (goog.DEBUG && 'undefined' !== typeof console) {
        console.warn('Failed to sanitize <%s %s="%o">',
                     elementName, attrName, value);
      }
      return safeValue;
    }

    // Now, install the sanitizer.
    // There are two code-paths below for Polymer V1 and V2.
    // The code could be consolidated, except that
    // 1. In both cases I want to first delegate to any previously
    //    registered handler.
    // 2. If I tried to express the V1 logic in terms of V2, I would need
    //    to thread the info object through somehow hacky.
    // 3. I don't want to express the V2 logic in terms of V1 since the V1
    //    will hopefully eventually go away entirely.
    // So I just duplicate the logic which goes through these steps:
    // 1. fetch any previously declared function
    // 2. define an adapter
    // 3. install the adapter
    // 4. sanity check that the adapter was installed.
    if (/^1\./.test(Polymer.version)) {
      // In Polymer v1, the Polymer(...) method uses the deprecated
      // document.registerElement instead of window.customElements.
      security.polymer_resin.hintUsesDeprecatedRegisterElement();

      // sanitizeDOMValue is not defined for v1.
      // See https://github.com/Polymer/polymer/issues/4138
      var origCompute = Polymer.Base._computeFinalAnnotationValue;
      var computeFinalAnnotationSafeValue =
          function computeFinalAnnotationValue(node, property, value, info) {
            var finalValue = origCompute.call(
                Polymer.Base, node, property, value, info);
            var type = 'property';
            var name;
            if (info && info.propertyName) {
              name = info.propertyName;
            } else {
              name = property;
              type = info && info.kind || 'property';
            }

            return sanitize(node, name, type, finalValue);
          };
      Polymer.Base._computeFinalAnnotationValue =
          computeFinalAnnotationSafeValue;
      if (Polymer.Base._computeFinalAnnotationValue
          !== computeFinalAnnotationSafeValue) {
        // We're in use strict, so assignment should fail-fast, but
        // this is cheap.
        throw new Error(
            'Cannot replace _computeFinalAnnotationValue.  Is Polymer frozen?');
      }
    } else {
      var origSanitize = Polymer.sanitizeDOMValue;
      var sanitizeDOMValue =
          function sanitizeDOMValue(value, name, type, node) {
            var sanitizedValue = origSanitize
                ? origSanitize.call(Polymer, value, name, type, node)
                : value;
            return sanitize(node, name, type, sanitizedValue);
          };
      Polymer.sanitizeDOMValue = sanitizeDOMValue;
      if (Polymer.sanitizeDOMValue !== sanitizeDOMValue) {
        // We're in use strict, so assignment should fail-fast, but
        // this is cheap.
        throw new Error(
            'Cannot install sanitizeDOMValue.  Is Polymer frozen?');
      }
    }
  }


  /**
   * Analogous to goog.html.SafeUrl.INNOCUOUS_STRING but
   * used for const strings and safe html types that
   * do not have their own defined.
   * @const
   */
  var INNOCUOUS_STRING = 'zClosurez';

  /** @const */
  var INNOCUOUS_SCRIPT = '/*zClosurez*/';

  /**
   * @type {!Array.<!ValueHandler>}
   */
  var VALUE_HANDLERS_ = [];
  VALUE_HANDLERS_[security.html.contracts.AttrType.NONE] = {
    // A function that maps values to safe values or that
    // returns a safe replacement value.
    filter: null,
    // A safe value that indicates a problem likely occurred
    // so an event is worth logging.
    safeReplacement: null,
    // Constructor for a subtype of TypedString to unwrap
    typeToUnwrap: null,
    // Unwraps values that are instanceof typeToUnwrap
    unwrap: null
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.SAFE_HTML] = {
    // Assigning a string to srchtml is the same as
    // assigning a text node.
    filter: (
        /**
         * Converts plain text to HTML that parses to a text node with
         * equivalent content.
         *
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function plainTextToHtml(a, e, v) {
          return goog.string.htmlEscape(v);
        }),
    safeReplacement: null,
    typeToUnwrap: goog.html.SafeHtml,
    unwrap: goog.html.SafeHtml.unwrap
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.SAFE_URL] = {
    filter: (
        /**
         * Allows safe URLs through, but rejects unsafe ones.
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function allowSafeUrl(e, a, v) {
          // TODO: Can we do without creating a SafeUrl instance?
          return goog.html.SafeUrl.sanitize(v).getTypedStringValue();
        }),
    safeReplacement: goog.html.SafeUrl.INNOCUOUS_STRING,
    typeToUnwrap: goog.html.SafeUrl,
    unwrap: goog.html.SafeUrl.unwrap
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.TRUSTED_RESOURCE_URL] = {
    filter: (
        /**
         * Just returns the safe replacement value because we have no
         * way of declaring that a raw string is a trusted resource so
         * rely on RTTI in all cases.
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function disallowTrustedResourceUrl(e, a, v) {
          return goog.html.SafeUrl.INNOCUOUS_STRING;
        }),
    safeReplacement: goog.html.SafeUrl.INNOCUOUS_STRING,
    typeToUnwrap: goog.html.TrustedResourceUrl,
    unwrap: goog.html.TrustedResourceUrl.unwrap
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.SAFE_STYLE] = {
    filter: (
        /**
         * Just returns the safe replacement value since we have no
         * way of testing that a raw string is a safe style.
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function disallowSafeStyle(e, a, v) {
          return goog.html.SafeStyle.INNOCUOUS_STRING;
        }),
    safeReplacement: goog.html.SafeStyle.INNOCUOUS_STRING,
    typeToUnwrap: goog.html.SafeStyle,
    unwrap: goog.html.SafeStyle.unwrap
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.SAFE_SCRIPT] = {
    filter: (
        /**
         * Just returns the safe replacement value since we have no
         * way of testing that a raw string is a safe script.
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function disallowSafeScript(e, a, v) {
          return INNOCUOUS_SCRIPT;
        }),
    safeReplacement: INNOCUOUS_SCRIPT,
    typeToUnwrap: goog.html.SafeScript,
    unwrap: goog.html.SafeScript.unwrap
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.ENUM] = {
    filter: (
        /**
         * Checks that the input is allowed for the given attribute on the
         * given element.
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string} v lowercased if allowed, or the safe replacement
         *   otherwise.
         */
        function (e, a, v) {
          var lv = String(v).toLowerCase();
          return security.html.contracts.isEnumValueAllowed(e, a, lv)
              ? lv : INNOCUOUS_STRING;
        }),
    safeReplacement: INNOCUOUS_STRING,
    typeToUnwrap: null,
    unwrap: null
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.COMPILE_TIME_CONSTANT] = {
    filter: (
        /**
         * Just returns the safe replacement value.
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function disallow(e, a, v) {
          return INNOCUOUS_SCRIPT;
        }),
    safeReplacement: INNOCUOUS_STRING,
    typeToUnwrap: goog.string.Const,
    unwrap: goog.string.Const.unwrap
  };
  VALUE_HANDLERS_[security.html.contracts.AttrType.IDENTIFIER] = {
    filter: (
        /**
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function allowIdentifier(e, a, v) {
          return security.polymer_resin.allowedIdentifierPattern_.test(v)
              ? v
              : INNOCUOUS_STRING;
        }),
    safeReplacement: INNOCUOUS_STRING,
    typeToUnwrap: goog.string.Const,
    unwrap: goog.string.Const.unwrap
  };


  // This assumes that imports have not already fired.
  if (typeof Polymer !== 'undefined' && Polymer.version) {
    initResin();
  } else {
    window.addEventListener('HTMLImportsLoaded', initResin);
  }
}());
