const fetchUrlTemplateDefault = "https://raw.githubusercontent.com/trovu/trovu-data/master/shortcuts/{%namespace}/{%keyword}/{%argumentCount}.yml"
const momentjsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment-with-locales.min.js';

function splitKeepRemainder(string, delimiter, n) {
  if (!string) {
    return [];
  }
  var parts = string.split(delimiter);
  return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)]);
}


// jQuery Param handling ============================================

// Source:
// https://github.com/knowledgecode/jquery-param/blob/master/jquery-param.js
function jqueryParam(a) {
  var s = [];
  var add = function (k, v) {
    v = typeof v === 'function' ? v() : v;
    v = v === null ? '' : v === undefined ? '' : v;
    s[s.length] = encodeURIComponent(k) + '=' + encodeURIComponent(v);
  };
  var buildParams = function (prefix, obj) {
    var i, len, key;

    if (prefix) {
      if (Array.isArray(obj)) {
        for (i = 0, len = obj.length; i < len; i++) {
          buildParams(
            prefix + '[' + (typeof obj[i] === 'object' && obj[i] ? i : '') + ']',
            obj[i]
          );
        }
      } else if (String(obj) === '[object Object]') {
        for (key in obj) {
          buildParams(prefix + '[' + key + ']', obj[key]);
        }
      } else {
        add(prefix, obj);
      }
    } else if (Array.isArray(obj)) {
      for (i = 0, len = obj.length; i < len; i++) {
        add(obj[i].name, obj[i].value);
      }
    } else {
      for (key in obj) {
        buildParams(key, obj[key]);
      }
    }
    return s;
  };

  return buildParams('', a).join('&');
};


// Based on:
// https://stackoverflow.com/a/3355892/52023
function jqueryDeparam(paramStr) {

  // Prepare params.
  var params = {};

  // Get pairs.
  var keyValueStrings = paramStr.split('&');

  // Iterate over all pairs.
  for (keyValueString of keyValueStrings) {

    [name, value] = keyValueString.split('=');

    if (typeof value == 'undefined') {
      value = '';
    }

    // Decode.
    name = decodeURIComponent(name);
    value = value.replace(/\+/g, '%20');
    value = decodeURIComponent(value);

    name = name.trim();

    // Skip empty.
    if ('' == name) {
      continue;
    }

    // Prepare indices.
    var indices = [];

    // Move indices from string into array.
    var name = name.replace(/\[([^\]]*)\]/g, 
      function(k, idx) { indices.push(idx); return ""; });

    indices.unshift(name);
    var o = params;

    for (var j=0; j<indices.length-1; j++) {
      var idx = indices[j];
      if (!o[idx]) {
        o[idx] = {};
      }
      o = o[idx];
    }

    idx = indices[indices.length-1];
    if (idx == "") {
      o.push(value);
    }
    else {
      o[idx] = value;
    }
  }
  return params;
}

// Param getters ====================================================

function getParams() {
  var paramStr = window.location.hash.substr(1);
  let params = jqueryDeparam(paramStr);
  return params;
}

function getNamespaces(params, env) {

  var namespacesStr = params.namespaces || "";
  if (namespacesStr) {
    var namespaces = namespacesStr.split(',')
  }
  else {
    // Default namespaces.
    var namespaces = [
      'o',
      env.language,
      '.' +  env.country
    ];
  }
  return namespaces;
}

function getNamespaceUrlTemplates(params) {
  
  let namespaceUrlTemplates = params.namespace || {};
  return namespaceUrlTemplates;
}

function getLanguageAndCountry(params) {

  let language = null;
  let country = null;

  // Get from browser.
  let languageStr = navigator.language;
  if (languageStr) {
    [language, country] = languageStr.split('-')
  }

  // Override via params.
  if (params.language) {
    language = params.language;
  }
  if (params.country) {
    country = params.country;
  }

  // Default fallbacks.
  if (!language) {
    language = 'en';
  }
  if (!country) {
    country = 'us';
  }

  // Ensure lowercase.
  language = language.toLowerCase();
  country  = country.toLowerCase();

  return {
    language: language,
    country:  country
  };
}

function getEnv() {

  let env = {};
  params = getParams()

  env = Object.assign(env, getLanguageAndCountry(params));

  env.query                 = params.query || "";
  env.namespaces            = getNamespaces(params, env);
  env.namespaceUrlTemplates = getNamespaceUrlTemplates(params);

  return env;
}

// Builders =========================================================

function buildBaseUrl() {

  let baseUrl = '';

  baseUrl += window.location.protocol;
  baseUrl += '//';
  baseUrl += window.location.hostname;
  baseUrl += window.location.pathname;

  // Remove index.html.
  baseUrl = baseUrl.replace('index.html','');

  return baseUrl;
}

function buildParams() {

  let params = {};

  // Put environment into hash.
  params['namespaces'] = env.namespaces.join(',');
  params['namespace'] = env.namespaceUrlTemplates;
  params['language'] = env.language;
  params['country'] = env.country;

  return params;
}
