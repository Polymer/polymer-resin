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

goog.provide('security.html.namealiases_test');
goog.setTestOnly();

goog.require('goog.testing.jsunit');
goog.require('security.html.namealiases');


function testClass() {
  // A special case that most JS devs know about.
  assertEquals(
      'class',
      security.html.namealiases.propertyToAttr('className'));
  assertEquals(
      'className',
      security.html.namealiases.attrToProperty('class'));
  assertEquals(
      'className',
      security.html.namealiases.attrToProperty('Class'));
  assertEquals(
      'className',
      security.html.namealiases.attrToProperty('CLASS'));

  assertEquals(
      '-class-name',
      security.html.namealiases.propertyToAttr('ClassName'));
  assertEquals(
      'ClassName',
      security.html.namealiases.attrToProperty('-class-name'));
  assertEquals(
      'ClassName',
      security.html.namealiases.attrToProperty('-class-Name'));

  // Test no exceptions on don't cares.
  security.html.namealiases.propertyToAttr('class');
  security.html.namealiases.propertyToAttr('Class');
  security.html.namealiases.attrToProperty('Class-Name');
}

function testContentEditable() {
  assertEquals(
      'contentEditable',
      security.html.namealiases.attrToProperty('contenteditable'));
  assertEquals(
      'contenteditable',
      security.html.namealiases.propertyToAttr('contentEditable'));
  // isContentEditable is read-only
}

function testFormAction() {
  // A special case that few JS devs know (or care) about.
  assertEquals(
      'formaction',
      security.html.namealiases.propertyToAttr('formAction'));
  assertEquals(
      'formAction',
      security.html.namealiases.attrToProperty('formaction'));
  assertEquals(
      'formAction',
      security.html.namealiases.attrToProperty('FORMACTION'));
}

function testKnownUnknowns() {
  // Test some cases based on convention, not IDL special cases.
  assertEquals(
      'foobar',
      security.html.namealiases.propertyToAttr('foobar'));
  assertEquals(
      'foobar',
      security.html.namealiases.attrToProperty('foobar'));
  assertEquals(
      'foobar',
      security.html.namealiases.attrToProperty('fooBar'));
  // Polymer data binding convention
  assertEquals(
      'foo-bar',
      security.html.namealiases.propertyToAttr('fooBar'));
  assertEquals(
      'fooBar',
      security.html.namealiases.attrToProperty('foo-bar'));
}

function testUnknownUnknowns() {
  // TODO
}
