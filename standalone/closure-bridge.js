(function(){'use strict';var d=function(){this.a=b};d.prototype.c=!0;d.prototype.b=function(){return""};d.prototype.toString=function(){return"Const{}"};var b={};var f=function(){this.a=e};f.prototype.c=!0;var e={};f.prototype.b=function(){return""};var h=function(){this.a=g};h.prototype.c=!0;h.prototype.b=function(){return""};var g={};var k=/&/g,l=/</g,n=/>/g,p=/"/g,r=/'/g,t=/\x00/g,u=/[\x00&<>"']/;var w=function(){this.a="";this.h=v};w.prototype.c=!0;w.prototype.b=function(){return this.a};var x=/^(?:(?:https?|mailto|ftp):|[^:/?#]*(?:[/?#]|$))/i,v={},y=function(a){var c=new w;c.a=a;return c};y("about:blank");var A=function(){this.a=z};A.prototype.c=!0;var z={};A.prototype.b=function(){return""};var C=function(){this.a=B};C.prototype.c=!0;C.prototype.b=function(){return""};var B={};/*

 Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 This code may only be used under the BSD style license found at
 http://polymer.github.io/LICENSE.txt
 The complete set of authors may be found at
 http://polymer.github.io/AUTHORS.txt
 The complete set of contributors may be found at
 http://polymer.github.io/CONTRIBUTORS.txt
 Code distributed by Google as part of the polymer project is also
 subject to an additional IP rights grant found at
 http://polymer.github.io/PATENTS.txt
*/
var D=function(a){return a&&a.c?a.b():a},E={CONSTANT:{f:d,g:function(a){return a instanceof d&&a.constructor===d&&a.a===b?"":"type_error:Const"}},JAVASCRIPT:{f:f,g:function(a){return a instanceof f&&a.constructor===f&&a.a===e?"":"type_error:SafeScript"}},HTML:{f:C,g:function(a){return a instanceof C&&a.constructor===C&&a.a===B?"":"type_error:SafeHtml"}},RESOURCE_URL:{f:h,g:function(a){return a instanceof h&&a.constructor===h&&a.a===g?"":"type_error:TrustedResourceUrl"}},STRING:{f:Object,g:D},STYLE:{f:A,
g:function(a){return a instanceof A&&a.constructor===A&&a.a===z?"":"type_error:SafeStyle"}},URL:{f:w,g:function(a){return a instanceof w&&a.constructor===w&&a.h===v?a.a:"type_error:SafeUrl"}}},F=function(a,c){return c},G={CONSTANT:F,JAVASCRIPT:F,HTML:function(a,c){if(c)a=a.replace(k,"&amp;").replace(l,"&lt;").replace(n,"&gt;").replace(p,"&quot;").replace(r,"&#39;").replace(t,"&#0;");else{if(!u.test(a))return a;-1!=a.indexOf("&")&&(a=a.replace(k,"&amp;"));-1!=a.indexOf("<")&&(a=a.replace(l,"&lt;"));
-1!=a.indexOf(">")&&(a=a.replace(n,"&gt;"));-1!=a.indexOf('"')&&(a=a.replace(p,"&quot;"));-1!=a.indexOf("'")&&(a=a.replace(r,"&#39;"));-1!=a.indexOf("\x00")&&(a=a.replace(t,"&#0;"))}return a},RESOURCE_URL:F,STRING:String,STYLE:F,URL:function(a){a instanceof w||(a="object"==typeof a&&a.c?a.b():String(a),x.test(a)||(a="about:invalid#zClosurez"),a=y(a));return a.b()}},H=function(a,c,q){var m=E[c];return a instanceof m.f&&(m=m.g(a,q),m!==q)?m:(0,G[c])(""+D(a),q)},I=["security","polymer_resin","closure_bridge",
"safeTypesBridge"],J=this;I[0]in J||"undefined"==typeof J.execScript||J.execScript("var "+I[0]);for(var K;I.length&&(K=I.shift());)I.length||void 0===H?J[K]&&J[K]!==Object.prototype[K]?J=J[K]:J=J[K]={}:J[K]=H;}).call(this);
