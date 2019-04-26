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

'use strict';


/**
 * @fileoverview
 * Mitigates XSS in Polymer applications by intercepting and vetting
 * results of data binding expressions before they reach browser internals.
 */

goog.provide('security.polymer_resin.sanitizer');

goog.require('goog.string');
goog.require('security.html.contracts');
goog.require('security.html.namealiases');
goog.require('security.polymer_resin.CustomElementClassification');
goog.require('security.polymer_resin.classifyElement');

/**
 * @define {boolean} whether bundled with its dependencies while
 *     exporting its public API.
 */
security.polymer_resin.STANDALONE =
    goog.define('security.polymer_resin.STANDALONE', false);

/**
 * Type for a configuration object that can be passed to install.
 *
 * <hr>
 *
 * When `UNSAFE_passThruDisallowedValues` is `true`,
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
 * `allowedIdentifierPrefixes` specifies prefixes for allowed values
 * for attributes with type IDENTIFIER.
 * <p>
 * By default, only the empty identifier is allowed.
 *
 * <hr>
 *
 * `reportHandler` is a callback that receives reports about rejected
 * values and module status
 * <p>
 * By default, if `goog.DEBUG` is false at init time, reportHandler is
 * never called, and if `goog.DEBUG` is true at init time, reportHandler
 * logs to the JS developer console.
 * <p>
 * Assuming it is enabled, either via `goog.DEBUG` or an explicit call to
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
 *   'safeTypesBridge': (?security.polymer_resin.SafeTypesBridge | undefined),
 *   'reportHandler': (?security.polymer_resin.ReportHandler | undefined)
 * }}
 */
security.polymer_resin.sanitizer.Configuration;


/**
 * Identifiers used for safe strings interop.
 *
 * @enum {string}
 */
security.polymer_resin.SafeType = {
  CONSTANT: 'CONSTANT',
  HTML: 'HTML',
  JAVASCRIPT: 'JAVASCRIPT',
  RESOURCE_URL: 'RESOURCE_URL',
  /** Unprivileged but possibly wrapped string. */
  STRING: 'STRING',
  STYLE: 'STYLE',
  URL: 'URL'
};


/**
 * A function that bridges to safe type libraries.
 *
 * <p>
 * It takes three arguments:
 * <ol>
 *   <li>value - The value that has been offered as appropriate in context.</li>
 *   <li>type - Identifies the kind of string that is appropriate.</li>
 *   <li>fallback - Returned if bridge can't find a safe variant of value.</li>
 * </ol>
 *
 * <p>
 * It MUST return fallback if it cannot find a safe value.
 * Rather than substitute a safe constant if value cannot be made safe, it
 * SHOULD return fallback so that the caller can distinguish and log policy
 * violations.
 *
 * @typedef {function(*, !security.polymer_resin.SafeType, *): ?}
 */
security.polymer_resin.SafeTypesBridge;


/**
 * A function that takes (isDisallowedValue, printfFormatString, printfArgs).
 * The arguments are ready to forward straight to the console with minimal
 * overhead.
 * <p>
 * If isDisallowedValue is true then the args have the printArgs have the form
 * [contextNodeName, nodeName, attributeOrPropertyName, disallowedValue].
 * <p>
 * The context node is the element being manipulated, or if nodeName is "#text",
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
 * @typedef {{
 *   filterRaw:       ?function(string, string, *):string,
 *   filterString:    ?function(string, string, string):string,
 *   safeReplacement: ?string,
 *   safeType:        ?security.polymer_resin.SafeType
 * }}
 */
security.polymer_resin.ValueHandler;

/**
 * Roughly matches
 * https://html.spec.whatwg.org/multipage/images.html#image-candidate-string
 * We are not super strict since only the unparser is security relevant.
 * @type {!RegExp}
 * @private
 */
security.polymer_resin.SRCSET_IMG_CANDIDATE_RE_ =
  /(?!,)([^\t\n\f\r ]+)(?:[\t\n\f\r ]+([.0-9+\-]+[a-z]?))?/gi;

/**
 * https://infra.spec.whatwg.org/#ascii-whitespace
 * @type {!RegExp}
 * @private
 */
security.polymer_resin.ASCII_SPACES_RE_ = /[\t\n\f\r ]+/;

/**
 * Characters that are special in srcset values.
 * @type {!RegExp}
 * @private
 */
security.polymer_resin.SRCSET_METACHARS_RE_ = /[\t\n\f\r ,]+/g;

/**
 * In practice, url should be string | SafeURL | TrustedResourceURL.
 * @typedef {{
 *  url: *,
 *  metadata: string?,
 * }}
 */
security.polymer_resin.ImageCandidate;

/**
 * @param {string} str
 * @return {?security.polymer_resin.ImageCandidate}
 * @private
 */
security.polymer_resin.parseImageCandidate_ = function (str) {
  // Because of the way SRCSET_IMG_CANDIDATE_RE_ starts, str
  // should never start with a space, but may end with one.
  let match = str.split(security.polymer_resin.ASCII_SPACES_RE_, 2);
  return match ? { 'url': match[0], 'metadata': match[1] } : null;
};

/**
 * @param {!security.polymer_resin.ImageCandidate} imageCandidate
 * @return {string | null}
 * @private
 */
security.polymer_resin.unparseImageCandidate_ = function (imageCandidate) {
  // Percent-encode commas and spaces
  var imageCandidateString = String(imageCandidate['url']).replace(
      security.polymer_resin.SRCSET_METACHARS_RE_, encodeURIComponent);
  var metadata = imageCandidate['metadata'];
  if (metadata) {
    security.polymer_resin.SRCSET_METACHARS_RE_.lastIndex = 0;
    if (security.polymer_resin.SRCSET_METACHARS_RE_.test(metadata)) {
      return null;
    }
    imageCandidateString += ' ' + metadata;
  }
  return imageCandidateString;
};

/**
 * Parses a srcset attribute value to an array of image candidates.
 *
 * @param {string} str
 * @return {!Array<!security.polymer_resin.ImageCandidate>}
 * @private
 */
security.polymer_resin.parseSrcset_ = function parseSrcset_(str) {
  var imageCandidateStrings = str.match(
      security.polymer_resin.SRCSET_IMG_CANDIDATE_RE_);
  if (imageCandidateStrings) {
    return imageCandidateStrings
        .map(security.polymer_resin.parseImageCandidate_)
        .filter(Boolean);
  }
  return [];
};

/**
 * Converts a structured srcset to a srcset attribute value string.
 *
 * @param {!Array<!security.polymer_resin.ImageCandidate>} x
 * @return {string}
 * @private
 */
security.polymer_resin.unparseSrcset_ = function unparseSrcset_(x) {
  if (!Array.isArray(x)) {
    throw new Error();
  }
  return x.map(security.polymer_resin.unparseImageCandidate_)
      .filter(Boolean).join(' , ');
};

/**
 * Vets individual (url, metadata) pairs in a structured srcset.
 *
 * @param {*} x
 * @param {!security.polymer_resin.SafeTypesBridge} bridge
 * @param {!security.polymer_resin.SafeType} safeType type for URL substrings
 * @return {{
 *   safe: !Array<!security.polymer_resin.ImageCandidate>,
 *   problems: (string | null)
 * }}
 * @private
 */
security.polymer_resin.sanitizeSrcset_ =
    function sanitizeSrcset_(x, bridge, safeType) {
  var safe = [];
  var problems = [];
  var sentinel = {};
  if (Array.isArray(x)) {
    for (var i = 0, n = /** @type{!Array} */ (x).length; i < n; ++i) {
      var imageCandidate = x[i];
      var url = imageCandidate && imageCandidate['url'];
      if (url) {
        var safeUrl = bridge(url, safeType, sentinel);
        if (safeUrl) {
          var foundSafeValue = safeUrl !== sentinel;
          (foundSafeValue ? safe : problems).push({
            'url': foundSafeValue ? safeUrl : url,
            'metadata': imageCandidate['metadata'],
          });
        }
      }
    }
  } else {
    problems.push(x);
  }
  return {
    safe: safe,
    problems: problems.length ? JSON.stringify(problems) : null
  };
};


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
security.polymer_resin.sanitizer.CONSOLE_LOGGING_REPORT_HANDLER = function(
    isViolation, formatString, var_args) {
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
 * @type {!security.polymer_resin.SafeTypesBridge}
 * @private
 * @const
 */
security.polymer_resin.DEFAULT_SAFE_TYPES_BRIDGE_ = function(
    value, type, fallback) {
  return fallback;
};

/**
 * Creates a sanitizer function with the given configuration.
 *
 * @param {!security.polymer_resin.sanitizer.Configuration} config
 * @return {function(!Node, string, string, *): *} A function that filters
 *   and unwraps new property values in preparation for them
 *   being attached to custom elements.
 */
security.polymer_resin.sanitizer.makeSanitizer = function(config) {
  /**
   * Undefined means never set (see default behavior under docs for
   * setter above), null means disabled.
   *
   * @type {!security.polymer_resin.ReportHandler|null|undefined}
   */
  var reportHandler = config['reportHandler'] || undefined;

  /**
   * A callback used to check whether a value is a priori safe
   * in a particular context or to coerce to one that is.
   *
   * @type {!security.polymer_resin.SafeTypesBridge}
   */
  var safeTypesBridge = config['safeTypesBridge'] ||
      security.polymer_resin.DEFAULT_SAFE_TYPES_BRIDGE_;

  /**
   * When passed `true`, disallowed values will not be replaced and so may
   * reach unsafe browser sinks resulting in a security violation.
   *
   * This mode is provided only to allow testing of an application to find and
   * compile the kinds of false positives triggered by an application that is
   * being migrated to use polymer resin.
   *
   * This MUST NOT be used in production with end users and MUST NOT be set
   * based on any attacker-controllable state like URL parameters.
   *
   * If you never use this option, you are safer.
   *
   * When not in goog.DEBUG mode, this is a no-op.
   *
   * @type {boolean|undefined}
   */
  var configUnsafePassThruDisallowedValues =
      config['UNSAFE_passThruDisallowedValues'];

  /**
   * @type {boolean}
   */
  var allowUnsafeValues = false;
  if (configUnsafePassThruDisallowedValues != null) {
    if (goog.DEBUG) {
      allowUnsafeValues = configUnsafePassThruDisallowedValues === true;
    }
  }

  /**
   * @type {!RegExp}
   */
  var allowedIdentifierPattern_ = /^$/;
  // This allows the empty identifier by default, which is redundant with
  // the falsey value check in sanitize below, so effectively grants no
  // authority.

  // This is the only part of the configuration that's still global.
  var configAllowedIdentifierPrefixes = config['allowedIdentifierPrefixes'];
  if (configAllowedIdentifierPrefixes) {
    for (var i = 0, n = configAllowedIdentifierPrefixes.length; i < n; ++i) {
      allowedIdentifierPattern_ = new RegExp(
          allowedIdentifierPattern_.source + '|^' +
          goog.string.regExpEscape(configAllowedIdentifierPrefixes[i]));
    }
  }

  if (goog.DEBUG && reportHandler === undefined &&
      typeof console !== 'undefined') {
    reportHandler =
        security.polymer_resin.sanitizer.CONSOLE_LOGGING_REPORT_HANDLER;
  }

  // TODO: check not in IE quirks mode.
  if (reportHandler) {
    // Emitting this allows an integrator to tell where resin is
    // installing relative to other code that is running in the app.
    reportHandler(false, 'initResin');
  }

  /**
   * An opaque token used to indicate that unwrapping a safe value failed.
   * @const
   */
  var DID_NOT_UNWRAP = {};

  /**
   * @type {!Array.<!security.polymer_resin.ValueHandler>}
   * @const
   */
  var valueHandlers = [];
  valueHandlers[security.html.contracts.AttrType.NONE] = {
    // A function that maps values to safe values or that
    // returns a safe replacement value.
    filterRaw: null,
    // A function that maps values to safe values or that
    // returns a safe replacement value.
    filterString: function(e, a, v) {
      return v;
    },
    // A safe value that indicates a problem likely occurred
    // so an event is worth logging.
    safeReplacement: null,
    // A safe types interop identifier.
    safeType: null
  };
  valueHandlers[security.html.contracts.AttrType.SAFE_HTML] = {
    filterRaw: null,
    filterString: null,
    safeReplacement: null,
    safeType: security.polymer_resin.SafeType.HTML
  };
  valueHandlers[security.html.contracts.AttrType.SAFE_URL] = {
    filterRaw: null,
    filterString: null,
    safeReplacement: security.polymer_resin.sanitizer.INNOCUOUS_URL_,
    safeType: security.polymer_resin.SafeType.URL
  };
  valueHandlers[security.html.contracts.AttrType.TRUSTED_RESOURCE_URL] = {
    filterRaw: null,
    filterString: null,
    safeReplacement: security.polymer_resin.sanitizer.INNOCUOUS_URL_,
    safeType: security.polymer_resin.SafeType.RESOURCE_URL
  };
  valueHandlers[security.html.contracts.AttrType.SAFE_STYLE] = {
    filterRaw: null,
    filterString: null,
    safeReplacement: security.polymer_resin.sanitizer.INNOCUOUS_STRING,
    safeType: security.polymer_resin.SafeType.STYLE
  };
  valueHandlers[security.html.contracts.AttrType.SAFE_SCRIPT] = {
    filterRaw: null,
    filterString: null,
    safeReplacement: security.polymer_resin.sanitizer.INNOCUOUS_SCRIPT_,
    safeType: security.polymer_resin.SafeType.JAVASCRIPT
  };
  valueHandlers[security.html.contracts.AttrType.ENUM] = {
    filterRaw: null,
    filterString: (
        /**
         * Checks that the input is allowed for the given attribute on the
         * given element.
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string} v lowercased if allowed, or the safe replacement
         *   otherwise.
         */
        function(e, a, v) {
          var lv = String(v).toLowerCase();
          return security.html.contracts.isEnumValueAllowed(e, a, lv) ?
              lv :
              security.polymer_resin.sanitizer.INNOCUOUS_STRING;
        }),
    safeReplacement: security.polymer_resin.sanitizer.INNOCUOUS_STRING,
    safeType: null
  };
  valueHandlers[security.html.contracts.AttrType.COMPILE_TIME_CONSTANT] = {
    filterRaw: null,
    filterString: null,
    safeReplacement: security.polymer_resin.sanitizer.INNOCUOUS_STRING,
    safeType: security.polymer_resin.SafeType.CONSTANT
  };
  valueHandlers[security.html.contracts.AttrType.IDENTIFIER] = {
    filterRaw: null,
    filterString: (
        /**
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {string} v attribute value
         * @return {string}
         */
        function allowIdentifier(e, a, v) {
          return allowedIdentifierPattern_.test(v) ?
              v :
              security.polymer_resin.sanitizer.INNOCUOUS_STRING;
        }),
    safeReplacement: security.polymer_resin.sanitizer.INNOCUOUS_STRING,
    safeType: security.polymer_resin.SafeType.CONSTANT
  };
  valueHandlers[security.html.contracts.AttrType.SAFE_URL_SET] = {
    filterRaw: (
        /**
         * @param {string} e element name
         * @param {string} a attribute name
         * @param {*} v normally a srcset string or {url,metadata} pairs.
         * @return {string}
         */
        function filterSrcset(e, a, v) {
          // Try to coerce to a structured representation.
          var value = v;
          if (typeof value === 'string') {
            value = security.polymer_resin.parseSrcset_(
                /** @type {string} */ (value));
          }
          if (!Array.isArray(value)) {
            return security.polymer_resin.sanitizer.INNOCUOUS_URL_;
          }
          var safeAndProblems = security.polymer_resin.sanitizeSrcset_(
              value, safeTypesBridge, security.polymer_resin.SafeType.URL);
          var structuredValue = safeAndProblems.safe;
          var problems = safeAndProblems.problems;
          var safeValue = DID_NOT_UNWRAP;
          if (structuredValue.length) {
            safeValue = security.polymer_resin.unparseSrcset_(structuredValue)
                || DID_NOT_UNWRAP;
          }
          if (problems && reportHandler) {
            reportHandler(
                true,
                'Failed to sanitize attribute value of <%s>: <%s %s="%O">: %s',
                e, e, a, v, problems);
          }
          return safeValue === DID_NOT_UNWRAP
              ? security.polymer_resin.sanitizer.INNOCUOUS_URL_
              : /** @type {string} */(safeValue);
        }),
    filterString: null,
    safeReplacement: null,
    safeType: null
  };

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
  var VANILLA_HTML_ELEMENT = document.createElement('polyresinuncustomized');

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
      /** @type {!security.polymer_resin.CustomElementClassification} */
      var classification = security.polymer_resin.classifyElement(
          elementName, /** @type{!Function} */ (element.constructor));
      if (classification ===
          security.polymer_resin.CustomElementClassification.CUSTOM) {
        // Custom elements have a layer between them and their prototype, so
        // we should not treat own properties assigned in the custom element's
        // constructor as builtin attribute aliases.
        return VANILLA_HTML_ELEMENT;
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
    if (!value && value !== document['all']) {
      // We allow clearing properties and initial values.
      // This does mean that the following strings could be introduced into
      // safe string contexts:
      //     "", "null", "undefined", "0", "NaN", "false"
      // I consider these values innocuous.
      //
      // Note the explicit check for document.all, which is spec'd to be a
      // falsy object! More info:
      // https://developer.mozilla.org/en-US/docs/Glossary/Falsy#Examples
      return value;
    }

    var nodeType = node.nodeType;
    if (nodeType !== Node.ELEMENT_NODE) {
      // TODO: does polymer use CDATA sections?
      if (nodeType === Node.TEXT_NODE) {
        // Whitelist and handle text node interpolation by checking
        // the content type of the parent node.
        var parentElement = node.parentElement;
        var allowText = !parentElement;
        if (parentElement && parentElement.nodeType === Node.ELEMENT_NODE) {
          var parentElementName = parentElement.localName;
          var parentClassification = security.polymer_resin.classifyElement(
              parentElementName,
              /** @type{!Function} */ (parentElement.constructor));
          switch (parentClassification) {
            case security.polymer_resin.CustomElementClassification.BUILTIN:
            case security.polymer_resin.CustomElementClassification.LEGACY:
              var contentType = security.html.contracts.contentTypeForElement(
                  parentElementName);
              // TODO(b/62487356): treat STRING_RCDATA differently from SAFE_HTML
              allowText = contentType ===
                      security.html.contracts.ElementContentType.SAFE_HTML ||
                  contentType ===
                      security.html.contracts.ElementContentType.STRING_RCDATA;
              break;
            case security.polymer_resin.CustomElementClassification
                .CUSTOMIZABLE:
            case security.polymer_resin.CustomElementClassification.CUSTOM:
              // Allow text in custom elements.
              allowText = true;
              break;
          }
        }
        if (allowText) {
          return '' +
              safeTypesBridge(
                     value, security.polymer_resin.SafeType.STRING, value);
        }
      }

      if (reportHandler) {
        reportHandler(
            true, 'Failed to sanitize %s %s%s node to value %O',
            node.parentElement && node.parentElement.nodeName, '#text', '',
            value);
      }

      return security.polymer_resin.sanitizer.INNOCUOUS_STRING;
    }

    var element = /** @type {!Element} */ (node);
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
        // Closed set tested in switch above
        // toLowerCase is Turkish-I safe because
        // www.ecma-international.org/ecma-262/6.0/#sec-string.prototype.tolowercase
        // says
        // """
        // 5. For each code point c in cpList, if the Unicode
        // Character Database provides a LANGUAGE INSENSITIVE
        // lower case equivalent of c then replace c in cpList
        // with that equivalent code point(s).
        // ""
        // modulo bugs in old versions of Rhino.
        (type == 'attribute') ? name.toLowerCase() :
                                security.html.namealiases.propertyToAttr(name);

    /** @type {?security.html.contracts.AttrType} */
    var attrType = security.html.contracts.typeOfAttribute(
        elementName, attrName, goog.bind(getAttributeValue, element));
    var safeValue = DID_NOT_UNWRAP;
    var safeReplacement = null;
    if (attrType != null) {
      /** @type {!security.polymer_resin.ValueHandler} */
      var valueHandler = valueHandlers[attrType];
      var safeType = valueHandler.safeType;
      safeReplacement = valueHandler.safeReplacement;

      if (safeType) {
        safeValue = safeTypesBridge(value, safeType, DID_NOT_UNWRAP);
      }
      if (safeValue === DID_NOT_UNWRAP) {
        if (valueHandler.filterString) {
          // Treat as a special case.
          var stringValue =
              '' +
              safeTypesBridge(  // Unwrap as a string.
                  value, security.polymer_resin.SafeType.STRING, value);
          safeValue = valueHandler.filterString(
              elementName, attrName, stringValue);
        } else if (valueHandler.filterRaw) {
          safeValue = valueHandler.filterRaw(elementName, attrName, value);
        }
        if (safeValue === safeReplacement) {
          // Fall through to report handler below.
          safeValue = DID_NOT_UNWRAP;
        }
      }
    }
    if (safeValue === DID_NOT_UNWRAP) {
      safeValue =
          safeReplacement || security.polymer_resin.sanitizer.INNOCUOUS_STRING;
      if (reportHandler) {
        reportHandler(
            true, 'Failed to sanitize attribute of <%s>: <%s %s="%O">',
            elementName, elementName, attrName, value);
      }
    }
    return safeValue;
  }
  if (allowUnsafeValues) {
    /**
     * A wrapper around sanitize() that does not use the sanitized result.
     *
     * @param {!Node} node a custom element, builtin element, or text node.
     * @param {string} name the name of the property
     * @param {string} type whether name is a 'property' or 'attribute' name.
     * @param {*} value a value that may have originated outside this document's
     *    origin.
     * @return {*} the original value, whether safe or not.
     */
    var reportingOnlySanitize = function(node, name, type, value) {
      // Run the sanitizer on the value so it can report on issues.
      sanitize(node, name, type, value);
      // But return the original value.
      return value;
    };
    return reportingOnlySanitize;
  }
  return sanitize;
};

/**
 * Creates a sanitizer function with the given configuration.
 *
 * @param {!security.polymer_resin.sanitizer.Configuration} config
 * @param {undefined|null|function(*, string, string, ?Node): *}
 *     existingSanitizeDomFunction
 * @return {function(*, string, string, ?Node): *} A function that filters
 *   and unwraps new property values in preparation for them
 *   being attached to custom elements. Matches the API of Polymer's
 *   setSanitizeDOMValue.
 */
security.polymer_resin.sanitizer.makeSanitizeDomFunction = function(
    config, existingSanitizeDomFunction) {
  const sanitize = security.polymer_resin.sanitizer.makeSanitizer(config);

  /**
   * @param {*} value
   * @param {string} name
   * @param {string} type
   * @param {?Node} node
   * @return {*}
   */
  function sanitizeDOMValue(value, name, type, node) {
    const origSanitizedValue = existingSanitizeDomFunction ?
        existingSanitizeDomFunction(value, name, type, node) :
        value;
    const safeValue = node ? sanitize(node, name, type, origSanitizedValue) :
                             security.polymer_resin.sanitizer.INNOCUOUS_STRING;
    return safeValue;
  }

  return sanitizeDOMValue;
};

/**
 * Analogous to goog.html.SafeUrl.INNOCUOUS_STRING but
 * used for const strings and safe html types that
 * do not have their own defined.
 * @const
 * @public
 */
security.polymer_resin.sanitizer.INNOCUOUS_STRING = 'zClosurez';

/**
 * @const
 * @private
 */
security.polymer_resin.sanitizer.INNOCUOUS_SCRIPT_ = ' /*zClosurez*/ ';

/**
 * @see goog.html.SafeUrl.INNOCUOUS_STRING
 * @const
 * @private
 */
security.polymer_resin.sanitizer.INNOCUOUS_URL_ = 'about:invalid#zClosurez';
