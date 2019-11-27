const path = require("path");
const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebPackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require("script-ext-html-webpack-plugin");
const autoprefixer = require('autoprefixer');
const common = require('./webpack.common');
const PATHS = require("./PATHS");

module.exports = merge(common, {
  entry: {
    main: ['@babel/polyfill', path.resolve(PATHS.src, 'index.js')]
  },
  output: {
    filename: '[name].[chunkhash:8].js',
    path: path.resolve(PATHS.dist),
    publicPath: '/'
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            { loader: "css-loader" }
          ]
        })
      },
      {
        test: /\.less$/,
        exclude: path.resolve(PATHS.src, 'asset/stylesheet'),
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: "css-loader",
              options: {
                modules: true,
                importLoaders: 1,
                localIdentName: "[local]_[hash:base64:5]",
                sourceMap: true,
                minimize: true
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: [autoprefixer('last 2 version')],
                sourceMap: true
              }
            },
            {
              loader: "less-loader",
              options: {
                javascriptEnabled: true
              }
            }
          ]
        })
      },
      {
        test: /\.less$/,
        include: path.resolve(PATHS.src, 'asset/stylesheet'),
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            { loader: "css-loader" },
            { 
              loader: "less-loader",
              options: {
                javascriptEnabled: true
              }
            }
          ]
        })
      },
    ]
  },
  optimization: {
    moduleIds: 'hashed',
    runtimeChunk: {
      name: 'runtime'
    },
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          chunks: 'initial',
          name: 'vendor'
        }
      }
    }
  },
  performance: {
    hints: false
  },
  plugins: [
    new CleanWebpackPlugin(['dist'], {
      root: PATHS.root
    }),
    new ExtractTextPlugin({
      filename: '[name].[hash].css',
      allChunks: true,
    }),
    new HtmlWebPackPlugin({
      template: path.resolve(PATHS.src, 'asset/template/index.html'),
      filename: path.resolve(PATHS.dist, 'index.html'),
      favicon: path.resolve(PATHS.src, 'asset/image/favicon.png')
    }),
    // 注意一定要在HtmlWebpackPlugin之后引用
    // inline的name和runtimeChunk的name保持一致
    new ScriptExtHtmlWebpackPlugin({
      inline: /runtime\..*\.js$/
    })
  ]
});
