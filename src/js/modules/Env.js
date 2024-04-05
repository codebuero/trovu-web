/** @module Env */
import pkg from '../../../package.json';
import Helper from './Helper.js';
import NamespaceFetcher from './NamespaceFetcher.js';
import QueryParser from './QueryParser.js';
import countriesList from 'countries-list';
import jsyaml from 'js-yaml';
import { PROCESS_URL } from './constants';

/** Set and remember the environment. */

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_COUNTRY = 'de';

export default class Env {
  /**
   * Set helper variables.
   *
   * @param {object} env - The environment variables.
   */
  constructor(env, logger) {
    this.setToThis(env);
    if (pkg.gitCommitHash) {
      this.commitHash = pkg.gitCommitHash.slice(0, 7);
    } else {
      this.commitHash = 'unknown';
    }
    this.logger = logger;
  }

  getConfigUrlTemplate(github) {
    return `https://raw.githubusercontent.com/${github}/trovu-data-user/master/config.yml?${this.commitHash}`;
  }

  /**
   * Set the environment variables from the given object.
   *
   * @param {object} env - The environment variables.
   * @returns {void}
   */
  setToThis(env) {
    if (!env) {
      return;
    }
    for (const key in env) {
      this[key] = env[key];
    }
  }

  /**
   * Get the params from env.
   *
   * @return {object} - The built params.
   */
  getParams() {
    const params = {};

    // Put environment into hash.
    if (this.github) {
      params.github = this.github;
    } else {
      params.language = this.language;
      params.country = this.country;
    }
    if (this.debug) {
      params.debug = 1;
    }
    // Don't add defaultKeyword into params
    // when Github user is set.
    if (this.defaultKeyword && !this.github) {
      params.defaultKeyword = this.defaultKeyword;
    }
    if (this.status) {
      params.status = this.status;
    }
    if (this.query) {
      params.query = this.query;
    }
    if (this.alternative) {
      params.alternative = this.alternative;
    }
    if (this.key) {
      params.key = this.key;
    }

    return params;
  }

  /**
   * Get the parameters as string.
   */
  getParamStr(moreParams) {
    const params = this.getParams();
    return Env.getURLSearchParameterObject(params);
  }

  getProcessUrl(moreParams) {
    const paramStr = this.getParamStr(moreParams);
    return PROCESS_URL + paramStr;
  }

  /**
   * Set the initial class environment vars either from params or from GET hash string.
   *
   * @param {array} params - List of parameters to be used in environment.
   */
  async populate(params) {
    if (!params) {
      params = Env.getUrlParams();
    }
    // Set debug and reload from URL params.
    for (const paramName of ['debug', 'reload']) {
      if (params[paramName] === '1') {
        this[paramName] = true;
      }
    }

    // Assign before, to also catch "debug" and "reload" in params and query.
    Object.assign(this, params);
    const _queryParams = QueryParser.parse(this.query);
    Object.assign(this, _queryParams);

    if (typeof params.github === 'string' && params.github !== '') {
      await this.setWithUserConfigFromGithub(params);
    }

    // Assign again, to override user config.
    Object.assign(this, params);
    Object.assign(this, _queryParams);
    this.setDefaults();

    // Add extra namespace to namespaces.
    if (this.extraNamespaceName) {
      this.namespaces.push(this.extraNamespaceName);
    }

    this.data = await this.getData();
    this.namespaceInfos = await new NamespaceFetcher(this).getNamespaceInfos(
      this.namespaces
    );

    // Remove extra namespace if it turned out to be invalid.
    if (
      this.extraNamespaceName &&
      !this.isValidNamespace(this.extraNamespaceName)
    ) {
      delete this.extraNamespaceName;
      this.keyword = '';
      this.arguments = [this.query];
    }
  }

  /**
     Check if namespace is valid.
   * @param {string} namespace
   * @returns {boolean}
   */
  isValidNamespace(namespace) {
    if (
      namespace in this.namespaceInfos &&
      this.namespaceInfos[namespace].shortcuts &&
      !this.isEmptyObject(this.namespaceInfos[namespace].shortcuts)
    ) {
      return true;
    }
    if (namespace in countriesList.languages) {
      return true;
    } else if (
      namespace.substring(1).toUpperCase() in countriesList.countries
    ) {
      return true;
    }
    return false;
  }

  /**
   * Checks if object is empty.
   * @param {Object} obj
   * @returns {boolean}
   */
  isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
  }

  /**
   * Set the user configuration from their fork in their Github profile.
   *
   * @param {array} params - Here, 'github' and 'debug' will be used
   */
  async setWithUserConfigFromGithub(params) {
    const config = await this.getUserConfigFromGithub(params);
    if (config) {
      Object.assign(this, config);
    };
  }

  /**
   * Get the user configuration from their fork in their Github profile.
   *
   * @param {array} params - Here, 'github' and 'debug' will be used
   *
   * @return {(object|boolean)} config - The user's config object, or false if fetch failed.
   */
  async getUserConfigFromGithub(params) {
    const configUrl = this.getConfigUrlTemplate(params.github);
    const configYml = await Helper.fetchAsync(configUrl, this);
    if (!configYml) {
      this.logger.error(`Error reading Github config from ${configUrl}`);
    }
    try {
      return jsyaml.load(configYml);
    } catch (error) {
      this.logger.error(`Error parsing ${configUrl}: ${error.message}`);
    }
  }

  // Param getters ====================================================

  /**
   * Get the default language and country from browser.
   *
   * @return {object} [language, country] - The submitted language and country.
   */
  getDefaultLanguageAndCountry() {
    const [_language, _country] = navigator.language.split('-');

    const language = (_language) ? _language.toLowerCase() : DEFAULT_LANGUAGE;
    const country = (_country) ? _country.toLowerCase() : DEFAULT_COUNTRY;

    return { language, country };
  }

  /**
   * Set default environment variables if they are still empty.
   */
  setDefaults() {
    let language, country;

    if (typeof this.language !== 'string' || typeof this.country !== 'string') {
      const { language: defaultLanguage, country: defaultCountry } = this.getDefaultLanguageAndCountry();
      language = defaultLanguage;
      country = defaultCountry;
    }

    // Default language.
    if (typeof this.language !== 'string') {
      this.language = language;
    }
    // Default country.
    if (typeof this.country !== 'string') {
      this.country = country;
    }
    // Default namespaces.
    if (typeof this.namespaces !== 'object') {
      this.namespaces = ['o', this.language, '.' + this.country];
    }
    // Default debug.
    if (typeof this.debug !== 'boolean') {
      this.debug = Boolean(this.debug);
    }
  }

  /**
   * Fetches data from /data.
   * @returns {Object} An object containing the fetched data.
   */
  async getData() {
    let text, url;

    // TODO: lets not mixup server and client code in one file
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line
      url = `${SUBFOLDER}/data.json?${this.commitHash}`;
      text = await Helper.fetchAsync(url, this);
    } else {
      const fs = require('fs');
      text = fs.readFileSync('./dist/public/data.json', 'utf8');
    }
    if (!text) {
      return null;
    }
    try {
      return await JSON.parse(text);
    } catch (error) {
      this.env.logger.error(`Error parsing JSON in ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * From 'http://example.com/foo#bar=baz' get 'bar=baz'.
   *
   * @return {string} hash - The hash string.
   */
  static getUrlHash() {
    return window.location.hash.substr(1);
  }

  /**
   * Get parameters from the URL query string.
   *
   * @return {object} params - List of found parameters.
   */
  static getUrlParams() {
    const urlParamStr = this.getUrlHash();
    return urlParamStr.split('&').reduce((acc, value) => {
      const [key, val] = value.split('=');
      return {
        ...acc,
        [key]: val
      }
    }, {});
  }

  /**
   * Build URL param string from param object.
   *
   * @param {object} params       - Object of parameters.
   *
   * @return {string} urlParamStr - Parameter as URL string.
   */
  static getURLSearchParameterObject(params) {
    const urlParams = new URLSearchParams(params);
    urlParams.sort();
    return urlParams;
  }
}
