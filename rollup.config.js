import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import scss from 'rollup-plugin-scss';
import { terser } from 'rollup-plugin-terser';
import html from '@rollup/plugin-html';
import { readFileSync } from 'fs';
import copy from 'rollup-plugin-copy';
import watch from 'rollup-plugin-watch';
import gitInfo from 'rollup-plugin-git-info';
import execute from 'rollup-plugin-execute';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.BUILD === 'production';

console.log(process.env);
console.log(process.argv);

const output = {
  dir: 'dist/public/',
  name: 'process',
  entryFileNames: '[name].[hash].js',
  sourcemap: true,
  format: 'es',
};

const template = (templateFilePath) => {
  const templateFunc = ({ attributes, bundle, files, publicPath, title }) => {
    const [fileNameJs] = Object.keys(bundle);
    const htmlTemplate = readFileSync(templateFilePath).toString();
    const html = htmlTemplate.replace(/{{fileNameJs}}/g, fileNameJs);
    return html;
  };
  return templateFunc;
};

export default [
  {
    input: 'src/js/index.js',
    output: output,
    plugins: [
      watch({ dir: 'src/html/' }),
      watch({ dir: 'src/img/' }),
      resolve(),
      commonjs(),
      gitInfo(), // includes also json()
      scss({
        output: 'dist/public/style.css',
        outputStyle: isProduction ? 'compressed' : 'expanded',
      }),
      // execute('npm run compile-data'),
      isProduction && terser(),
      html({
        fileName: 'index.html',
        template: template('src/html/index.html'),
      }),
      copy({
        targets: [
          { src: 'src/ico/favicon.ico', dest: 'dist/public/' },
          { src: 'src/img/*', dest: 'dist/public/img/' },
          {
            src: 'src/js/userscripts/*.user.js',
            dest: 'dist/public/userscripts/',
          },
          { src: 'src/opensearch/', dest: 'dist/public/' }
          // { src: 'node_modules/font-awesome/fonts/', dest: 'dist/public/' },
        ],
      }),
      replace({
        exclude: ['node_modules/**', 'data/**'],
        SUBFOLDER: JSON.stringify(process.env.SUBFOLDER || ''),
      })
    ],
  },
  {
    input: 'src/js/process.js',
    output: output,
    plugins: [
      resolve(),
      commonjs(),
      gitInfo(), // includes also json()
      isProduction && terser(),
      html({
        fileName: 'process/index.html',
        template: template('src/html/process.html'),
      }),
      replace({
        exclude: ['node_modules/**', 'data/**'],
        SUBFOLDER: JSON.stringify(process.env.SUBFOLDER || ''),
      })
    ],
  },
];
