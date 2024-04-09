/** @module QueryParser */
import Helper from './Helper.js';
import countriesList from 'countries-list';

/** Parse a query. */

export default class QueryParser {
  /**
   * Parse the query into its all details.
   *
   * @param {string} query          - The whole query.
   *
   * @return {object}               - Contains various values parsed from the query.
   */
  static parse(query) {
    const env = {};
    env.query = query || '';
    env.query = env.query.trim();
    Object.assign(env, QueryParser.setFlagsFromQuery(env));

    const { keyword, argumentString } = this.getKeywordAndArgumentString(
      env.query
    );
    Object.assign(env, { keyword: keyword.toLowerCase(), argumentString });
    env.args = this.getArguments(env.argumentString);

    [env.extraNamespaceName, env.keyword] = this.getExtraNamespace(env.keyword);
    if (env.extraNamespaceName) {
      const languageOrCountry =
        this.getLanguageAndCountryFromExtraNamespaceName(
          env.extraNamespaceName
        );
      Object.assign(env, languageOrCountry);
    }

    return env;
  }

  /**
   * Get keyword and argument string from query.
   *
   * @param {string} query          - The whole query.
   *
   * @return {object}
   * - {string} keyword           - The keyword from the query.
   * - {string} argumentString    - The whole argument string.
   */
  static getKeywordAndArgumentString(query) {
    return Helper.splitKeepRemainder(query, '+', 2);
  }

  /**
   * Get arguments from argument string.
   *
   * @param {string} argumentString    - The whole argument string.
   *
   * @return {array} args              - The arguments from the argument string.
   */
  static getArguments(argumentString) {
    let args;
    if (argumentString) {
      // TODO: this delimiter is not the same as in the splitKeepRemainder function
      args = argumentString.split(',');
    } else {
      args = [];
    }

    return args;
  }

  /**
   * Check if keyword contains extra namespace.
   *
   * @param {string} keyword - The keyword.
   *
   * @return {object}
   * - {string} extraNamespaceName - If found, the name of the extra namespace.
   * - {string} keyword            - The new keyword.
   */
  // TODO: fuck me, that code wants a pattern matching parser or
  //       even better, aligned all namespaces, that they're following
  //       one name scheme, without a leading dot
  static getExtraNamespace(keyword) {
    // Check for extraNamespace in keyword:
    //   split at dot
    //   but don't split up country namespace names.
    let extraNamespaceName;
    if (keyword.match(/.\./)) {
      const { first, rest } = Helper.splitKeepRemainder(
        keyword,
        '.',
        2
      );
      keyword = rest;
      // If extraNamespace started with a dot, it will be empty
      // so let's split it again, and add the dot.
      if (first === '') {
        const { first, rest } = Helper.splitKeepRemainder(
          keyword,
          '.',
          2
        );
        keyword = rest;
        extraNamespaceName = '.' + first;
      }
    }

    return [extraNamespaceName, keyword];
  }

  /**
   * Return language or country from extra namespace.
   *
   * @param {string} extraNamespaceName - The name of the extraNamespace.
   *
   * @return {object}               - Contains either {language: } or {country: }.
   */
  static getLanguageAndCountryFromExtraNamespaceName(extraNamespaceName) {
    const env = {};

    if (extraNamespaceName in countriesList.languages) {
      env.language = extraNamespaceName;
    } else if (
      extraNamespaceName.substring(1).toUpperCase() in countriesList.countries
    ) {
      env.country = extraNamespaceName.substring(1);
    }

    return env;
  }

  static setFlagsFromQuery(env) {
    if (env.query) {
      // Check for debug.
      if (env.query.match(/^debug:/)) {
        env.debug = true;
        env.query = env.query.replace(/^debug:/, '');
      }
      // Check for reload.
      if (env.query.match(/^reload:/) || env.query.match(/^reload$/)) {
        env.reload = true;
        env.query = env.query.replace(/^reload(:?)/, '');
      }
    }
    return env;
  }
}
