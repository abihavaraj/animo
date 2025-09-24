module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { 
        typescript: {
          allowNamespaces: true,
          allowDeclareFields: true,
          onlyRemoveTypeImports: true
        }
      }]
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      // react-native-worklets/plugin has to be listed last
      'react-native-worklets/plugin',
    ],
  };
}; 