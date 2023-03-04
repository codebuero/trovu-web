import jsyaml from 'js-yaml';
import Helper from './Helper.js';
import UrlProcessor from './UrlProcessor.js';

export default class NamespaceFetcher {
  constructor(env) {
    this.env = env;
  }

  async getNamespaceInfos(namespaces) {
    const namespaceInfos = await this.ensureNamespaceInfos(namespaces);
    for (const namespaceInfo of Object.values(namespaceInfos)) {
      for (const key in namespaceInfo.shortcuts) {
        namespaceInfo.shortcuts[key] = this.convertToObject(
          namespaceInfo.shortcuts[key],
        );
      }
      namespaceInfo.shortcuts = await this.addIncludes(
        namespaceInfo.shortcuts,
        namespaceInfos,
      );
    }
    this.addReachable(namespaceInfos);
    for (const namespaceInfo of Object.values(namespaceInfos)) {
      for (const key in namespaceInfo.shortcuts) {
        namespaceInfo.shortcuts[key] = this.addInfo(
          namespaceInfo.shortcuts[key],
          key,
          namespaceInfo,
        );
      }
    }
    return namespaceInfos;
  }

  /**
   * Add a fetch URL template to a namespace.
   *
   * @param {array} namespaceInfos - The namespaces to fetch shortcuts for.
   *
   * @return {array} namespaces - The namespaces with their fetched shortcuts, in a new property namespace.shortcuts.
   */
  async ensureNamespaceInfos(namespaces) {
    const namespaceInfos = this.getInitialNamespaceInfos(namespaces);
    const promises = await this.startFetches(namespaceInfos);

    // Wait until all fetch calls are done.
    const responses = await Promise.all(promises);

    for (const namespaceName in namespaceInfos) {
      const namespaceInfo = namespaceInfos[namespaceName];
      const response = responses[namespaceInfo.priority];
      if (!response || response.status != 200) {
        if (this.env.debug)
          Helper.log(
            (this.env.reload ? 'reload ' : 'cache  ') +
              'Fail:    ' +
              namespaceInfo.url,
          );
        namespaceInfo.shortcuts = [];
        continue;
      }
      this.logSuccess(response);

      const text = await response.text();
      namespaceInfo.shortcuts = this.parseShortcutsFromYml(
        text,
        namespaceInfo.url,
      );

      namespaceInfo.shortcuts = this.checkKeySyntax(
        namespaceInfo.shortcuts,
        namespaceInfo.name,
      );
    }
    return namespaceInfos;
  }

  /**
   *  Check for 'only URL' (string) shortcuts and make an object of them.
   */
  convertToObject(shortcut) {
    if (typeof shortcut === 'string') {
      const url = shortcut;
      shortcut = {
        url: url,
      };
    }
    return shortcut;
  }

  /**
   *  Add shortcuts to be included.
   *
   * @param {object} shortcuts - The shortcuts the parsed for includes
   * @param {object} namespaceInfos - The namespaceInfos object
   *
   * @return {object} shortcuts - Shortcuts with includes.
   */
  async addIncludes(shortcuts, namespaceInfos) {
    for (const key in shortcuts) {
      let shortcut = shortcuts[key];
      if (shortcut.include) {
        if (shortcut.include.key) {
          if (shortcut.include.namespace) {
            const shortcutToInclude = await this.getShortcutFromNamespace(
              shortcut.include.key,
              shortcut.include.namespace,
              namespaceInfos,
            );
            delete shortcutToInclude.namespace; // Remove namespace to keep namespace from target.
            shortcut = Object.assign(shortcut, shortcutToInclude);
          } else {
            const shortcutToInclude = shortcuts[shortcut.include.key];
            shortcut = Object.assign(shortcut, shortcutToInclude);
          }
        } else {
          Helper.log(`Incorrect include found at ${key}`);
          this.error = true;
          continue;
        }
      }
    }
    return shortcuts;
  }

  /**
   * Enrich shortcuts with their own information: argument & namespace names, reachable.
   *
   * @param {object} namespaces - Current namespaces keyed by their name.
   */
  addReachable(namespaceInfos) {
    const namespaceInfosByPriority = Object.values(namespaceInfos).sort(
      (a, b) => {
        return b.priority - a.priority;
      },
    );

    // Remember found shortcuts
    // to know which ones are reachable.
    const foundShortcuts = new Set();

    for (const namespaceInfo of namespaceInfosByPriority) {
      if (!this.isSubscribed(namespaceInfo)) {
        continue;
      }
      for (const key in namespaceInfo.shortcuts) {
        // If not yet present: reachable.
        namespaceInfo.shortcuts[key].reachable = !foundShortcuts.has(key);
        foundShortcuts.add(key);
      }
    }
    return namespaceInfos;
  }

  /**
   *  Add info like keyword, arguments to a shortcut.
   *
   * @param {object} shortcut - The shortcut.
   * @param {string} key - The shortcut key.
   * @param {object} namespaceInfo - The namespace info.
   *
   * @return {object} shortcut - Shortcut with info.
   */
  addInfo(shortcut, key, namespaceInfo) {
    shortcut.key = key;
    [shortcut.keyword, shortcut.argumentCount] = key.split(' ');
    shortcut.namespace = namespaceInfo.name;
    shortcut.arguments = UrlProcessor.getArgumentsFromString(shortcut.url);
    shortcut.title = shortcut.title || '';
    return shortcut;
  }

  getInitialNamespaceInfos(namespaces) {
    return Object.fromEntries(
      namespaces.map((namespace, index) => {
        const namespaceInfo = this.getInitalNamespaceInfo(namespace);
        namespaceInfo.priority = index + 1;
        return [namespaceInfo.name, namespaceInfo];
      }),
    );
  }

  /**
   * Add a fetch URL template to a namespace.
   *
   * @param {(string|Object)} namespace - The namespace to add the URL template to.
   *
   * @return {Object} namespace - The namespace with the added URL template.
   */
  getInitalNamespaceInfo(namespace) {
    // Site namespaces:
    if (typeof namespace == 'string' && namespace.length < 4) {
      namespace = this.addFetchUrlToSiteNamespace(namespace);
      return namespace;
    }
    // User namespace 1 – custom URL:
    if (namespace.url && namespace.name) {
      // Just add the type.
      namespace.type = 'user';
      return namespace;
    }
    // Now remains: User namespace 2 – Github:
    if (typeof namespace == 'string') {
      // Create an object.
      namespace = { github: namespace };
    }
    namespace = this.addFetchUrlToGithubNamespace(namespace);
    return namespace;
  }

  /**
   * Start fetching shortcuts per namespace.
   *
   * @param {array} namespaceInfos - The namespaces to fetch shortcuts for.
   *
   * @return {array} promises - The promises from the fetch() calls.
   */
  async startFetches(namespaceInfos) {
    const promises = [];
    Object.values(namespaceInfos).forEach(async (namespaceInfo) => {
      if (!namespaceInfo.url) {
        // TODO: Handle this as error.
        return;
      }
      promises[namespaceInfo.priority] = fetch(namespaceInfo.url, {
        cache: this.env.reload ? 'reload' : 'force-cache',
      });
    });
    return promises;
  }

  /**
   * Parse a YAML string.
   *
   * @param {string} text - String to parse.
   * @param {string} url - The URL of the YAML, for error reporting.
   *
   * @return {object} namespaces - The parsed shortcuts.
   */
  parseShortcutsFromYml(text, url) {
    try {
      const shortcuts = jsyaml.load(text);
      return shortcuts;
    } catch (error) {
      Helper.log('Error parsing ' + url + ':\n\n' + error.message);
      this.error = true;
      return [];
    }
  }

  /**
   * Ensure shortcuts have the correct structure.
   *
   * @param {array} shortcuts      - The shortcuts to normalize.
   * @param {string} namespaceName - The namespace name to show in error message.
   *
   * @return {array} shortcuts - The normalized shortcuts.
   */
  checkKeySyntax(shortcuts, namespaceName) {
    const incorrectKeys = [];
    for (const key in shortcuts) {
      if (!key.match(/\S+ \d/)) {
        incorrectKeys.push(key);
      }
    }
    if (incorrectKeys.length > 0) {
      Helper.log(
        "Incorrect keys found in namespace '" +
          namespaceName +
          "'. Keys must have the form 'KEYWORD ARGCOUNT', e.g.: 'foo 0'" +
          '\n\n' +
          incorrectKeys.join('\n'),
      );
      this.error = true;
    }
    return shortcuts;
  }

  logSuccess(response) {
    if (this.env.debug)
      Helper.log(
        (this.env.reload ? 'reload ' : 'cache  ') + 'Success: ' + response.url,
      );
    if (!this.env.debug) {
      Helper.log('.', false);
    }
  }

  /**
   *  Reference a shortcut from (another) namespace.
   *
   * @param {string} key - The key.
   * @param {string} namespaceName - The namespace name.
   *
   * @return {object} shortcut - Shortcuts to include.
   */
  async getShortcutFromNamespace(key, namespaceName, namespaceInfos) {
    if (!namespaceInfos[namespaceName]) {
      const newNamespaceInfos = await this.ensureNamespaceInfos([
        namespaceName,
      ]);
      Object.assign(namespaceInfos, newNamespaceInfos);
    }
    const shortcut = namespaceInfos[namespaceName].shortcuts[key];
    return shortcut;
  }

  /**
   * Check if namespace is subscribed to.
   *
   * @param {object} namespaceInfo - namespace to be checked.
   *
   * @return {boolean} isSubscribed - TRUE if subscribed.
   */
  isSubscribed(namespaceInfo) {
    return namespaceInfo.priority && namespaceInfo.priority > 0;
  }
  /**
   * Add a URL template to a namespace that refers to a namespace in trovu-data.
   *
   * @param {string} name - The namespace name.
   *
   * @return {Object} namespace - The namespace with the added URL template.
   */
  addFetchUrlToSiteNamespace(name) {
    const namespace = {
      name: name,
      type: 'site',
      url: 'https://data.trovu.net/data/shortcuts/' + name + '.yml',
    };
    return namespace;
  }

  /**
   * Add a URL template to a namespace that refers to a Github user repo.
   *
   * @param {string} name - The namespace name.
   *
   * @return {Object} namespace - The namespace with the added URL template.
   */
  addFetchUrlToGithubNamespace(namespace) {
    if (namespace.github == '.') {
      // Set to current user.
      namespace.github = this.env.github;
    }
    // Default name to Github name.
    if (!namespace.name) {
      namespace.name = namespace.github;
    }
    namespace.url =
      'https://raw.githubusercontent.com/' +
      namespace.github +
      '/trovu-data-user/master/shortcuts.yml';
    namespace.type = 'user';
    return namespace;
  }
}
