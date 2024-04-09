/** @module CallHandler */
import Env from './Env.js';
import Helper from './Helper.js';
import Logger from './Logger.js';
import ShortcutFinder from './ShortcutFinder.js';
import UrlProcessor from './UrlProcessor.js';
import { PATH_SUBFOLDER } from './constants';

const logger = new Logger();
/** Handle a call. */

export default class CallHandler {
  /**
   * The 'main' function of this class.
   */
  static async handleCall() {
    Helper.logVersion();
    const env = new Env(null, logger);
    await env.populate();

    if (env.debug) {
      env.logger.showLog();
    }

    let redirectUrl;

    const response = await this.getRedirectResponse(env);

    if (response.status === 'found') {
      redirectUrl = response.redirectUrl;
    } else {
      redirectUrl = this.getRedirectUrlToHome(response);
    }

    if (env.debug) {
      console.log('Debug mode, abort redirect', redirectUrl);
      return;
    }

    window.location.replace(redirectUrl);
  }

  /**
   * Given the environment, get a response object, incl. redirect URL.
   *
   * @param {object} env        - The environment.
   *
   * @return {object} response  - Contains redirect URL, status.
   */
  static async getRedirectResponse(env) {
    const response = {};
    if (env.reload && !env.query) {
      console.log('reload and no query found');
      response.status = 'reloaded';
      return response;
    }

    if (!env.query) {
      console.log('no query found');
      response.status = 'not_found';
      response.redirectUrl = false;
      return response;
    }

    const shortcut = ShortcutFinder.findShortcut(env);

    console.log({ shortcut });

    if (!shortcut) {
      console.log('no shortcut found');
      response.status = 'not_found';
      return response;
    }

    if (shortcut.deprecated) {
      response.status = 'deprecated';
      response.alternative = this.getAlternative(shortcut, env);
      return response;
    }

    if (shortcut.removed) {
      response.status = 'removed';
      response.key = shortcut.key;
      return response;
    }

    response.redirectUrl = shortcut.url;
    response.status = 'found';

    env.logger.info('Used template: ' + response.redirectUrl);
    console.log(response);
    response.redirectUrl = UrlProcessor.replaceVariables(response.redirectUrl, {
      language: env.language,
      country: env.country
    });
    response.redirectUrl = await UrlProcessor.replaceArguments(
      response.redirectUrl,
      env.args,
      env
    );

    return response;
  }

  static getAlternative(shortcut, env) {
    let alternative = shortcut.deprecated.alternative.query;
    for (const i in env.args) {
      alternative = alternative.replace(
        '<' + (parseInt(i) + 1) + '>',
        env.args[i]
      );
    }
    return alternative;
  }

  /**
   * Redirect in case a shortcut was not found.
   *
   * @param {string} status       - The status of the call.
   *
   * @return {string} redirectUrl - Redirect URL to the homepage, with parameters.
   */
  static getRedirectUrlToHome(response) {
    const params = Env.getUrlParams();
    if (params.query === 'reload' || params.query === 'debug:reload') {
      delete params.query;
    }
    switch (response.status) {
      case 'deprecated':
        params.alternative = response.alternative;
        break;
      case 'removed':
        params.key = response.key;
        break;
    }
    params.status = response.status;
    // TODO: fix redirect to home in case of missing shortcut or other issues with the redirect
    const paramStr = Env.getURLSearchParameterObject(params);
    const redirectUrl = `${PATH_SUBFOLDER}/index.html`;
    return redirectUrl;
  }
}
