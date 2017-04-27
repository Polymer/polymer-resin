# HTML Name Aliases

Provides a mapping between HTML element names like `<input formaction>` and
JavaScript object property names like `myFormInputElement.formAction`.

[HTMLInputElement.idl][htmlinputelement-idl] defines

```idl
    [CFReactions] attribute USVString formAction;
```

and Chromium defines

```idl
    [Reflect, URL] attribute DOMString formAction;
```

A human reader knows from this that the HTML formaction attribute is a URL.

For [polymer-resin] we need to do a worst-case analysis, given a property name,
about the HTML attributes it might reflect, and vice versa.

There are a few complicating factors:

1.  HTML attributes are case-insensitive `<input formaction>` =~= `<input
    FORMACTION>`
2.  ES property names are case-sensitive `(o.formAction)` vs. `(o.formaction)`.
3.  There is an ambiguity in how Polymer internals deal with data bindings.
    Given both `<input formaction$="{{...}}">` and `<input
    formaction="{{...}}">` the internal
    `Polymer.Base._computeFinalAnnotationValue` receives the name *"formaction"*
    with type *"property"*.

    `<input form-action="{{...}}">` does cause a call with name *"formAction"*
    and type *"property"* but we can't rely on developers consistently using
    that over the, arguably correct, `$=` form, which can lead to a
    `javascript:...` URL reaching a URL sink without being checked.

We extract a list of all `[Reflect]` attributes that can appear on instances of
*HTMLElement*, *SVGElement*, etc. so that, when we see, e.g., name
*"formaction"* we can consider *"formAction"* as well in a worst-case analysis.

[htmlinputelement-idl]: https://html.spec.whatwg.org/multipage/forms.html#the-input-element
[polymer-resin]: https://github.com/Polymer/polymer-resin/
