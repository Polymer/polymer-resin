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

"use strict";


/**
 * @fileoverview
 * Mitigates XSS in Polymer applications by intercepting and vetting
 * results of data binding expressions before they reach browser internals.
 */


goog.provide('security.polymer_resin');

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
 * @define {boolean} whether bundled with its dependencies while
 *     exporting its public API.
 */
goog.define('security.polymer_resin.STANDALONE', false);

/**
 * Type for a configuration object that can be passed to install.
 *
 * <hr>
 *
 * When {@code UNSAFE_passThruDisallowedValues} is {@code true},
 * disallowed values will not be replaced so may reach
 * unsafe browser sinks resulting in a security vulnerability.
 * <p>
 * This mode is provided only to allow testing of an application
 * to find and compile the kinds of false positives triggered by
 * an application that is being migrated to use polymer resin.
 * <p>
 * This MUST NOT be used in production with end users and
 * MUST NOT be set based on any attacker-controllable state like
 * URL parameters.
 * <p>
 * If you never specify this property, you are safer.
 *
 * <p>
 * When not in goog.DEBUG mode, this is ignored.
 *
 * <hr>
 *
 * {@code allowedIdentifierPrefixes} specifies prefixes for allowed values
 * for attributes with type IDENTIFIER.
 * <p>
 * By default, only the empty identifier is allowed.
 *
 * <hr>
 *
 * {@code reportHandler} is a callback that receives reports about rejected
 * values and module status
 * <p>
 * By default, if {@code goog.DEBUG} is false at init time, reportHandler is
 * never called, and if {@code goog.DEBUG} is true at init time, reportHandler
 * logs to the JS developer console.
 * <p>
 * Assuming it is enabled, either via {@code goog.DEBUG} or an explicit call to
 * this setter, then it is called on every rejected value, and on major events
 * like module initialization.
 * <p>
 * This may be used to identify false positives during debugging; to compile
 * lists of false positives when migrating; or to gather telemetry by
 * compiling a table summarizing disallowed value reports.
 *
 * @typedef {{
 *   'UNSAFE_passThruDisallowedValues': (?boolean | undefined),
 *   'allowedIdentifierPrefixes': (?Array.<string> | undefined),
 *   'reportHandler': (security.polymer_resin.ReportHandler | undefined)
 * }}
 */
security.polymer_resin.Configuration;


/**
 * A function that takes (isDisallowedValue, printfFormatString, printfArgs).
 * The arguments are ready to forward straight to the console with minimal
 * overhead.
 * <p>
 * If isDisallowedValue is true then the args have the printArgs have the form
 * [contextNodeName, nodeName, attributeOrPropertyName, disallowedValue].
 * <p>
 * The context node is the element being manipulated, or if nodeName is
 * {@code "#text"},
 * then contextNode is the parent of the text node being manipulated, so
 * the contextNode should always be an element or document fragment.
 * In that case, attributeOrPropertyName can be ignored.
 * <p>
 * If null then reporting is disabled.
 *
 * @typedef {?function (boolean, string, ...*)}
 */
security.polymer_resin.ReportHandler;


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
security.polymer_resin.ValueHandler;


/**
 * A report handler that logs to the browser's developer console.
 * <p>
 * This report handler is used if none is explicitly specified and
 * goog.DEBUG is true at install time.
 * <p>
 * Violations (see isViolation in ReportHandler docs) are logged as warnings.
 * Logging an error while running tests causes some  unit testing frameworks
 * to report the test as failing.  Tests that wish to assert that polymer-resin
 * is denying a value can instead check for the innocuous value.
 * <p>
 * Exceptions thrown by a report handler will propagate out of polymer-resin
 * so a test suite may install a report handler that throws if unsafe
 * value assignment should correspond to test failure.
 *
 * @type {!security.polymer_resin.ReportHandler}
 * @const
 */
security.polymer_resin.CONSOLE_LOGGING_REPORT_HANDLER =
    function (isViolation, formatString, var_args) {
      var consoleArgs = [formatString];
      for (var i = 2, n = arguments.length; i < n; ++i) {
        consoleArgs[i - 1] = arguments[i];
      }
      if (isViolation) {
        console.warn.apply(console, consoleArgs);
      } else {
        console.log.apply(console, consoleArgs);
      }
    };


/**
 * When called with (true), disallowed values will not be replaced so may reach
 * unsafe browser sinks resulting in a security violation.
 * <p>
 * This mode is provided only to allow testing of an application
 * to find and compile the kinds of false positives triggered by
 * an application that is being migrated to use polymer resin.
 * <p>
 * This MUST NOT be used in production with end users and
 * MUST NOT be set based on any attacker-controllable state like
 * URL parameters.
 * <p>
 * If you never call this function, you are safer.
 *
 * <p>
 * When not in goog.DEBUG mode, this is a no-op.
 *
 * @param {boolean} enable Pass true to enable UNSAFE mode.
 * @private
 */
security.polymer_resin.UNSAFE_passThruDisallowedValues_ = function (enable) {
  if (goog.DEBUG) {
    security.polymer_resin.allowUnsafeValues_ = enable === true;
  }
};


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
 * @private
 */
security.polymer_resin.allowIdentifierWithPrefix_ = function (prefix) {
  security.polymer_resin.allowedIdentifierPattern_ = new RegExp(
      security.polymer_resin.allowedIdentifierPattern_.source
      + '|^' + goog.string.regExpEscape(prefix));
};

/**
 * Sets a callback to receive reports about rejected values and module status.
 *
 * @param {?security.polymer_resin.ReportHandler} reportHandler
 * @private
 */
security.polymer_resin.setReportHandler_ = function (reportHandler) {
  security.polymer_resin.reportHandler_ = reportHandler || null;
};

/**
 * @type {!RegExp}
 * @private
 */
security.polymer_resin.allowedIdentifierPattern_ = /^$/;
// This allows the empty identifier by default, which is redundant with
// the falsey value check in sanitize below, so effectively grants no
// authority.


/**
 * @type {boolean}
security.polymer_resin.ViolationHandlingMode}
 * @private
 */
security.polymer_resin.allowUnsafeValues_ = false;


/**
 * Undefined means never set (see default behavior under docs for
 * setter above), null means disabled.
 *
 * @type {security.polymer_resin.ReportHandler|null|undefined}
 * @private
 */
security.polymer_resin.reportHandler_ = undefined;


/**
 * Start polymer resin.
 * This must be done before the first application element is instantiated
 * (see getting-started.md for details).
 *
 * @param {?security.polymer_resin.Configuration=} opt_config
 *   An optional configuration object.
 */
security.polymer_resin.install = function (opt_config) {
  // TODO: What to do if called multiple times?
  if (opt_config) {
    var configUnsafePassThruDisallowedValues =
        opt_config['UNSAFE_passThruDisallowedValues'];
    var configAllowedIdentifierPrefixes =
        opt_config['allowedIdentifierPrefixes'];
    var configReportHandler = opt_config['reportHandler'];

    if (configUnsafePassThruDisallowedValues != null) {
      security.polymer_resin.UNSAFE_passThruDisallowedValues_(
          configUnsafePassThruDisallowedValues);
    }

    if (configAllowedIdentifierPrefixes) {
      for (var i = 0, n = configAllowedIdentifierPrefixes.length; i < n; ++i) {
        security.polymer_resin.allowIdentifierWithPrefix_(
            configAllowedIdentifierPrefixes[i]);
      }
    }

    if (configReportHandler !== undefined) {
      security.polymer_resin.setReportHandler_(configReportHandler);
    }
  }

  if (goog.DEBUG && security.polymer_resin.reportHandler_ === undefined
      && typeof console !== 'undefined') {
    security.polymer_resin.setReportHandler_(
        security.polymer_resin.CONSOLE_LOGGING_REPORT_HANDLER);
  }

  // TODO: check not in IE quirks mode.
  if (security.polymer_resin.reportHandler_) {
    // Emitting this allows an integrator to tell where resin is
    // installing relative to other code that is running in the app.
    security.polymer_resin.reportHandler_(false, 'initResin');
  }

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
        var allowText = !parentElement;
        if (parentElement
            && parentElement.nodeType === goog.dom.NodeType.ELEMENT) {
          var parentElementName = parentElement.localName;
          var parentClassification = security.polymer_resin.classifyElement(
              parentElementName,
              /** @type{!Function} */(parentElement.constructor));
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
        }
        if (allowText) {
          return (
              !!(value && value.implementsGoogStringTypedString)
              ? (/** @type {!goog.string.TypedString} */(value))
                .getTypedStringValue()
              : String(value));
        }
      }

      if (security.polymer_resin.reportHandler_) {
        security.polymer_resin.reportHandler_(
            true, 'Failed to sanitize %s %s%s node to value %O',
            node.parentElement && node.parentElement.nodeName,
            '#text', '', value);
      }

      return security.polymer_resin.INNOCUOUS_STRING_;
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
    var safeValue = security.polymer_resin.INNOCUOUS_STRING_;
    if (attrType != null) {
      /** @type {!security.polymer_resin.ValueHandler} */
      var valueHandler = security.polymer_resin.VALUE_HANDLERS_[attrType];
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
    if (security.polymer_resin.reportHandler_) {
      security.polymer_resin.reportHandler_(
          true, 'Failed to sanitize in %s: <%s %s="%O">',
          elementName, elementName, attrName, value);
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

          var safeValue = sanitize(node, name, type, finalValue);

          return (
              security.polymer_resin.allowUnsafeValues_
              ? finalValue : safeValue);
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
          var origSanitizedValue = origSanitize
              ? origSanitize.call(Polymer, value, name, type, node)
              : value;
          var safeValue = sanitize(node, name, type, origSanitizedValue);

          return (
              security.polymer_resin.allowUnsafeValues_
              ? origSanitizedValue : safeValue);
        };
    Polymer.sanitizeDOMValue = sanitizeDOMValue;
    if (Polymer.sanitizeDOMValue !== sanitizeDOMValue) {
      // We're in use strict, so assignment should fail-fast, but
      // this is cheap.
      throw new Error(
          'Cannot install sanitizeDOMValue.  Is Polymer frozen?');
    }
  }
};


/**
 * Analogous to goog.html.SafeUrl.INNOCUOUS_STRING but
 * used for const strings and safe html types that
 * do not have their own defined.
 * @const
 * @private
 */
security.polymer_resin.INNOCUOUS_STRING_ = 'zClosurez';

/**
 * @const
 * @private
 */
security.polymer_resin.INNOCUOUS_SCRIPT_ = ' /*zClosurez*/ ';

/**
 * @type {!Array.<!security.polymer_resin.ValueHandler>}
 * @const
 * @private
 */
security.polymer_resin.VALUE_HANDLERS_ = [];
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.NONE] = {
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
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.SAFE_HTML] = {
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
      function plainTextToHtml(e, a, v) {
        return goog.string.htmlEscape(v);
      }),
  safeReplacement: null,
  typeToUnwrap: goog.html.SafeHtml,
  unwrap: goog.html.SafeHtml.unwrap
};
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.SAFE_URL] = {
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
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.TRUSTED_RESOURCE_URL] = {
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
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.SAFE_STYLE] = {
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
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.SAFE_SCRIPT] = {
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
        return security.polymer_resin.INNOCUOUS_SCRIPT_;
      }),
  safeReplacement: security.polymer_resin.INNOCUOUS_SCRIPT_,
  typeToUnwrap: goog.html.SafeScript,
  unwrap: goog.html.SafeScript.unwrap
};
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.ENUM] = {
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
            ? lv : security.polymer_resin.INNOCUOUS_STRING_;
      }),
  safeReplacement: security.polymer_resin.INNOCUOUS_STRING_,
  typeToUnwrap: null,
  unwrap: null
};
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.COMPILE_TIME_CONSTANT] = {
  filter: (
      /**
       * Just returns the safe replacement value.
       * @param {string} e element name
       * @param {string} a attribute name
       * @param {string} v attribute value
       * @return {string}
       */
      function disallow(e, a, v) {
        return security.polymer_resin.INNOCUOUS_SCRIPT_;
      }),
  safeReplacement: security.polymer_resin.INNOCUOUS_STRING_,
  typeToUnwrap: goog.string.Const,
  unwrap: goog.string.Const.unwrap
};
security.polymer_resin.VALUE_HANDLERS_[
    security.html.contracts.AttrType.IDENTIFIER] = {
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
            : security.polymer_resin.INNOCUOUS_STRING_;
      }),
  safeReplacement: security.polymer_resin.INNOCUOUS_STRING_,
  typeToUnwrap: goog.string.Const,
  unwrap: goog.string.Const.unwrap
};


if (security.polymer_resin.STANDALONE) {
  goog.exportSymbol(
      'security.polymer_resin.install',
      security.polymer_resin.install);

  goog.exportSymbol(
      'security.polymer_resin.CONSOLE_LOGGING_REPORT_HANDLER',
      security.polymer_resin.CONSOLE_LOGGING_REPORT_HANDLER);
}
