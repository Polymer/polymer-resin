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

goog.provide('tooltip_tests');

suite(
    'TooltipTests',

    function () {
      var testFixture;
      var spanElement;

      var evilDone = false;
      goog.exportSymbol('tooltip_tests.doEvil', function () {
        evilDone = true;
      });

      setup(function () {
        testFixture = fixture('tooltip-test-fixture');
        spanElement = testFixture.$$('span');
      });


      function getSpanMargins() {
        var computedStyle = spanElement
            && window.getComputedStyle(spanElement);
        var marginRight = computedStyle && computedStyle.marginRight;
        var marginLeft = computedStyle && computedStyle.marginLeft;
        return { left: marginLeft, right: marginRight };
      }


      test('test_width_is_number', function() {
        testFixture.ttWidth = '10px';
        testFixture.content = 'Hello, World!';

        var textNodeValue;
        for (var child = Polymer.dom(testFixture.root).firstChild;
             child;
             child = child.nextSibling) {
          if (child.nodeType == Node.TEXT_NODE
              && /\S/.test(child.nodeValue)) {
            textNodeValue = child.nodeValue;
            break;
          }
        }

        var margins = getSpanMargins();
        var marginLeft = margins.left;
        var marginRight = margins.right;

        assert.isOk(/10px/.test(marginRight), marginRight || undefined);
        assert.isOk(/calc\((?:-10px \+ 50%|50% \+ -10px)\)/.test(marginLeft),
                    marginLeft || undefined);
        assert.isOk(/Hello, World!/.test(textNodeValue), textNodeValue);
      });

      test('test_expression', function() {
        testFixture.ttWidth = 'expression(tooltip_tests.doEvil())';
        testFixture.content = '<script>tooltip_tests.doEvil()</script>';

        var margins = getSpanMargins();
        var marginLeft = margins.left;
        var marginRight = margins.right;

        assert.isOk(!/expression/i.test(marginRight), marginRight || undefined);
        assert.isOk(!/expression/i.test(marginLeft), marginLeft || undefined);
        assert.isOk(!evilDone);
      });
    });
