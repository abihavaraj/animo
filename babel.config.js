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
      // react-native-reanimated/plugin has to be listed last
      'react-native-reanimated/plugin',
    ],
  };
}; 