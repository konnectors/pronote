const webpack = require('webpack')
const config = require('cozy-konnector-build/webpack.config')
var path = require('path')

module.exports = {
  ...config,
  entry: './src/server.js',
  output: {
    path: path.join(process.cwd(), 'build'),
    filename: 'index.js'
  },
  plugins: [
    ...config.plugins,
    new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ })
  ]
}
