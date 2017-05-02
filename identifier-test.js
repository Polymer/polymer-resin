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

goog.module('security.polymer_resin.identifier_test');

var Const = goog.require('goog.string.Const');

suite(
    'Identifier',

    function () {
      var identifierFixture;
      var input;
      var label;

      setup(function () {
        identifierFixture = fixture('identifier-test-fixture');
        input = identifierFixture.querySelector('input');
        label = identifierFixture.querySelector('label');
      });

      function assertId(want, inputValue) {
        identifierFixture.x = inputValue;

        var ok =
            (typeof want == 'function')
            ? /** @type {function(*):boolean} */ (want)
            : function (x) { return x == want; };

        function check(desc, x) {
          assert.isOk(
              ok(x),
              {
                toString: function () {
                  return desc + ', want ' + want + ', got ' + x;
                }
              });
        }
        check('input.id', input.id);
        check('input.name', input.name);
        check('label.htmlFor', label.htmlFor);
      }

      test('allowed_string', function() {
        assertId('safe-id', 'safe-id');
      });

      test('allowed_constant', function() {
        // constant strings allowed
        assertId('my-id', Const.from('my-id'));
      });

      test('disallowed', function() {
        assertId('zClosurez', 'unsafe');
      });

      test('case-sensitive', function() {
        assertId('zClosurez', 'Safe-string');
      });

      test('not-at-start', function() {
        assertId('zClosurez', 'evil-not-safe-at-all');
      });

      test('doppelganger', function() {
        var doppelganger = {
          b: false,
          toString: function () {
            // Return 'safe-at-first-blush' the first time a
            // doppelganger is sampled to get through a safe value,
            // and 'evil' to provide the payload.
            // Probably out of bounds for XSS mitigation.
            var s = this.b ? 'evil': 'safe-at-first-blush';
            this.b = !this.b;
            return s;
          }
        };
        assertId(
            function (x) {
              // Allow either.
              return x == 'safe-at-first-blush' || x == 'zClosurez';
            },
            doppelganger);
      });
    });
