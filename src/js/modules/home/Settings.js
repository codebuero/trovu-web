/** @module Settings */
import countriesList from 'countries-list';
const { countries, languages } = countriesList;

let _env;

const transformCountryObjectToOptionList = (obj) => {
  const ar = [];
  for (const [key, value] of Object.entries(obj)) {
    value.key = key.toLocaleLowerCase();
    ar.push(value);
  }
  return ar;
}

const languagesArray = transformCountryObjectToOptionList(languages);
const countriesArray = transformCountryObjectToOptionList(countries);

languagesArray.sort((a, b) => (a.name < b.name ? -1 : 1));
countriesArray.sort((a, b) => (a.name < b.name ? -1 : 1));

const setSelectOptions = (selector, list) => {
  const selectEl = document.querySelector(selector);
  list.forEach((item) =>
    selectEl.appendChild(
      new Option(
        `${item.name} ${item.emoji ? item.emoji : ''}`,
        item.key
      )
    )
  );
}

const setLanguagesAndCountriesList = () => {
  setSelectOptions('#languageSetting', languagesArray);
  setSelectOptions('#countrySetting', countriesArray);
}

const displaySettings = (env) => {
  // Set settings fields in navbar.
  const language = countriesList.languages[env.language];
  document.querySelector('.navbar .language').innerText = env.language;
  document.querySelector('.navbar .language').title = language.name;

  const country = countriesList.countries[env.country.toUpperCase()];
  document.querySelector('.navbar .country').innerText = country.emoji;
  document.querySelector('.navbar .country').title = country.name;

  // Set settings fields in settings modal.
  document.querySelector('#languageSetting').value = env.language;
  document.querySelector('#countrySetting').value = env.country;

  // Show and hide settings tabs depending on Github setting.
  if (env.github) {
    document.querySelector('.using-advanced').classList.remove('d-none');
    document.querySelector('.using-basic').classList.add('d-none');
  } else {
    document.querySelector('.using-basic').classList.remove('d-none');
    document.querySelector('.using-advanced').classList.add('d-none');
  }
};

const saveSettings = (env) => {
  _env.language = document.querySelector('#languageSetting').value;
  _env.country = document.querySelector('#countrySetting').value;

  const paramStr = _env.getParamStr();
  window.location.hash = '#' + paramStr;
};

export const setupDOMWithEnvVariables = (env) => {
  _env = env;
  setLanguagesAndCountriesList();
  displaySettings(_env);

  document
    .querySelector('#settings')
    .addEventListener('hidden.bs.modal', saveSettings);

  window.addEventListener(
    'hashchange',
    function() {
      window.location.reload();
    },
    false
  );
};
