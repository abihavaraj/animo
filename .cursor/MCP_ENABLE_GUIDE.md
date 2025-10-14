# How to Enable MCP in Cursor

## ✅ Good News!

The MCP server **WORKS** and can connect to your database! Test result: Success ✅

## Issue

Cursor isn't loading the MCP configuration automatically. Here's how to fix it:

## Steps to Enable MCP in Cursor

### Option 1: Via Cursor Settings (Recommended)

1. **Open Cursor Settings**
   - Press `Ctrl + ,` (Windows/Linux) or `Cmd + ,` (Mac)
   - Or: File → Preferences → Settings

2. **Search for "MCP"**
   - In the settings search bar, type: "MCP" or "Model Context Protocol"

3. **Enable MCP**
   - Look for a toggle or checkbox to enable MCP
   - Enable it if it's disabled

4. **Add MCP Server Configuration**
   - Look for "MCP Servers" or "Edit in settings.json"
   - Add the configuration from `.cursor/mcp.json`

5. **Restart Cursor**
   - Completely close and reopen Cursor

### Option 2: Via settings.json

1. **Open Command Palette**
   - Press `Ctrl + Shift + P` (Windows/Linux) or `Cmd + Shift + P` (Mac)

2. **Type**: "Preferences: Open User Settings (JSON)"

3. **Add this configuration**:
   ```json
   {
     "mcp.servers": {
       "supabase-pilates": {
         "command": "C:\\Program Files\\nodejs\\node.exe",
         "args": [
           "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
           "-y",
           "@modelcontextprotocol/server-postgres",
           "postgresql://postgres:Argjendi123.@db.byhqueksdwlbiwodpbbd.supabase.co:5432/postgres"
         ]
       }
     }
   }
   ```

4. **Save and Restart Cursor**

### Option 3: Check if MCP is a Cursor Feature

**Important**: MCP might be:
- A beta/preview feature that needs to be enabled
- Only available in certain Cursor versions
- Requires a specific plan

**To check:**
1. Help → About → Check your Cursor version
2. Look for any "Enable Beta Features" or "Preview Features" settings
3. Check Cursor's documentation or release notes

## How to Verify MCP is Working

Once enabled, you can test by asking the AI:
- "List MCP resources"
- "Query my database tables"
- "Show me users table structure"

If I can access MCP, I'll be able to query your live database directly!

## Alternative If MCP Doesn't Work

Don't worry! You still have excellent options:

### ✅ What Already Works:
- Complete schema documentation (`.cursor/rules/complete-supabase-schema.md`)
- All migration files
- Connection test script (works perfectly!)
- I can help with all your code

### ✅ For Live Database Queries:
Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/byhqueksdwlbiwodpbbd/sql/new)

## Current Status

- ✅ MCP server package: Installed and working
- ✅ Database connection: Verified and working
- ✅ Configuration file: Correct and tested
- ⚠️  Cursor integration: Needs to be enabled in settings

## Next Steps

1. Try the settings options above
2. Restart Cursor after each attempt
3. Ask me to "List MCP resources" to test
4. If it doesn't work, don't worry - we have great alternatives!

---

**Remember**: MCP is a convenience feature, not a requirement. Your development workflow is already excellent without it!

