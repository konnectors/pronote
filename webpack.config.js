const CopyPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')

const config = require('cozy-konnector-build/webpack.config')

module.exports = {
  ...config,
  plugins: [
    ...config.plugins,
    new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ }),
    new CopyPlugin({
      patterns: [
        {
          from: './node_modules/pronote-api-maintained/src/cas/generics/jsencrypt.min.js'
        }
      ]
    })
  ]
}
