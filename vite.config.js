const { string } = require('rollup-plugin-string')

/**
 * @type {import('vite').UserConfig}
 */
module.exports = {
  plugins: [
    string({
      include: '**/*.txt',
    }),
  ],
  optimizeDeps: {
    include: ['valtio/vanilla'],
  },
}
