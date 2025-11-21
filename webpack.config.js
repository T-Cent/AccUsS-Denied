/* eslint-env node */

const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    background: './src/background.js',
    popup: './src/popup.js',
    content_script: './src/content-script.js',
  },

  output: {
    path: path.join(__dirname, 'extension', 'dist'),
    filename: '[name].js',
  },

  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules\/(?!@ghostery)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],

  devtool: 'source-map'
};
