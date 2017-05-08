const webpack = require('webpack'); //to access built-in plugins
var path = require('path');

module.exports = {
  entry: {
    OP_Bundle: path.resolve(__dirname, 'assets', 'opstools', 'AppBuilder', 'OP', 'OP.js'),
    BuildApp: path.resolve(__dirname, 'assets', 'opstools', 'AppBuilder', 'AppBuilder.js')
  },
  output: {
    path: path.resolve(__dirname, 'assets', 'opstools', 'BuildApp'),
    filename: '[name].js'
  },

  resolve: {
    alias: {
      'OP': path.resolve(__dirname, 'assets', 'opstools', 'AppBuilder', 'OP', 'OP.js')
      // it's important what kind of paths you're using (relative vs. absolute)
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel-loader'
      }
    ]
  },
  plugins: [

    // *************************************************************************** //
    // This builds the OP into same bundle but automatically imports the OP object //
    // *************************************************************************** //
    new webpack.ProvidePlugin({
        OP: "OP"
    })

    // ***************************************** //
    // This builds the OP into a seperate bundle //
    // ***************************************** //
    /*
    new webpack.optimize.CommonsChunkPlugin({
      name: "OP_Bundle",

      filename: "OP_Bundle.js",
      // (Give the chunk a different name)

      minChunks: Infinity,
      // (with more entries, this ensures that no other module
      //  goes into the vendor chunk)
    })
    */

  ]
};
