# Polymer Resin [![Build Status][build-status]][build-dashboard]


XSS mitigation for Polymer webcomponents.

--------------------------------------------------------------------------------

This document explains **what** polymer-resin is. See ["Getting
Started"][getting-started] if you're interested in **how** to use it.

--------------------------------------------------------------------------------

Relevant Concepts & Specs

*   [Webcomponents][webcomponents]
*   [Auto-sanitization][autosan]
*   [Safe HTML Types][safe-html-types]

Relevant Code

*   [PolyGerrit UI on GoogleSource][polygerrit-ui]
*   Polymer value hooks ([V1][poly-v1], [V2][poly-v2])
*   JavaScript [Safe HTML APIs][safe-html-types-js]

## Background

Gerrit is a code review tool that may be used by Bets to manage their codebases.
Polygerrit-UI is a rewrite of the Gerrit UI using Polymer instead of Closure
Templates.

Vulnerabilities in code review tools affects the integrity of the codebase -- an
XSS (Cross-site scripting) attack that can submit a form in a code review tool
can send spurious approvals; and (depending on the level of integration with
revision control) suggest edits, commit approved changes, and kick off test runs
and other processes with edited files as inputs.

In most template languages, one defines templates, but in Polymer one defines
custom elements. This means that there is not a closed class of HTML elements
and attributes about which we can reason as there is for [Closure Templates
auto-sanitizer][soy-sec].


## Goal

Make it easy for security auditors to quickly check whether a project's custom
element definitions fall into a known-safe subset of Polymer.

## Security Assumptions

Existing auto-escaping template systems (CTemplates, Closure Templates, and
go/html/template) assume that

1.  There is a large community of non-malicious application developers who
    author templates.

    This community is large enough that we cannot assume that they uniformly
    apply rigorous secure coding and review practices.

    A system worked on by N developers is vulnerable if just one of them
    mistakenly introduces a vulnerability. Thus, large groups of individuals who
    individually rarely make mistakes are nevertheless likely to produce a
    system that has vulnerabilities.

2.  There is a much smaller group of expert browser implementors who define the
    semantics of tags and attributes. They are aware of the security
    consequences of their work, and the code they produce is heavily reviewed,
    but they produce blunt instruments.

For Polymer, we assume that

1.  There is a large community of non-malicious custom element authors.
2.  There is a large community of non-malicious application developers.
3.  These two communities overlap to a great degree and are (similar to above)
    large enough that we cannot assume uniform rigor in applying secure
    practices.
4.  The novel security consequences of webcomponents arise because they expand
    the ways in which *unchecked values* can reach *builtin sinks*.

    A builtin sink is a property or attribute that can be set by user code and
    is handled specially by the browser in a manner that may have security
    implications, in particular, attacker-controlled script execution. Builtin
    sinks tend to correspond to IDL attributes that are annotated with
    [*Reflect*][idl-reflect],
    [*CustomElementCallbacks*][idl-custom-element-callbacks], or
    [*CEReactions*][idl-cereactions].

    There is a hazard whenever an *unchecked value* reaches a builtin sink. An
    unchecked value is one that could be controlled by an attacker; it might
    originate from outside an [origin][same-origin] controlled by the
    application author. For instance, the `href` attribute of an
    *HTMLAnchorElement* is a security-relevant sink; if it can be reached by a
    value entirely under an attacker's control, that attacker can execute
    arbitrary script in the context of the user's browser session through
    injection of a `javascript:` URL.

    There are many ways that JavaScript can manipulate builtin sinks, and we
    will use [JSConformance][jsconf] policies to guide developers towards safe
    patterns, and focus instead on web-component specific hazards including

    *   an unchecked value reaches a builtin sink on a normal HTML element, e.g.
        `<a href="[[...]]">` where `[[...]]` can be controlled by an attacker;
    *   an unchecked value reaches a builtin sink inherited by a custom element,
        e.g. `<my-custom-element onclick="[[...]]">`;
    *   an unchecked value reaches a custom property on a custom element that is
        then forwarded to a builtin-sink by element or framework code, e.g.
        `<my-custom-element my-url="[[...]]">` and the custom element's shadow
        DOM contains a builtin sink `<template><a href="[[myUrl]]"></template>`;
    *   an unchecked value reaches a builtin sink on a customized-builtin
        element either directly (`<a is="my-custom-link" href="[[...]]">`) or
        indirectly (`<a is="my-custom-link" href="[[my-url]]"
        my-url="[[...]]">`)
    *   an unchecked value specifies a property name `<a [[...]]="some-value">`
        or can specify the type of custom element `<a is="[[...]]">` or
        `<[[...]] src="some-value">`.

Our security goal is to allow element authors to write code that receives
unchecked values, and routes them to builtin sinks without the risk of XSS,
redirection attacks, etc. We do this by taking the burden of avoiding these
attacks off the authors and reviewers of large amounts of application code and
move it into a small amount of vetted infrastructure code.

It is not a goal to address direct access to builtin sinks by JavaScript (e.g.
`HTMLElement.setAttribute(...)` or `HTMLElement.innerHTML = ...`) as those are
well handled by existing [JSConformance][jsconf] policies.

## High-Level Design

We could do this by tweaking Polymer to attach data provenance to properties and
attributes but this would be deeply backward incompatible.

We could do this by static analysis of custom element definition, but this
requires analysis of JavaScript, and our existing JS type systems are unsound,
so any sound analysis would require a lot of duplication of effort or would
produce many false positives.

Instead we propose to use existing property value hooks (links at top) provided
by Polymer. A security auditor can then check that a Polymer project is properly
configured to load these hooks, and check that the project uses
[JSConformance][jsconf] to prevent forgery of safe string values.

We provide a standalone importable HTML file `polymer-resin.html` that
implements `Polymer.sanitizeDOMValue` to intercept assignments to builtin sinks
given values that originate from expressions specified in Polymer HTML. We also
provide a Polymer v1 shim that checks `Polymer.version` to see if it needs to
patch `Polymer.Base._computeFinalAnnotationValue` to call the same sanitizer.

A security auditor should check that *polymer-resin* is running early in the
page render process. It should load and initialize before the applications main
element is instantiated so that it can intercept reflected XSS. Putting the HTML
import or script load immediately after the load of framework code suffices.


### Text interpolation

When text is interpolated

```html
<script>
before;
[[interpolation]]
after;
</script>
```

Polymer denormalizes the DOM so that "`before;`", "`[[interpolation]]`" and
"`after;`" are three different text nodes, and control reaches the sanitizer
with a *TextNode* as the node, and a *null* property name.

We use this to intercept text interpolation and allow it only when the
content is human-readable HTML.


## Life of a Polymer+Resin page

Normally, when an HTML page is parsed, the browser knows that, for an `<A>`
element, it creates an *HTMLAElement* instance. The [custom elements draft
specification](https://www.w3.org/TR/custom-elements/) explicitly allows parsing
of `<my-custom>` before the JavaScript that will eventually define and register
*HTMLMyCustomElement*.

<a name="custom-element-example"></a>

```html
<head>
<script src="webcomponents-lite.js"></script>
<link rel="import" href="custom-element.html">
<body>
<custom-element id="app"></custom-element>
```

The life-cycle of a polymer app often looks like

1.  Synchronously load *webcomponents-lite.js*
2.  Start parsing HTML imported page *custom-element.html*
3.  Indirectly HTML import load *polymer.html* which provides a framework for
    custom elements and has the hooks we need to intercept bound data values.
4.  Finish processing *custom-element.html* which registers the custom element
    definition.
5.  Instantiate `<custom-element>`

```js
window.addEventListener('WebComponentsReady', …)
```

seems like it might run at the right time, and the `'HTMLImportsLoaded'` event
is another good candidate.

Both run after the HTML element definitions have been loaded, and before the app
has been provisioned with state loaded from the server, but state that is
initialized based on location or query parameters will already have reached
custom elements, meaning [reflected XSS][reflected-xss] is still possible.

To prevent reflected XSS, we need to initialize after Polymer is loaded, and
before the first custom element definition is registered (except for those
defined by Polymer internally).

--------------------------------------------------------------------------------

`polygerrit-ui/app/index.html` is a good example of a polymer app. The column on
the left shows the app before resin is added, and the column on the right shows
how we want it to work with Resin. Note that *polymer.html* is not explicitly
loaded by the *index.html* page; it's loaded via a transitive HTML import.

<!-- mdformat off(mangles tables with empty cells in leftmost column) -->

| Without Resin                  | With Resin                            |
| ------------------------------ | ------------------------------------- |
| Enter `<html><head>`           | ditto                                 |
| Load *webcomponents-lite.js*   | ditto                                 |
|                                | HTML import *polymer.html*            |
|                                | Load and configure *polymer-resin.js* |
| Preload `<gr-app>` definition  | ditto                                 |
| HTML import *polymer.html*     |                                       |
| Load other element definitions | ditto                                 |
| Instantiate `<gr-app>` element | ditto                                 |

<!-- mdformat on -->

--------------------------------------------------------------------------------

We provide a *polymer-resin.html*, an importable HTML file that does two things.

1.  HTML import *polymer.html* so that we have a place to install the hooks
2.  synchronously load a script to install the hooks

## Bound data handler

The handler receives

1.  node - A DOM element
2.  property - the property or attribute name
3.  info.type (polymer v1) or type (polymer v2) - one of "attribute" or
    "property"
4.  value - the untrusted value

and returns a safe value.

## Sanitize DOM Value Algorithm

When sanitizing a property or attribute value we

1.  Allow all falsey values. This allows resetting, initializing to
    blank/nullish. This has the side effect of also allowing `0`, `NaN`, `false`
    which we deem low-risk.
2.  Classify the containing element as customized or not-customized.
3.  Find a clean (no non-default attributes or JS muckery) proxy for the
    element.
    *   For custom elements, this is a vanilla *HTMLElement* instance.
    *   For a builtin or customized-builtin element, it is a vanilla
        `document.createElement(builtinElementName)`.
    *   For legacy elements, treat as builtins.
    *   For customizable elements (those which meet the naming convention but
        for which no custom element constructor has yet been registered), treat
        as a custom element. Our analysis is dynamic, so we need not assume the
        worst.
4.  If the proxy does not have the named property in it, then allow any value
    without unwrapping or checking typed string values.
5.  Otherwise, if the value is whitelisted according to the element/attribute
    curated contract tables (JS namespace `security.html.contracts`), then
    unwrap any typed string values and allow.
6.  Otherwise, log as appropriate, and return a known-safe value.

We could break from the loop if the prototype has an own property with the given
name. We could memoize the fact that we found a result with the original key if
we’re willing to assume that no properties are deleted from prototypes during
program execution.

## Table of Security-Relevant Properties and Attributes


The `security.html.contracts` module captures builtin HTML element and attribute
relationships, and we apply the following filters.

Attribute Type       | Privileged Typed String Type | Raw Value Filter
-------------------- | ---------------------------- | ----------------
NONE                 | none                         | allow
SAFE_HTML            | goog.html.SafeHtml           | goog.string.htmlEscape
SAFE_URL             | goog.html.SafeUrl            | goog.html.SafeUrl.sanitize
TRUSTED_RESOURCE_URL | goog.html.TrustedResourceUrl | none
SAFE_STYLE           | goog.html.SafeStyle          | reject
SAFE_SCRIPT          | goog.html.SafeScript         | reject
ENUM                 | none                         | whitelist per element/attribute
CONSTANT             | goog.string.Const            | reject
IDENTIFIER           | none                         | reject

No processing is applied to custom properties.

Values that are of the privileged type string type are unwrapped and allowed to
reach a builtin attribute alias.

Values that are of other type string types are unwrapped before being filtered.

Rejected values are replaced with an innocuous value.

## Testing

There are two main failure modes:

1.  False negatives -- a failure to apply the appropriate handler to a payload.
2.  False positives -- trustworthy code in a custom element definition
    constructs an attribute value that triggers a filter but does not wrap it in
    an appropriate safe string type. For example
    `myElement.href = “javascript:myVeryOwnFunction()”`

We can check for false negatives by writing custom elements

```html
    <dom-module id=”xss-me”>
      <template>
         <a href="{{myhref}}">
```

that use the relevant properties, and instantiating them with variables bound to
known payloads like `{ “myhref”: “javascript:shouldNotBeCalled()” }`.

We will also write regression tests for polygerrit that programmatically creates
an author, changelist, and review comment with common payloads, and uses
selenium to view the pages and check for breaches.

We will try to get a handle on the kinds of false positives and their frequency
by running polygerrit/app/*_test.sh, and looking for regressions.

Running both an instrumented version, and an uninstrumented version side by side
in two browser windows should make changes in behavior apparent.

There are a few minor failure modes:

1.  Failure to load early enough or at all. Manual inspection of the JS debugger
    when running polygerrit should suffice. poly-resin.js could also set a
    property after load that the app could assert.
2.  Failure to recognize and reject unsafe values in a handler. Since we’re
    reusing Soy sanitizers which have a long history of use in production by
    large projects, I consider this low risk.

## Deployment

Gerrit builds via bazel but loads most of its scripts via bower. Polymer resin
is available as a [bower
component](http://bower.herokuapp.com/packages/polymer-resin).

There are three deployment options.

1.  `polymer-resin.html` which is best for closure-friendly polymer apps.
2.  `standalone/polymer-resin.html` which includes a single JS bundle that
    includes pre-compiled JS.
3.  `standalone/polymer-resin-debug.html` which is like the previous file but
    the JS is not obfuscated and it logs to the console whenever a property
    value is rejected.

--------------------------------------------------------------------------------

To deploy in the [custom element example](#custom-element-example) the head
changes from

```html
<script src="webcomponents-lite.js"></script>
<link rel="import" href="custom-element.html">
```

to

```html
<script src="webcomponents-lite.js"></script>
<link rel="import" href="polymer-resin/polymer-resin.html">
<script>
// This step is essential to the security of this project.
security.polymer_resin.install({ /* config */ });
</script>
<link rel="import" href="custom-element.html">
```

or with one of the standalone variants above. The `<script>` is required because
it forces the imports above it to be handled before *custom-element.html*. The
<tt>install</tt> call is explained in [configuring][].

## Running tests from the command line


Per https://github.com/Polymer/web-component-tester
make sure that you have bower installed and have run `bower update`.
Then use the test script.

```bash
$ ./run_tests.sh
```

# Running tests in the browser

From the project root

```bash
$ ./run_tests.sh -p -l chrome
```

causes it to keep the server open.
See the log output for the localhost URL to browse to.




[getting-started]: https://github.com/Polymer/polymer-resin/blob/master/getting-started.md#getting-started
[configuring]: https://github.com/Polymer/polymer-resin/blob/master/getting-started.md#configuring


[reflected-xss]: https://www.owasp.org/index.php/Testing_for_Reflected_Cross_site_scripting_(OTG-INPVAL-001)#Summary
[webcomponents]: https://developer.mozilla.org/en-US/docs/Web/Web_Components#Specifications
[polygerrit-ui]: https://gerrit.googlesource.com/gerrit/+/master/polygerrit-ui/app/
[poly-v1]: https://github.com/Polymer/polymer/blob/7e732f6b2dc2fd49f78a3993828283d997de63bd/src/standard/effectBuilder.html#L343
[poly-v2]: https://github.com/Polymer/polymer/blob/2.0-preview/lib/mixins/property-effects.html#L555-L556
[jsconf]: https://github.com/google/closure-compiler/wiki/JS-Conformance-Framework
[soyutils]: https://github.com/google/closure-templates/blob/master/javascript/soyutils_usegoog.js#L1407
[safe-html-types]: https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md
[safe-html-types-js]: https://google.github.io/closure-library/api/goog.html.SafeHtml.html
[autosan]: https://security.googleblog.com/2009/03/reducing-xss-by-way-of-automatic.html
[soy-sec]: https://developers.google.com/closure/templates/docs/security
[build-status]: https://travis-ci.org/Polymer/polymer-resin.svg?branch=master
[build-dashboard]: https://travis-ci.org/Polymer/polymer-resin
[idl-reflect]: https://html.spec.whatwg.org/#cereactions
[idl-custom-element-callbacks]: https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/bindings/IDLExtendedAttributes.md
[idl-cereactions]: https://html.spec.whatwg.org/#cereactions
[same-origin]: https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy
