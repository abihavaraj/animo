console.log('🚀 index.js: Step 1 - Entry point started');

import { registerRootComponent } from 'expo';

console.log('🚀 index.js: Step 2 - Expo import successful');

// Test if the error happens before App import
const testAccess = { S: 'working' };
console.log('🚀 index.js: Step 3 - Test object S property:', testAccess.S);

import App from './App';

console.log('🚀 index.js: Step 4 - App import successful');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

console.log('🚀 index.js: Step 5 - App registered successfully'); 