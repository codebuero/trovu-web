
function splitKeepRemainder(string, delimiter, n) {
  if (!string) {
    return [];
  }
  var parts = string.split(delimiter);
  return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)]);
}

function getParams() {
  return new URLSearchParams(window.location.search.slice(1));
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

export {
  getLanguageAndCountry,
  getNamespaces,
  getParams,
  splitKeepRemainder
}

