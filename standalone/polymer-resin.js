var n=function(a,d,b){return a.call.apply(a.bind,arguments)},p=function(a,d,b){if(!a)throw Error();if(2<arguments.length){var l=Array.prototype.slice.call(arguments,2);return function(){var b=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(b,l);return a.apply(d,b)}}return function(){return a.apply(d,arguments)}},r=function(a,d,b){Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?r=n:r=p;return r.apply(null,arguments)};var C=function(a,d){if(d)a=a.replace(t,"&amp;").replace(u,"&lt;").replace(v,"&gt;").replace(y,"&quot;").replace(z,"&#39;").replace(A,"&#0;");else{if(!B.test(a))return a;-1!=a.indexOf("&")&&(a=a.replace(t,"&amp;"));-1!=a.indexOf("<")&&(a=a.replace(u,"&lt;"));-1!=a.indexOf(">")&&(a=a.replace(v,"&gt;"));-1!=a.indexOf('"')&&(a=a.replace(y,"&quot;"));-1!=a.indexOf("'")&&(a=a.replace(z,"&#39;"));-1!=a.indexOf("\x00")&&(a=a.replace(A,"&#0;"))}return a},t=/&/g,u=/</g,v=/>/g,y=/"/g,z=/'/g,A=/\x00/g,B=/[\x00&<>"']/,
aa=function(a){return String(a).replace(/\-([a-z])/g,function(a,b){return b.toUpperCase()})};var E=function(){this.f=D};E.prototype.o=!0;E.prototype.l=function(){return""};E.prototype.toString=function(){return"Const{}"};var F=function(a){return a instanceof E&&a.constructor===E&&a.f===D?"":"type_error:Const"},D={};var H=function(){this.f=G};H.prototype.o=!0;var G={};H.prototype.l=function(){return""};var ba=function(a){return a instanceof H&&a.constructor===H&&a.f===G?"":"type_error:SafeScript"};var J=function(){this.f=I};J.prototype.o=!0;var I={};J.prototype.l=function(){return""};var ca=function(a){return a instanceof J&&a.constructor===J&&a.f===I?"":"type_error:SafeStyle"};var L=function(){this.f=K};L.prototype.o=!0;L.prototype.l=function(){return""};var da=function(a){return a instanceof L&&a.constructor===L&&a.f===K?"":"type_error:TrustedResourceUrl"},K={};var N=function(){this.f="";this.A=M};N.prototype.o=!0;N.prototype.l=function(){return this.f};var ea=function(a){return a instanceof N&&a.constructor===N&&a.A===M?a.f:"type_error:SafeUrl"},fa=/^(?:(?:https?|mailto|ftp):|[^&:/?#]*(?:[/?#]|$))/i,M={},O=function(a){var d=new N;d.f=a;return d};O("about:blank");var Q=function(){this.f=P};Q.prototype.o=!0;Q.prototype.l=function(){return""};var ga=function(a){return a instanceof Q&&a.constructor===Q&&a.f===P?"":"type_error:SafeHtml"},P={};/*

 Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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
var ha={align:1,alt:1,bgcolor:1,border:1,checked:1,"class":1,color:1,cols:1,colspan:1,dir:8,disabled:1,"for":10,height:1,hidden:1,href:4,id:10,name:10,placeholder:1,rel:1,role:1,rows:1,rowspan:1,selected:1,size:1,src:4,style:5,target:8,title:1,valign:1,value:1,width:1},R={a:{href:[{c:3}]},area:{href:[{c:3}]},audio:{src:[{c:3}]},blockquote:{cite:[{c:3}]},button:{formaction:[{c:3}],formmethod:[{c:1}],type:[{c:1}]},command:{type:[{c:1}]},del:{cite:[{c:3}]},form:{action:[{c:3}],method:[{c:1}]},img:{src:[{c:3}]},
input:{formaction:[{c:3}],formmethod:[{c:1}],max:[{c:1}],min:[{c:1}],src:[{c:3}],step:[{c:1}],type:[{c:1}]},ins:{cite:[{c:3}]},li:{type:[{c:1}]},link:{href:[{c:3,g:"rel",h:"alternate"},{c:3,g:"rel",h:"author"},{c:3,g:"rel",h:"bookmark"},{c:3,g:"rel",h:"canonical"},{c:3,g:"rel",h:"cite"},{c:3,g:"rel",h:"help"},{c:3,g:"rel",h:"icon"},{c:3,g:"rel",h:"license"},{c:3,g:"rel",h:"next"},{c:3,g:"rel",h:"prefetch"},{c:3,g:"rel",h:"prerender"},{c:3,g:"rel",h:"prev"},{c:3,g:"rel",h:"search"},{c:3,g:"rel",h:"subresource"}],
media:[{c:1}],type:[{c:1}]},menuitem:{icon:[{c:3}]},ol:{type:[{c:1}]},q:{cite:[{c:3}]},source:{media:[{c:1}],src:[{c:3}]},style:{media:[{c:1}]},video:{poster:[{c:3}],src:[{c:3}]}},S={a:1,abbr:1,address:1,applet:4,area:5,article:1,aside:1,audio:1,b:1,base:4,bdi:1,bdo:1,blockquote:1,body:1,br:5,button:1,canvas:1,caption:1,cite:1,code:1,col:5,colgroup:1,command:1,data:1,datalist:1,dd:1,del:1,details:1,dfn:1,dialog:1,div:1,dl:1,dt:1,em:1,embed:4,fieldset:1,figcaption:1,figure:1,font:1,footer:1,form:1,
frame:1,frameset:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,head:1,header:1,hr:5,html:1,i:1,iframe:4,img:5,input:5,ins:1,kbd:1,keygen:5,label:1,legend:1,li:1,link:5,main:1,map:1,mark:1,math:4,menu:1,menuitem:1,meta:4,meter:1,nav:1,noscript:1,object:4,ol:1,optgroup:1,option:1,output:1,p:1,param:5,picture:1,pre:1,progress:1,q:1,rb:1,rp:1,rt:1,rtc:1,ruby:1,s:1,samp:1,script:3,section:1,select:1,slot:1,small:1,source:5,span:1,strong:1,style:2,sub:1,summary:1,sup:1,svg:4,table:1,tbody:1,td:1,template:4,textarea:1,
tfoot:1,th:1,thead:1,time:1,title:1,tr:1,track:5,u:1,ul:1,"var":1,video:1,wbr:5};var T={accept_charset:"acceptCharset",accesskey:"accessKey",alink:"aLink",allowfullscreen:"allowFullscreen",bgcolor:"bgColor",cellpadding:"cellPadding",cellspacing:"cellSpacing","char":"ch",charoff:"chOff",checked:"defaultChecked","class":"className",codebase:"codeBase",codetype:"codeType",contenteditable:"contentEditable",crossorigin:"crossOrigin",datetime:"dateTime",dirname:"dirName","for":"htmlFor",formaction:"formAction",formenctype:"formEnctype",formmethod:"formMethod",formnovalidate:"formNoValidate",
formtarget:"formTarget",frameborder:"frameBorder",http_equiv:"httpEquiv",innerhtml:"innerHTML",innertext:"innerText",inputmode:"inputMode",ismap:"isMap",longdesc:"longDesc",marginheight:"marginHeight",marginwidth:"marginWidth",maxlength:"maxLength",mediagroup:"mediaGroup",minlength:"minLength",muted:"defaultMuted",nodevalue:"nodeValue",nohref:"noHref",noresize:"noResize",noshade:"noShade",novalidate:"noValidate",nowrap:"noWrap",outerhtml:"outerHTML",outertext:"outerText",readonly:"readOnly",selected:"defaultSelected",
tabindex:"tabIndex",textcontent:"textContent",truespeed:"trueSpeed",usemap:"useMap",valign:"vAlign",value:"defaultValue",valueasdate:"valueAsDate",valueasnumber:"valueAsNumber",valuetype:"valueType",vlink:"vLink"},U=null;var W={},X=!1,Y=0,ia=/^(?!(?:annotation-xml|color-profile|font-face|font-face(?:-(?:src|uri|format|name))?|missing-glyph)$)[a-z][a-z.0-9_\u00b7\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u037d\u200c\u200d\u203f-\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\udfff\uf900-\ufdcf\ufdf0-\ufffd]*-[\-a-z.0-9_\u00b7\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u037d\u200c\u200d\u203f-\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\udfff\uf900-\ufdcf\ufdf0-\ufffd]*$/,Z=function(a,d){var b=window.customElements;if(X){for(var l=Polymer.telemetry.registrations,
q=l.length,w=Y;w<q;++w)W[l[w].is]=W;Y=q}return b&&b.get(a)||W[a]===W?2:d===HTMLUnknownElement?1:d===HTMLElement&&ia.test(a)?3:0};var ja=/^$/;
(function(){function a(){function a(a){return this.getAttribute(a)}function l(c,f,b,e){if(!e)return e;var g=c.nodeType;if(1!==g){if(3===g&&(c=c.parentElement)&&1===c.nodeType){g=c.localName;f=!1;switch(Z(g,c.constructor)){case 0:case 1:f=1===(Object.hasOwnProperty.call(S,g)?S[g]:null);break;case 3:case 2:f=!0}if(f)return e&&e.o?e.l():String(e)}return"zClosurez"}var g=c.localName;var k=c.localName;if(c.getAttribute("is")||2!==Z(k,c.constructor)){var h=q[k];h||(h=q[k]=document.createElement(k));k=h}else k=
w;switch(b){case "attribute":var h=String(f).toLowerCase(),l=T[h];if(("string"==typeof l?l:aa(h))in k)break;return e;case "property":if(f in k)break;h=T[f.toLowerCase()];if((h="string"==typeof h?h:null)&&h in k)break;return e;default:throw Error(b+": "+typeof b);}if("attribute"==b)f=f.toLowerCase();else{b=U;if(!b){b={};for(var m in T)b[T[m]]=m;b=U=b}m=b[f];f="string"==typeof m?m:String(f).replace(/([A-Z])/g,"-$1").toLowerCase()}a:{c=r(a,c);if(Object.hasOwnProperty.call(R,g)&&(g=R[g],Object.hasOwnProperty.call(g,
f)&&(g=g[f],g instanceof Array))){f=null;m=0;for(b=g.length;m<b;++m){k=g[m];h=k.g;if(!h){c=k.c;break a}null===f&&(f={});if((Object.hasOwnProperty.call(f,h)?f[h]:f[h]=c(h))===k.h){c=k.c;break a}}c=null;break a}c=ha[f];c="number"===typeof c?c:null}g="zClosurez";if(null!=c){c=d[c];if(c.j&&e instanceof c.j)return c.m(e);e=e&&e.o?e.l():String(e);g=c.filter?c.filter(e):e}return g}console.log("initResin");var q={},w=document.createElement("polyresinuncustomized");if(/^1\./.test(Polymer.version)){X=!0;var ka=
Polymer.Base.w,x=function(a,b,d,e){d=ka.call(Polymer.Base,a,b,d,e);var c="property";e&&e.propertyName?b=e.propertyName:c=e&&e.kind||"property";return l(a,b,c,d)};Polymer.Base.w=x;if(Polymer.Base.w!==x)throw Error("Cannot replace _computeFinalAnnotationValue.  Is Polymer frozen?");}else{var V=Polymer.f,x=function(a,b,d,e){a=V?V.call(Polymer,a,b,d,e):a;return l(e,b,d,a)};Polymer.f=x;if(Polymer.f!==x)throw Error("Cannot install sanitizeDOMValue.  Is Polymer frozen?");}}var d=[,{filter:null,v:null,j:null,
m:null}];d[2]={filter:C,v:null,j:Q,m:ga};d[3]={filter:function(a){a instanceof N||(a=a.o?a.l():String(a),fa.test(a)||(a="about:invalid#zClosurez"),a=O(a));return a.l()},v:"about:invalid#zClosurez",j:N,m:ea};d[4]={filter:function(){return"about:invalid#zClosurez"},v:"about:invalid#zClosurez",j:L,m:da};d[5]={filter:function(){return"zClosurez"},v:"zClosurez",j:J,m:ca};d[7]={filter:function(){return"/*zClosurez*/"},v:"/*zClosurez*/",j:H,m:ba};d[8]={filter:function(){return"zClosurez"},v:"zClosurez",
j:null,m:null};d[9]={filter:function(){return"/*zClosurez*/"},v:"zClosurez",j:E,m:F};d[10]={filter:function(a){return ja.test(a)?a:"zClosurez"},v:"zClosurez",j:E,m:F};"undefined"!==typeof Polymer&&Polymer.version?a():window.addEventListener("HTMLImportsLoaded",a)})();