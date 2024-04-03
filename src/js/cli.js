import { load, write } from './modules/DataManager';
import UrlProcessor from './modules/UrlProcessor';
import { Command } from 'commander';
import fs from 'node:fs';
import jsyaml from 'js-yaml';

const program = new Command();

program.name('trovu').description('CLI for trovu.net').version('0.0.1');

program
  .command('compile-data')
  .description('Compile YAML data files to JSON')
  .requiredOption('-o, --output <path>', 'path to output file')
  .action(compileData);

program
  .command('normalize-data')
  .description('Normalize YAML data files')
  .action(normalizeData);

// Call for user data:
// node -r esm src/js/cli.js migrate-placeholders -d /Users/jrg/dta/int/cde/web/tro/trovu-data-user/ -s '' -f shortcuts
program
  .command('migrate-placeholders')
  .description('Migrate custom placeholder format to YAML ')
  .option('-d, --data <path>', 'path to data directory')
  .option('-s, --shortcuts <subpath>', 'subpath to shortcuts directory')
  .option('-t, --types <subpath>', 'subpath to types directory')
  .option('-f, --filter <string>', 'only apply to files containing <string>')
  .action(migratePlaceholders);

program
  .command('migrate-examples')
  .description('Migrate examples to new format')
  .option('-d, --data <path>', 'path to data directory')
  .option('-s, --shortcuts <subpath>', 'subpath to shortcuts directory')
  .option('-t, --types <subpath>', 'subpath to types directory')
  .option('-f, --filter <string>', 'only apply to files containing <string>')
  .action(migrateExamples);

program.parse();

function compileData(options) {
  const data = load();
  const json = JSON.stringify(data);
  fs.writeFileSync(options.output, json, 'utf8');
}

function normalizeData() {
  const data = load();
  write(data);
}

function migratePlaceholders(options) {
  const dataPath = options.data;
  const shortcutsPath = options.shortcuts;
  const typesPath = options.types;
  const filter = options.filter;
  const data = load(dataPath, shortcutsPath, typesPath, filter);
  for (const namespace in data.shortcuts) {
    for (const key in data.shortcuts[namespace]) {
      let shortcut = data.shortcuts[namespace][key];
      // if shortcut typeoff string, convert to object
      if (typeof shortcut === 'string') {
        shortcut = replacePlaceholders(shortcut, namespace, key);
      }
      if (shortcut.url) {
        shortcut.url = replacePlaceholders(shortcut.url, namespace, key);
      }
      if (
        shortcut.deprecated &&
        shortcut.deprecated.alternative &&
        shortcut.deprecated.alternative.query
      ) {
        shortcut.deprecated.alternative.query =
          shortcut.deprecated.alternative.query.replace(/\{%(\d)\}/g, '<$1>');
      }
      if (shortcut.include && shortcut.include.key) {
        shortcut.include.key = replacePlaceholders(
          shortcut.include.key,
          namespace,
          key
        );
      }
      data.shortcuts[namespace][key] = shortcut;
    }
    write(data, dataPath, shortcutsPath, typesPath);
  }
}

function replacePlaceholders(str, namespace, key) {
  for (const prefix of ['%', '\\$']) {
    const placeholders = UrlProcessor.getPlaceholdersFromStringLegacy(
      str,
      prefix
    );
    for (const placeholderName in placeholders) {
      if (isOnlyNumber(placeholderName)) {
        console.log(
          `Warning: In shortcut ${namespace}.${key}, placeholder name ${placeholderName} is only a number.`
        );
      }
      let newPlaceholder;
      const placeholder = placeholders[placeholderName];
      const match = Object.keys(placeholder)[0];
      const attributes = Object.values(placeholder)[0];
      if (Object.keys(attributes).length === 0) {
        newPlaceholder = placeholderName;
      } else {
        newPlaceholder = {};
        newPlaceholder[placeholderName] = attributes;
      }
      const newPlaceholderYaml = jsyaml
        .dump(newPlaceholder, {
          flowLevel: 1
        })
        .trim();
      let newPlaceholderYamlBrackets = '<';
      switch (prefix) {
        case '%':
          break;
        case '\\$':
          newPlaceholderYamlBrackets += '$';
          break;
      }
      newPlaceholderYamlBrackets += `${newPlaceholderYaml}>`;
      while (str.includes(match)) {
        str = str.replace(match, newPlaceholderYamlBrackets);
      }
    }
  }
  return str;
}

function isOnlyNumber(str) {
  return Number.isFinite(Number(str));
}

function migrateExamples(options) {
  const data = load(options);
  for (const namespace in data.shortcuts) {
    for (const key in data.shortcuts[namespace]) {
      const shortcut = data.shortcuts[namespace][key];
      // Normalize examples.
      if (shortcut.examples && !Array.isArray(shortcut.examples)) {
        const examples = [];
        for (const [argumentString, description] of Object.entries(
          shortcut.examples
        )) {
          const example = {
            arguments: argumentString,
            description
          };
          examples.push(example);
        }
        shortcut.examples = examples;
      }
      data.shortcuts[namespace][key] = shortcut;
    }
    write(data, options);
  }
}
