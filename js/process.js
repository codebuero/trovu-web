/**
 * Fetch the content of a file behind an URL.
 *
 * @param {string} url    - The URL of the file to fetch.
 *
 * @return {string} text  - The content.
 */
async function fetchAsync(url, reload) {
  const response = await fetch(
    url,
    {
      cache: (reload ? "reload" : "force-cache")
    }
  );
  if (response.status != 200) {
    //log("Fail:    " + url);
    log('.');
    return null;
  }
  //log("Success: " + url);
  log('.');
  const text = await response.text();
  return text;
}

/**
 * Build fetch URL given the necessary parameters.
 *
 * @param {string} namespace        - The namespace to use.
 * @param {string} keyword          - The keyword to use.
 * @param {string} argumentCount    - The argumentCount to use.
 * @param {string} fetchUrlTemplate - A template containing placeholders for all the above.
 *
 * @return {string} fetchUrl        - The URL with the replaced placeholders.
 */
function buildFetchUrl(namespace, keyword, argumentCount, fetchUrlTemplate) {

  if (!fetchUrlTemplate) {
    fetchUrlTemplate = fetchUrlTemplateDefault;
  }

  namespace = encodeURIComponent(namespace);
  keyword   = encodeURIComponent(keyword);

  var replacements = {
    '{%namespace}':     namespace,
    '{%keyword}':       keyword,
    '{%argumentCount}': argumentCount
  }
  var fetchUrl = fetchUrlTemplate;
  for (key in replacements) {
    fetchUrl = fetchUrl.replace(key, replacements[key]);
  }

  return fetchUrl;
}

/**
 * Get placeholder names from a string.
 *
 * @param {string} str    - The string containing placeholders.
 * @param {string} prefix - The prefix of the placeholders. Must be Regex-escaped.
 *
 * @return {object} placeholders - Array keyed with the arguments names and with an array of corresponding placeholders.
 *
 *   If the placeholder with the same name occurs multiple times, there are also
 *   multiple arrays in the nested array. 
 *
 *   Example: 
 *     http://{%first|type=foo}{%first|type=bar}
 *   becomes:
 *   Array 
 *       (
 *            [first] => Array
 *            (
 *                [{%first|type=foo}] => Array
 *                    (
 *                        [type] => foo
 *                    )
 *                [{%first|type=bar}] => Array
 *                    (
 *                        [type] => bar
 *                    )
 *            )
 *        )
 */
function getPlaceholdersFromString(str, prefix) {

  var pattern = '{' + prefix + '(.+?)}';
  var re = RegExp(pattern, 'g');
  var match;
  var placeholders = {};

  do {
    match = re.exec(str);
    if (!match) {
      break;
    }

    // Example value:
    // match[1] = 'query|encoding=utf-8|another=attribute'
    var nameAndAttributes = match[1].split('|');

    // Example value:
    // name = 'query'
    var name = nameAndAttributes.shift();

    var placeholder = {};
    // Example value:
    // name_and_attributes = ['encoding=utf-8', 'another=attribute']
    for (attrStr of nameAndAttributes) {
      [attrName, attrValue] = attrStr.split('=', 2);
      placeholder[attrName] = attrValue;
    }
    placeholders[name] = placeholders[name] || {};
    placeholders[name][match[0]] = placeholder;

  } while (match);

  return placeholders;
}

/**
 * Get argument names from a string.
 *
 * @param {string} str    - The string containing placeholders.
 *
 * @return {object} placeholders - Array keyed with the arguments names and with an array of corresponding placeholders.
 */
function getArgumentsFromString(str) {
  return getPlaceholdersFromString(str, '%')
}

/**
 * Get variable names from a string.
 *
 * @param {string} str    - The string containing placeholders.
 *
 * @return {object} placeholders - Array keyed with the arguments names and with an array of corresponding placeholders.
 */
function getVariablesFromString(str) {
  return getPlaceholdersFromString(str, '\\$')
}

async function replaceArguments(str, arguments, env) {

  let locale = env.language + '-' + env.country.toUpperCase();

  var placeholders = getArgumentsFromString(str);

  for (argumentName in placeholders) {

    var argument = arguments.shift();

    // Copy argument, because different placeholders can cause
    // different processing.
    var processedArgument = argument;

    processedArgument = processedArgument.trim();
    
    // An argument can have multiple matches,
    // so go over all of them.
    var matches = placeholders[argumentName];
    for (match in matches) {
      var attributes = matches[match];
      switch (attributes.type) {
          
        case 'date':

          // Load date.js
          if (typeof parse_date !== "function") {
            await loadScripts(['../js/type/date.js']);
          }

          let date = await parse_date(processedArgument, locale);

          // If date could be parsed:
          // Set argument.
          if ((date) && (date.format() != 'Invalid date')) {
            let format = 'YYYY-MM-DD';
            if (attributes.output) {
              format = attributes.output;
            }
            processedArgument = date.format(format);
          }

          break;

        case 'time':

          // Load time.js
          if (typeof parse_time !== "function") {
            await loadScripts(['../js/type/time.js']);
          }

          let time = await parse_time(processedArgument, locale);

          // If time could be parsed:
          // Set argument.
          if ((time) && (time.format() != 'Invalid time')) {
            let format = 'HH:mm';
            if (attributes.output) {
              format = attributes.output;
            }
            processedArgument = time.format(format);
          }

          break;

      }
      switch (attributes.transform) {
        case 'uppercase':
          processedArgument = processedArgument.toUpperCase();
          break;
        case 'lowercase':
          processedArgument = processedArgument.toLowerCase();
          break;
      }
      switch (attributes.encoding) {
        case 'iso-8859-1':
          processedArgument = escape(processedArgument);
          break;
        case 'none':
          break;
        default:
          processedArgument = encodeURIComponent(processedArgument);
          break;
      }
    }
    str = str.replace(match, processedArgument);
  }
  return str;
}


function replaceVariables(str, variables) {

  var placeholders = getVariablesFromString(str);

  for (varName in placeholders) {
    var matches = placeholders[varName];
    for (match in matches) {
      var attributes = matches[match];
      switch(varName) {
        case 'now':
          // TODO.
        default:
          var value = variables[varName];
          break; 
      }
      str = str.replace(new RegExp(escapeRegExp(match), 'g'), value);
    }
  }
  return str;
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function log(str) {
  //document.querySelector('#log').textContent += "\n" + str;
  document.querySelector('#log').textContent += str;
}

async function fetchShortcuts(env, keyword, arguments) {
  
  // Fetch all available shortcuts for our query and namespace settings.
  var shortcuts = [];
  let found = false;
  for (namespace of env.namespaces) {
    let fetchUrlTemplate = env.namespaceUrlTemplates[namespace];
    var fetchUrl = buildFetchUrl(namespace, keyword, arguments.length, fetchUrlTemplate);
    //log("Request: " + fetchUrl);
    let text  = await fetchAsync(fetchUrl, env.reload);
    shortcuts[namespace] = jsyaml.load(text);
    if (!found) {
      found = Boolean(shortcuts[namespace]);
    }
  }
  return [shortcuts, found];
}

async function getRedirectUrl(env) {

  if (!env.query) {
    return;  
  }

  var variables = {
    language: env.language,
    country:  env.country
  };
  
  [keyword, argumentString] = splitKeepRemainder(env.query, " ", 2);
  if (argumentString) {
    var arguments = argumentString.split(",");
  } else {
    var arguments = []; 
  }

  // Check for (cache) reload call.
  env.reload = false;
  if (keyword.match(/^reload:/)) {
    [reload, keyword] = splitKeepRemainder(keyword, ":", 2);
    env.reload = true;
  }
  // Check for extraNamespace in keyword.
  if (keyword.match(/\./)) {

    [extraNamespace, keyword] = splitKeepRemainder(keyword, ".", 2);

    // Add to namespaces.
    env.namespaces.push(extraNamespace);

    // Set variables.
    switch (extraNamespace.length) {
      case 2:
        variables.language = extraNamespace;
        break;
      case 3:
        variables.country = extraNamespace;
        break;
    }
  }

  [shortcuts, found] = await fetchShortcuts(env, keyword, arguments);

  // If nothing found:
  // Try without commas, i.e. with the whole argumentString as the only argument.
  if ((!found) && (arguments.length > 0)) {
    arguments = [argumentString];
    [shortcuts, found] = await fetchShortcuts(env, keyword, arguments);
  }

  let redirectUrl = null;

  // Find first shortcut in our namespace hierarchy.
  for (namespace of env.namespaces.reverse()) {
    if (shortcuts[namespace]) {
      redirectUrl = shortcuts[namespace]['url'];
      // TODO: Process POST arguments.
      break;
    }
  }

  if (!redirectUrl) {
    return;
  }

  //log('');
  //log("Used template: " + redirectUrl);
  log('success.');

  redirectUrl = replaceVariables(redirectUrl, variables);
  redirectUrl = await replaceArguments(redirectUrl, arguments, env);

  return redirectUrl;
}

async function loadScripts(scripts) {
    
    function get (src) {
        return new Promise(function (resolve, reject) {
            var el = document.createElement("script");
            el.async = true;
            el.addEventListener("load", function () {
                resolve(src);
            }, false);
            el.addEventListener("error", function () {
                reject(src);
            }, false);
            el.src = src;
            (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(el);
        });
    }

    const myPromises = scripts.map(async function (script, index) {
        return await get(script);
    });

    return await Promise.all(myPromises);
}

document.querySelector('body').onload = async function(event) {

  let env = getEnv();

  let redirectUrl = await getRedirectUrl(env);

  if (!redirectUrl) {
    let params = getParams();
    params.status = 'not_found';
    let paramStr = jqueryParam(params);
    redirectUrl = '../index.html#' + paramStr;
  }

  //log("Redirect to:   " + redirectUrl)
  
  //console.log(redirectUrl);
  //return;

  window.location.href = redirectUrl;
}


