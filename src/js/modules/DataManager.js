/** @module DataManager */
import fs from 'fs';
import jsyaml from 'js-yaml';

export default class DataManager {
  /**
   * Load data from /data.
   * @return {object} data      - The loaded data from /data.
   */
  static load(options = {}) {
    options = this.getDefaultOptions(options);
    const data = {};
    data.shortcuts = DataManager.readYmls(
      `${options.data}/${options.shortcuts}/`,
      options.filter
    );
    data.types = {};
    data.types.city = DataManager.readYmls(
      `${options.data}/${options.types}/city/`
    );
    return data;
  }

  /**
   * Write data to /data.
   * @param {object} data      - The data to write
   */
  static write(data, options = {}) {
    options = this.getDefaultOptions(options);
    this.normalizeTags(data.shortcuts);
    DataManager.writeYmls(
      `${options.data}/${options.shortcuts}/`,
      data.shortcuts
    );
    DataManager.writeYmls(
      `${options.data}/${options.types}/city/`,
      data.types.city
    );
  }

  /**
   * Normalize tags in every shortcut.
   * @param {Object} shortcuts by namespace
   */
  static normalizeTags(shortcuts) {
    for (const namespace in shortcuts) {
      for (const key in shortcuts[namespace]) {
        const shortcut = shortcuts[namespace][key];
        if (shortcut.tags) {
          shortcut.tags.sort();
          // Replace spaces with dashes.
          for (const i in shortcut.tags) {
            shortcut.tags[i] = shortcut.tags[i].replace(/ /g, '-');
          }
        }
      }
    }
  }

  static getDefaultOptions(options) {
    options.data = options.data === undefined ? './data/' : options.data;
    options.shortcuts =
      options.shortcuts === undefined ? 'shortcuts' : options.shortcuts;
    options.types = options.types === undefined ? 'types' : options.types;
    options.filter = options.filter === undefined ? false : options.filter;
    return options;
  }

  /**
   * Read YAML files from a directory.
   * @param   {string} ymlDirPath
   * @returns {object} dataByFileRoot - The data from the YAML files.
   */
  static readYmls(ymlDirPath, filter = false) {
    const dataByFileRoot = {};
    let fileNames = [];
    try {
      fileNames = fs.readdirSync(ymlDirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`Warning: No such directory: ${ymlDirPath}`);
      } else {
        throw error;
      }
    }
    // Filter files by filter.
    if (filter) {
      fileNames = fileNames.filter((fileName) => {
        return fileName.includes(filter);
      });
    }
    for (const fileName of fileNames) {
      const filePath = ymlDirPath + fileName;
      const str = fs.readFileSync(filePath, 'utf8');
      const data = jsyaml.load(str);
      const fileRoot = fileName.replace(/\.yml$/, '');
      dataByFileRoot[fileRoot] = data;
    }
    return dataByFileRoot;
  }

  /**
   * Write YAML files to a directory.
   * @param {string} ymlDirPath
   * @param {object} dataByFileRoot - The data to write to YAML files.
   */
  static writeYmls(ymlDirPath, dataByFileRoot) {
    for (const fileRoot in dataByFileRoot) {
      dataByFileRoot[fileRoot] = this.sortObject(dataByFileRoot[fileRoot]);
      const filePath = `${ymlDirPath}/${fileRoot}.yml`;
      const str = jsyaml.dump(dataByFileRoot[fileRoot], {
        noArrayIndent: true,
        lineWidth: -1
      });
      fs.writeFileSync(filePath, str, 'utf8');
    }
  }

  static sortObject(obj) {
    return Object.keys(obj)
      .sort()
      .reduce(function(result, key) {
        result[key] = obj[key];
        return result;
      }, {});
  }
}
