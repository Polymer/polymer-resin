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

goog.provide('security.html.contracts_test');
goog.setTestOnly();

goog.require('goog.functions');
goog.require('goog.testing.jsunit');
goog.require('security.html.contracts');

function testNormalGlobalAttr() {
  assertEquals(
      security.html.contracts.AttrType.NONE,
      security.html.contracts.typeOfAttribute(
          'div', 'title', goog.functions.NULL));

  // TODO: add summary to html5_contracts.textpb
  //    assertEquals(
  //        security.html.contracts.AttrType.NONE,
  //        security.html.contracts.typeOfAttribute(
  //            'table', 'summary', goog.functions.NULL));
}

function testOverrideOfGlobal() {
  assertEquals(
      // <* href> is trusted_resource_url
      security.html.contracts.AttrType.SAFE_URL,
      security.html.contracts.typeOfAttribute(
          'a', 'href', goog.functions.NULL));
  assertEquals(
      // <* src> is trusted_resource_url
      security.html.contracts.AttrType.SAFE_URL,
      security.html.contracts.typeOfAttribute(
          'img', 'src', goog.functions.NULL));
}

function testGloballyDefinedAttributeThatIsOverriddenForOtherElement() {
  assertEquals(
      security.html.contracts.AttrType.TRUSTED_RESOURCE_URL,
      security.html.contracts.typeOfAttribute(
          'script', 'src', goog.functions.NULL));
}

function testGloballyDefinedAttribute() {
  assertEquals(
      security.html.contracts.AttrType.SAFE_STYLE,
      security.html.contracts.typeOfAttribute(
          'div', 'style', goog.functions.NULL));
}

function testContingentAttribute() {
  // TODO: add rel=stylesheet to html5_contracts.textpb
  //    assertEquals(
  //        security.html.contracts.AttrType.TRUSTED_RESOURCE_URL,
  //        security.html.contracts.typeOfAttribute(
  //            'link', 'href',
  //            function (attr) { return attr = 'rel' ? 'stylesheet' : null; }));
  assertEquals(
      security.html.contracts.AttrType.SAFE_URL,
      security.html.contracts.typeOfAttribute(
          'link', 'href',
          function (attr) { return attr = 'rel' ? 'icon' : null; }));
}

function testTypeOfText() {
  assertEquals(
      security.html.contracts.ElementContentType.SAFE_HTML,
      security.html.contracts.contentTypeForElement('div'));
  assertEquals(
      security.html.contracts.ElementContentType.SAFE_HTML,
      security.html.contracts.contentTypeForElement('span'));
  assertEquals(
      security.html.contracts.ElementContentType.SAFE_SCRIPT,
      security.html.contracts.contentTypeForElement('script'));
  assertEquals(
      security.html.contracts.ElementContentType.SAFE_STYLESHEET,
      security.html.contracts.contentTypeForElement('style'));
  assertEquals(
      security.html.contracts.ElementContentType.VOID,
      security.html.contracts.contentTypeForElement('br'));
  assertEquals(
      null,
      security.html.contracts.contentTypeForElement('unknown-element'));
  assertEquals(
      null,
      security.html.contracts.contentTypeForElement('constructor'));
}

function testElementValueAllowed() {
  assertTrue(security.html.contracts.isEnumValueAllowed('span', 'dir', 'ltr'));
  assertTrue(security.html.contracts.isEnumValueAllowed('span', 'dir', 'LTR'));
  assertTrue(security.html.contracts.isEnumValueAllowed('span', 'dir', 'auto'));
  assertFalse(security.html.contracts.isEnumValueAllowed('span', 'dir', 'up'));
  // Test that we don't fail hard because there's no sub-table for
  // an obscure element.
  assertFalse(security.html.contracts.isEnumValueAllowed('bogus', 'dir', 'up'));
}
