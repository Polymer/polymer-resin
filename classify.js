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

goog.provide('security.polymer_resin.CustomElementClassification');
goog.provide('security.polymer_resin.classifyElement');
goog.provide('security.polymer_resin.hintUsesDeprecatedRegisterElement');


/**
 * @fileoverview
 * Classifies elements based on how their properties are defined.
 */


/**
 * The kinds of elements outlined in
 * html.spec.whatwg.org/multipage/scripting.html#custom-elements
 *
 * <p>This does not have a value for customized builtin elements.
 * Customized builtin elements are classified as builtin elements and clients
 * should look for the presence of an `is="..."` property if they need to
 * distinguish between customized and non-customized builtin elements.
 *
 * @enum{number}
 */
security.polymer_resin.CustomElementClassification = {
  /**
   * Elements like {@code <a>} that are represented by a builtin subclass of
   * HTMLElement like HTMLAnchorElement.
   * <p>
   * This includes
   * <a href="https://w3c.github.io/webcomponents/spec/custom/#customized-built-in-element">
   * customized builtin elements</a>
   * like {@code <a is="my-link">}.
   */
  BUILTIN: 0,
  /**
   * <a href="https://html.spec.whatwg.org/multipage/scripting.html#customized-built-in-element-restrictions">
   * Legacy elements</a> like {@code <isindex>} which cannot be subclassed.
   */
  LEGACY: 1,
  /**
   * Autonomous custom elements like {@code <my-element>} which extend
   * HTMLElement and register with the CustomElementRegistry.
   */
  CUSTOM: 2,
  /**
   * Non-builtin elements which might be
   * <a href="https://w3c.github.io/webcomponents/spec/custom/#custom-elements-upgrades-examples">
   * upgraded</a> when a custom element class is defined perhaps due
   * to delayed script loading.
   */
  CUSTOMIZABLE: 3
};


/**
 * Names of elements that have been registered via
 * document.registerElement.
 *
 * <p>Inspection of Document.cpp and V0CustomElementRegistry at
 * cs.chromium.org/chromium/src/third_party/WebKit/Source/core/dom/custom
 * /V0CustomElementRegistrationContext.h
 * shows that registerElement does not allow access to the set of
 * registered elements, unlike customElements.get().
 *
 * <p>We use other means to intercept names of registered elements, and
 * store them as keys in this object.
 * We could try to wrap document.registerElement, but we would need to
 * run code very early in the boot process to detect things like <dom-module>.
 * Instead we examine Polymer.telemetry which only allows access to custom
 * elements defined via Polymer, but does so reliably.
 *
 * @const
 * @private
 */
security.polymer_resin.docRegisteredElements_ = {};

/**
 * True iff we use the polymer telemetry to get at registered element
 * names.  Should be true for Polymer v1.
 * @private
 */
security.polymer_resin.usePolymerTelemetry_ = false;

/**
 * Number of elemenents of Polymer.telemetry.registrations already
 * in docRegisteredElements_
 * @private
 */
security.polymer_resin.countPolymerTelemetryUnrolled_ = 0;

/**
 * Notifies this module that it should monitor subsequent calls to
 * document.registerElement so it can correctly distinguish been
 * CUSTOM and CUSTOMIZABLE elements.
 */
security.polymer_resin.hintUsesDeprecatedRegisterElement = function () {
  security.polymer_resin.usePolymerTelemetry_ = true;
};


/**
 * @type {string}
 * @const
 * @private
 */
security.polymer_resin.ELEMENT_NAME_CHAR_RANGES_ =
    'a-z.0-9_\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d'
    + '\u200C\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uDFFF'
    + '\uF900-\uFDCF\uFDF0-\uFFFD';

/**
 * @const
 * @private
 * @see https://w3c.github.io/webcomponents/spec/custom/#valid-custom-element-name
 */
security.polymer_resin.VALID_CUSTOM_ELEMENT_NAME_REGEX_ = new RegExp(
    '^'
    // List of banned names from
    // w3c.github.io/webcomponents/spec/custom/#valid-custom-element-name
    + '(?!(?:annotation-xml|color-profile|font-face'
    + '|font-face(?:-(?:src|uri|format|name))?'
    + '|missing-glyph)$)'
    // A letter followed by any number of element name chars except dash
    + '[a-z][' + security.polymer_resin.ELEMENT_NAME_CHAR_RANGES_ + ']*'
    // A dash is required.
    + '-'
    // Any number of element name chars or dash.
    + '[\\-' + security.polymer_resin.ELEMENT_NAME_CHAR_RANGES_ + ']*$');


/**
 * Classifies an element given its name and constructor.
 *
 * @param {string} name element name
 * @param {!Function} ctor the element's constructor or a super-type
 *     constructor.  Calling with a super-type of HTMLElement leads
 *     to unreliable results.
 * @return {!security.polymer_resin.CustomElementClassification}
 */
security.polymer_resin.classifyElement = function (name, ctor) {
  // TODO: are elements from a different document dealt with by that
  // document's CustomElementRegistry?
  // How do we get from a document to a CustomElementRegistry?
  // Maybe just assert el.ownerDocument === document?
  // Does that screw up elements from <template> content?

  var customElementsRegistry = window.customElements;

  if (security.polymer_resin.usePolymerTelemetry_) {
    // Make sure we have all the registered custom elements.
    var regs = window['Polymer']['telemetry']['registrations'];
    var n = regs.length;
    for (var i = security.polymer_resin.countPolymerTelemetryUnrolled_;
         i < n; ++i) {
      var regName = regs[i].is;
      security.polymer_resin.docRegisteredElements_[regName] =
          security.polymer_resin.docRegisteredElements_;
    }
    security.polymer_resin.countPolymerTelemetryUnrolled_ = n;
  }

  if (customElementsRegistry && customElementsRegistry.get(name)
      || (security.polymer_resin.docRegisteredElements_[name]
          === security.polymer_resin.docRegisteredElements_)) {
    return security.polymer_resin.CustomElementClassification.CUSTOM;
  }
  if (ctor.name === 'HTMLUnknownElement') {
    return security.polymer_resin.CustomElementClassification.LEGACY;
  }
  if (ctor.name === 'HTMLElement'
      && security.polymer_resin.VALID_CUSTOM_ELEMENT_NAME_REGEX_.test(name)) {
    return security.polymer_resin.CustomElementClassification.CUSTOMIZABLE;
  }
  return security.polymer_resin.CustomElementClassification.BUILTIN;
};
