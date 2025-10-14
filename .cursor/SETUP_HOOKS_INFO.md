# Setup Hooks Configuration

## What are Setup Hooks?

Setup hooks are commands that run automatically when you open your project in Cursor. They help ensure your development environment is ready.

## Current Hooks

### 1. Check Node Environment
- Verifies Node.js is installed and accessible
- Displays the current Node.js version

### 2. Validate Supabase Config
- Checks that Supabase configuration can be loaded
- Ensures no syntax errors in config files

## Adding More Hooks

You can add additional hooks to `.cursor/setup-hooks.json`. Here are some useful examples:

### Check Environment Variables
```json
{
  "name": "Check Supabase Env Vars",
  "command": "node",
  "args": ["-e", "if(!process.env.EXPO_PUBLIC_SUPABASE_URL){console.warn('⚠️  EXPO_PUBLIC_SUPABASE_URL not set')}else{console.log('✅ Supabase env vars configured')}"]
}
```

### Verify Dependencies
```json
{
  "name": "Check Dependencies",
  "command": "npm",
  "args": ["ls", "@supabase/supabase-js", "--depth=0"]
}
```

### Test Supabase Connection
```json
{
  "name": "Test Supabase Connectivity",
  "command": "node",
  "args": ["scripts/test-supabase-connection.js"]
}
```

## Disabling Hooks

If setup hooks become annoying or slow down your workflow:
1. Rename `setup-hooks.json` to `setup-hooks.json.disabled`
2. Or remove specific hooks from the array

## Creating a Connection Test Script

You could create `scripts/test-supabase-connection.js`:

```javascript
const https = require('https');

const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';

https.get(`${supabaseUrl}/rest/v1/`, (res) => {
  if (res.statusCode === 200 || res.statusCode === 401) {
    console.log('✅ Supabase connection OK');
  } else {
    console.warn('⚠️  Supabase connection issue:', res.statusCode);
  }
}).on('error', (err) => {
  console.error('❌ Cannot reach Supabase:', err.message);
});
```

Then add it to your setup hooks!


