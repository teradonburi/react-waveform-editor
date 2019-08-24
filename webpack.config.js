const path = require('path')
const production = process.env.NODE_ENV === 'production'

module.exports = {
  mode: production ? 'production' : 'development', // 開発モード
  name: 'react-waveform-editor',
  devtool: production ? 'source-map' : 'cheap-module-source-map', // ソースマップファイル追加
  entry: [
    './src/index.js',
  ],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    modules: ['src', 'node_modules'],
    extensions: ['.js', '.jsx', '.json'],
  },
  plugins: [],
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            [
              '@babel/preset-env',
              {
                useBuiltIns: 'entry',
                corejs: 'core-js@3',
                modules: false,
              },
            ],
            '@babel/preset-react',
          ],
          plugins: [
            ['@babel/plugin-proposal-class-properties', { loose: true }], // クラスのdefaultProps、アローファンクション用
            '@babel/plugin-syntax-dynamic-import',
          ],
        },
      },
    }],
  },
}

