import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'js/index.js',
  output: {
    file: 'bundle/index.js',
    format: 'iife',
    name: 'websearch'
  },
  plugins: [resolve(), commonjs()]
};