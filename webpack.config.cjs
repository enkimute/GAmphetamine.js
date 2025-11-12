const path = require('path');

module.exports = ['umd','module'].map(target=>({
  mode:'development'||'production',
  devtool : undefined, // 'eval-cheap-module-source-map',
  entry: './src/GAmphetamine.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `GAmphetamine${{umd:'.umd',module:''}[target]}.js`,
    library: {umd:'GAmphetamine'}[target],
    libraryTarget: target,
    globalObject: {umd:'this'}[target],
    umdNamedDefine: {umd:true}[target],
  },
  module: {
/*    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env',{
                      "exclude": ["@babel/plugin-proposal-object-rest-spread","@babel/transform-exponentiation-operator","transform-exponentiation-operator"],

            }],
            "exclude": ["@babel/plugin-proposal-object-rest-spread","@babel/transform-exponentiation-operator","transform-exponentiation-operator"],
          }
        }
      }
    ]*/
  },
  experiments: target === 'module' ? { outputModule: true } : undefined  
}));
