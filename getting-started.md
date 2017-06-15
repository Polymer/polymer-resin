# Getting Started

*   [Loading polymer-resin into your app](#loading)
*   [Migrating an app or element to work with polymer-resin](#migrating)
*   [Debugging an app or element that uses polymer-resin](#debugging)
*   [End-to-end safety](#end-to-end)
*   [Caveats](#caveats)
*   [FAQ](#faq)

This document explains how to use *polymer-resin*. See [README.md](README.md) if
you want to know what *polymer-resin* is.

## <a name="loading">Loading polymer-resin into your app</a>

### Getting polymer-resin via bower

The easiest way to get *polymer-resin* is via
[bower](https://bower.io/#getting-started) by installing the
[`polymer-resin`](http://bower.herokuapp.com/packages/polymer-resin) package.

```bash
$ bower info polymer-resin --verbose
...

Available versions:
  ...

You can request info for a specific version with 'bower info polymer-resin#<version>'
```

and to add a dependency on *polymer-resin* you can run

```bash
bower install --save polymer-resin
```

or if you want the specific version **1.2.3**

```bash
bower install --save polymer-resin#1.2.3
```

### Downloading a release

If you don't want to use bower, you can browse releases of polymer-resin via the
project's [Github release page][releases] and tarballs are available there.

### Integrating

Once you've got a release of polymer-resin you need to integrate it into your
app and ideally into your unit tests.

Within a release there are several versions of the code.

1.  If your Polymer project uses Google's [**Closure library**][closure-library]
    you can [vulcanize] your code with `polymer-resin/polymer-resin.html` which
    includes Closure dependencies.
2.  If you do not use Google's Closure library, then you can HTML import
    `polymer-resin/standalone/polymer-resin.html` which is **pre-compiled** with
    all the Closure dependencies into one compact bundle.
3.  <a name="dash-debug"></a>The precompiled JS can be a bit hard to **debug**
    with. `polymer-resin/standalone/polymer-resin-debug.html` is less
    aggressively compiled and logs violations to the developer console.

We recommend using Closure library. Polymer-resin treats
[`goog.html.SafeUrl`][safe-url] and other values as privileged so that Polymer
apps can achieve [end-to-end XSS safety][safe-html-types] via strict policies
with type-checked exemptions from the rule.

Once you've found the variant you want, you can use a simple [HTML
import][html-import] to load it.

Polymer-resin must be loaded early to protect an application from reflected XSS,
and it should be loaded early in a test case so that the code being tested runs
with polymer-resin installed.

Before                                               | After
---------------------------------------------------- | -----
`<html>`                                             | `<html>`
`. <head>`                                           | `. <head>`
`. . <script`                                        | `. . <script`
`. . . src="webcomponentsjs/webcomponents-lite.js">` | `. . . src="webcomponentsjs/webcomponents-lite.js">`
`. . </script>`                                      | `. . </script>`
` `                                                  | `. . <link rel="import"`
` `                                                  | `. . . href="polymer-resin/polymer-resin.html" />`
` `                                                  | `. . <script>`
` `                                                  | `. . security.polymer_resin.install({ /*config*/ })`
` `                                                  | `. . </script>`
`. . <link rel="import" href="my-app.html" />`       | `. . <link rel="import" href="my-app.html" />`
`. <body>`                                           | `. <body>`
`. . <my-app></my-app>`                              | `. . <my-app></my-app>`

The *webcomponents-lite.js* script makes sure that the document supports HTML
importing, and must appear before polymer-resin is loaded.

### Configuring

The above Polymer document shows a synchronous script tag.

```html
<script>
security.polymer_resin.install({ /* config */ })
</script>
```

Polymer resin will provide no protection until explicitly installed. This allows
it to be installed on an experimental basis for some subset of users during
migration.

The `{ /* config */ }` object can have a variety of properties..

#### `{ 'allowedIdentifierPrefixes: ['prefix-'] }`

`allowedIdentifierPrefixes` specifies an array of ID prefixes. This allows data
bindings to specify `id="prefix-..."` attribute values. If there are multiple
values, then an ID is allowed if it starts with any of the prefixes.

Attacker controlled IDs are not an [arbitrary-code execution
vulnerability][a.c.e.] but skilled attackers have exploited the fact that
`document.getElementById(x)` returns one of potentially many elements with the
same ID. Ideally, an application would make sure that important form input names
and IDs controllable by attackers are disjoint so that the content of inputs
sent to the server reflects user intent. If your application is not careful
about IDs, and you want to use polymer-resin to prevent arbitrary-code execution
while you work on separating ID namespaces, you can use the following:

```html
<script>
security.polymer_resin.install({ allowedIdentifierPrefixes: [''] });
</script>
```

#### `{ 'reportHandler': myReportHandlerFn }`

`reportHandler` is a callback that receives reports about rejected values and
module status.

By default, if `goog.DEBUG` is false at init time, reportHandler is never
called, and if `goog.DEBUG` is true at init time, reportHandler logs to the JS
developer console.

Assuming it is enabled, either via `goog.DEBUG` or an explicit call to this
setter, then it is called on every rejected value, and on major events like
module initialization.

This may be used to identify false positives during debugging; to compile lists
of false positives when migrating; or to gather telemetry by compiling a table
summarizing disallowed value reports.

## <a name="migrating">Migrating an app or element to work with polymer-resin</a>

When migrating an app to use polymer-resin, it can be helpful to get a list of
false positives. One false negative can cause a cascading security failure that
compromises your app, but false positives can also cause a cascading failure
that makes it hard to get coverage when manually testing an application.

```html
<script>
var polymerResinDebugTelemetry = {};

// Collect violation counts in a table instead of logging.
function telemetryGatheringReportHandler(
    isDisallowedValue, fmtString,
    optContextNodeName, optNodeName, optAttrName, optValue,
    var_args) {
  if (isDisallowedValue) {
    var key = optContextNodeName + ' : ' + optNodeName + ' : '
            + optAttrName;
    polymerResingDebugTelemetry[key] =
        (polymerResingDebugTelemetry[key] || 0) + 1;
  }
}

// Can be called from console.
function dumpPolymerResinDebugTelemetry() {
  console.log(JSON.stringify(polymerResinDebugTelemetry, null, 2));
}

security.polymer_resin.install(
    {
      'reportHandler': telemetryGatheringReportHandler,

      // Allow application to progress as normal so we can
      // exercise as much of the app as possible without working
      // around problems caused by false positives.
      // HACK: DO NOT RUN IN PROD.
      'UNSAFE_passThruDisallowedValues': true
    })
</script>
```

This configuration MUST NOT be used in production systems since
**UNSAFE_passThruDisallowedValues** disables the security protections similar to
[CSP Report-Only][csp-report-only] mode.

With this configuration, Polymer-resin doesn't actually substitute innocuous
values for unsafe inputs but collects them so that you can dump a digest to the
console.

## <a name="debugging">Debugging an app or element that uses polymer-resin</a>

Polymer-resin works by intercepting the values of data bindings before they
reach browser internals. It applies a white-listing policy to values with
runtime type-checked exemptions.

Adding polymer-resin to a project helps protect against XSS but false positives
can happen.

For example, polymer-resin will find nothing wrong with:

```html
<a href="javascript:void(0)" onclick="foo()">foo</a>
```

A `javascript:` URL has been explicitly specified as the value of an HTML
attribute. Polymer-resin never looks at regular attribute values, only data
bound attributes. Polymer-resin trusts template authors to specify values for
any attribute or element explicitly, and focuses on double checking that values
that could be influenced by attackers are safe.

The following `href="..."` will be blocked though:

```html
<dom-module id="my-a-tag">
  <template>
    <a href="[[_getUrl()]]" onclick="foo()">foo</a>
  </template>
  <script>
    Polymer({
      is: 'my-a-tag',
      _getUrl: function () { return "javascript:void(0)"; }
    });
  </script>
</dom-module>
```

In this case, the `javascript:` URL comes from a data binding. Polymer evaluates
expressions inside `[[...]]` and `{{...}}` and passes the results to
polymer-resin to be checked. Polymer-resin assumes that any values are dangerous
unless they match a strict policy, **OR** have a runtime type that asserts
they're safe in the context of the given data binding expression. `javascript:`,
`steam:`, `ms-its:`, and other protocols have been used to attack users, so
polymer-resin white-lists a small group of widely-used, widely-tested, and
well-understood protocols.

If you're using the [debug](#dash-debug) version of polymer-resin, you should
see the following in your JavaScript console.

![Developer JS console log showing "Failed to
sanitize"](images/console-debug-message.png)

and in the element inspector, you see that the `href` did change to
`about:invalid#zClosurez`. The rejected URL has been replaced with an innocuous
value that does not lead to arbitrary code execution.

![Developer DOM inspector showing "a" tag with href of
"about:invalid#zClosurez"](images/inspector-innocuous-href.png)

In this case the string is safe and was specified by the author, but
polymer-resin has no way of knowing the origin of a simple JavaScript string.
When polymer-resin is checking an `href="..."` attribute, it looks at its
[white-list][contracts-a-href] and realizes that the value will be interpreted
by the browser as a URL. We can ask polymer-resin to not double-check a value by
using a [contract-type][contract-types]. A contract-type's values can be assumed
safe for a given context, in this case a [`goog.html.SafeUrl`][safe-url].

```js
goog.require('goog.html.SafeUrl');
goog.require('goog.string.Const');

Polymer({
 is: 'my-a-tag',
 SAFE_URL: goog.html.SafeUrl.fromConstant(
     goog.string.Const.from('javascript:void(0)')),
 _getUrl: function () { return this.SAFE_URL; }
});
```

This requires the use of the [Closure library][closure-library] which defines
the contract types and provides various APIS to construct
([goog.html][goog.html]) and use ([goog.dom.safe][goog.dom.safe]) safe HTML
types.

Instead of using a contract type, code can often be refactored to do without.
This sample code could be refactored to use a `<button>` without any data
binding.

If you find that something is rejected that is innocuous, file a [bug][issues].
Polymer-resin whitelists elements and attributes, and our whitelist is probably
incomplete.

## <a name="end-to-end"></a>End-to-end safety

TODO: talk about using in conjunction with JSConformance and `--polymer_pass` to
check sanitariness of JS and sources of safe html types.  We're going to base
this on
[the JSConformance sample policy](https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/example_conformance_proto.textproto)
or
[the closure-maven-plugin policy](https://github.com/mikesamuel/closure-maven-plugin/blob/master/plugin/src/it/demo/src/main/js/jsconf.textproto)
demo, but writing this section prior to deploying one alongside polymer-resin is
premature.

## <a name="caveats"></a>Caveats

Polymer-resin provides a high level of confidence that Polymer templates will
not unintentionally

1.  Execute code contained in third party strings or load code from URLs
    specified by a third party, or
2.  send data to a location specified by a third party, or
3.  allow third-parties to introduce element IDs except in specified namespaces.

Polymer-resin can fail to protect an app in some circumstances.

1.  There might be bugs in polymer-resin. Polymer-resin has been developed and
    reviewed by Google's security engineering team but bugs with security
    consequences have been found in similar systems.
2.  JavaScript code that assigns to properties of builtin elements instead of
    via Polymer data bindings. See [end to end](#end-to-end) for an explanation
    of how to use JSConformance to secure your JavaScript.
3.  Incorrect use of [unchecked conversions][unchecked-conversions]
4.  XSS in server-side HTML generation. This affects the HTML before
    polymer-resin has a chance to run. Use a contextually auto-escaped template
    system to generate your server-side HTML.

## <a name="faq"></a>FAQ

### Should I stop reviewing code for security vulnerabilities?

No. Just because polymer-resin is preventing attacker controlled values from
reaching browser internals does not mean that one can safely ignore injection
vulnerabilities.

It is good to have [defense in depth][d.i.d.]. Polymer-resin may have bugs or
browsers may change so that what was once safe no longer is. The latter can be
mitigated by upgrading regularly, but the probability that polymer-resin fails
*and* an attacker finds a way to get a payload to vulnerable code is still lower
than the probability that polymer-resin fails, so reviewing code for
vulnerabilities still contributes to safety.

Injection vulnerabilities often occur when code is incorrect. Polymer-resin may
prevent incorrectness from having security consequences but it may still affect
user experience. For example, in the below, the favoriteColor does not reach the
browser's CSS parser, but the value for `<select>` still corresponds to no
option.

```html
<template>
  <div style="color: [[favoriteColor]]">[[favoriteColor]]</div>
  <select value="{{favoriteColor::change}}">
    <template is="dom-repeat" items="{{colors}}">
      <option value="{{item}}">{{item}}</option>
    </template>
  </select>
</template>
```

Polymer-resin stops data-bound values from reaching browser sinks, but if an
attacker can thread a value all the way through frontends and storage systems to
a data binding expression, it's more likely that they can get it to other common
targets like JavaScript, server-side template languages, and database query
engines.

[vulcanize]: http://closuretools.blogspot.com/2016/10/polymer-closure-compiler-in-gulp.html
[goog.html]: https://github.com/google/closure-library/tree/master/closure/goog/html
[goog.dom.safe]: https://github.com/google/closure-library/blob/master/closure/goog/dom/safe.js
[safe-url]: https://google.github.io/closure-library/api/goog.html.SafeUrl.html
[safe-html-types]: https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md
[html-import]: https://www.webcomponents.org/community/articles/introduction-to-html-imports
[a.c.e.]: https://en.wikipedia.org/wiki/Arbitrary_code_execution
[contracts-a-href]: https://github.com/Polymer/polymer-resin/blob/ff7f58f00ec0794517ecca11a801a2a7e6c04e84/lib/contracts/contracts.js#L296-L302
[closure-library]: https://github.com/google/closure-library
[contract-types]: https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md#types
[csp-report-only]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only
[releases]: https://github.com/Polymer/polymer-resin/releases
[issues]: https://github.com/Polymer/polymer-resin/issues
[d.i.d.]: https://en.wikipedia.org/wiki/Defense_in_depth_%28computing%29
[unchecked-conversions]: https://github.com/google/safe-html-types/blob/master/doc/safehtml-unchecked.md
