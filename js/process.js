import jsyaml from 'js-yaml'
import {
  getLanguageAndCountry,
  getNamespaces,
  getParams,
  splitKeepRemainder
} from './shared'

import { parseDate } from './type/date'
import { parseTime } from './type/time'

const fetchUrlTemplateDefault = (namespace,keyword, argumentCount ) => 
  `https://raw.githubusercontent.com/codebuero/trovu-data/master/shortcuts/${namespace}/${keyword}/${argumentCount}.yml`

/**
 * Fetch the content of a file behind an URL.
 *
 * @param {string} url    - The URL of the file to fetch.
 *
 * @return {string} text  - The content.
 */
async function fetchAsync(url, reload) {
  const res = await fetch(url, { cache: (reload ? "reload" : "force-cache") });
  const content = await res.text()
  if (!res.ok) {
    throw new Error(`Request-Error: ${res.status} ${res.statusText}`)
  }

  return content;
}

/**
 * Build fetch URL given the necessary parameters.
 *
 * @param {string} namespace        - The namespace to use.
 * @param {string} keyword          - The keyword to use.
 * @param {string} argumentCount    - The argumentCount to use.
 *
 * @return {string} fetchUrl        - The URL with the replaced placeholders.
 */
function buildFetchUrl(namespace, keyword, argumentCount) {
  return fetchUrlTemplateDefault(encodeURIComponent(namespace), encodeURIComponent(keyword), argumentCount)
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
    for (let attrStr of nameAndAttributes) {
      let [attrName, attrValue] = attrStr.split('=', 2);
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

async function replaceArguments(str, args, env) {
  let locale = env.language + '-' + env.country.toUpperCase();
  var placeholders = getArgumentsFromString(str);
  for (let argumentName in placeholders) {
    var argument = args.shift();
    // Copy argument, because different placeholders can cause
    // different processing.
    var processedArgument = argument;

    processedArgument = processedArgument.trim();
    
    // An argument can have multiple matches,
    // so go over all of them.
    var matches = placeholders[argumentName];
    for (let match in matches) {
      var attributes = matches[match];
      switch (attributes.type) {
          
        case 'date':
          let date = parseDate(processedArgument, locale);

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
          let time = parseTime(processedArgument, locale);

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
      str = str.replace(match, processedArgument);
    }
  }
  return str;
}


function replaceVariables(str, variables) {
  var placeholders = getVariablesFromString(str);
  for (let varName in placeholders) {
    var matches = placeholders[varName];
    for (let match in matches) {
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

async function fetchShortcuts(env, keyword, args) {
  const {
    namespaces
  } = env
  // Fetch all available shortcuts for our query and namespace settings.
  let shortcuts = {};

  for await (let namespace of namespaces) {
    const fetchUrl = buildFetchUrl(namespace, keyword, args.length);
    console.log(fetchUrl)
    try {
      const def = await fetchAsync(fetchUrl);      
      shortcuts[namespace] =  jsyaml.load(def);
    } catch (e) {
      // ignore errors like undefined shortcuts etc.
      console.error(e)
      console.log('no or broken definition found for namespace & keyword: ', namespace, keyword)
      continue
    }
  }

  return shortcuts;
}

async function getRedirectUrl(env) {
  var variables = {
    language: env.language,
    country:  env.country
  };
  
  let args = []
  let [keyword, remain] = splitKeepRemainder(env.query, " ", 2);
  if (remain.length) {
    args = remain.split(",");
  }

  env.reload = false;

  // Check for extraNamespace in keyword.
  if (keyword.match(/\./)) {
    [extraNamespace, keyword] = splitKeepRemainder(keyword, ".", 2);
    env.namespaces.push(extraNamespace);
  }
  
  const shortcuts = await fetchShortcuts(env, keyword, args)
  
  let redirectUrl = ''

  Object.keys(shortcuts).forEach((key, idx) => {
    if (idx === 0) redirectUrl = shortcuts[key].url
    console.log('shortcut:', key, shortcuts[key])
  })

  redirectUrl = replaceVariables(redirectUrl, variables)
  redirectUrl = await replaceArguments(redirectUrl, args, env)

  return redirectUrl;
}

export {
  getRedirectUrl,
  fetchShortcuts,
  escapeRegExp,
  replaceVariables,
  replaceArguments,
  getVariablesFromString,
  getArgumentsFromString,
  getPlaceholdersFromString,
  buildFetchUrl,
  fetchAsync,
}