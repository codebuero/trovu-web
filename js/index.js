import countriesList from 'countries-list'
import {
  getRedirectUrl,
  fetchShortcuts,
  escapeRegExp,
  replaceVariables,
  replaceArguments,
  getVariablesFromString,
  getArgumentsFromString,
  getPlaceholdersFromString,
  buildFetchUrl,
  fetchAsync 
} from './process'

import {
  getLanguageAndCountry,
  getNamespaces,
  getParams,
  splitKeepRemainder
} from './shared'

let env = {
  reload: false,
}

const {
  countries,
  languages
} = countriesList

document.querySelector('body').onload = function(event) {
 const params = getParams()

  env = {
    ...getLanguageAndCountry(params),
    query: params.query || "",
    namespaces: getNamespaces(params, getLanguageAndCountry(params)),
  }

  displaySettings(env);
}

const toggleElement = (id) => {
  const el = document.querySelector(id)
  let { style: { display } } = el
  if (display === 'none') {
    return el.style.display = 'block'
  } else {
    return el.style.display = 'none'
  }
}



document.getElementById('query-form').onsubmit = async function(event) {
  const { value:query } = document.getElementById('query'); 
  // Prevent default sending as GET parameters.
  event.preventDefault();

  let params = {
    namespaces: env.namespaces,
    namespace: env.namespaceUrlTemplate,
    language: env.language,
    country: env.country,
    query,
  }

  toggleElement('#loadingSpinner')
  
  let redirectUrl = await getRedirectUrl(params);
  
  if (!redirectUrl) {
    //$('#redirectWarning').text('Shortcut can\'t be found in your lookiverse, you might add one first').toggle()    
    return
  }
  console.log(redirectUrl)
  //$('#redirectWarning').text('Redirect hitting earth in 2.5s, fasten your seat belts....').toggle()
  //return;
  await new Promise((resolve) => setTimeout(resolve, 2500))
  // Redirect to process script.
  toggleElement('#loadingSpinner')


  //window.location.href = redirectUrl;
}

document.querySelector('button.add-search').onclick = function(event) {

  let urlOpensearch = document.querySelector('#linkSearch').getAttribute('href');
  window.external.AddSearchProvider(urlOpensearch);
}


document.querySelector('#settingsClose').onclick = function(event) {
  updateNamespaces();
}

function displaySettings(env) {
  // Set settings fields from environment.
  document.querySelector('#namespacesSetting').value = env.namespaces.join(',');

  document.querySelector('ol.namespaces').innerHTML = '';

  // Show namespaces and their template URLs.
  for (let i in env.namespaces) {
    let liElement = document.createElement('li');
    liElement.setAttribute('class', 'badge badge-secondary');
    
    liElement.textContent = env.namespaces[i];
    document.querySelector('ol.namespaces').append(liElement);
  }

  document.querySelector('.language.value').textContent = env.language;
  document.querySelector('.country.value').textContent = env.country;
}

function updateNamespaces() {

  if (
    (env.namespaces.length == 3) &&
    (env.namespaces[0] == 'o') &&
    (env.namespaces[1].length == 2) &&
    (env.namespaces[2].length == 3)
  ) {
    env.namespaces[1] = env.language;
    env.namespaces[2] = '.' + env.country;
  }

  displaySettings();
}

document.getElementById('languageSetting').onchange = function(event) {
  env.language = event.target.value;
  updateNamespaces();
}

document.getElementById('countrySetting').onchange = function(event) {
  env.country = event.target.value;
  updateNamespaces();
}

document.getElementById("settingsModalButton").addEventListener("click", function(e) {
  const languageSettings = document.getElementById('languageSetting')
  const countrySettings = document.getElementById('countrySetting')

  Object.keys(languages).forEach((key) => 
    languageSettings.appendChild(new Option(languages[key].name, key, null,env.language))
    //`<option value="${key}">${languages[key].name}</option>`
  )
  Object.keys(countries).forEach((key) => 
    countrySetting.appendChild(new Option(countries[key].name, key, null, env.country))
    //`<option value="${key}">${countries[key].name}</option>`
  )

  toggleElement('#settingsModal');
});

document.getElementById('namespacesSetting').onchange = function(event) {
  env.namespaces = event.target.value.split(',');
  updateNamespaces();
}
