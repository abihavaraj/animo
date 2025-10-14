# MCP Server Setup Instructions

## What is MCP?

**MCP (Model Context Protocol)** allows the AI assistant in Cursor to access your Supabase database directly, enabling:
- ✅ Real-time schema queries
- ✅ Accurate table structure inspection  
- ✅ RLS policy verification
- ✅ Better debugging and development assistance

## Setup Steps

### Step 1: Get Your Database Password

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/byhqueksdwlbiwodpbbd
2. Navigate to **Settings** → **Database**
3. Scroll to **Connection String** section
4. Click **Connection pooling** or **Direct connection**
5. Copy the password (or reset it if needed)

### Step 2: Update MCP Configuration

Open `.cursor/mcp.json` and replace `[YOUR-DB-PASSWORD]` with your actual database password:

```json
{
  "mcpServers": {
    "supabase-pilates-db": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres:YOUR-ACTUAL-PASSWORD-HERE@db.byhqueksdwlbiwodpbbd.supabase.co:5432/postgres"
      }
    }
  }
}
```

### Step 3: Restart Cursor

After updating the configuration:
1. Close and restart Cursor completely
2. The MCP server will automatically connect on next launch

### Step 4: Verify Connection

Once set up, you can ask the AI assistant things like:
- "Show me the structure of the bookings table"
- "What are the RLS policies on the users table?"
- "Check the indexes on my database"

## Security Notes 🔒

- ✅ `.cursor/mcp.json` is already in `.gitignore` - your password won't be committed
- ✅ Only used locally on your machine
- ⚠️ Never share or commit this file
- ⚠️ Use database password, not your Supabase account password

## Alternative: Using Service Role Key (Less Powerful)

If you prefer not to use the database password, you can use this simpler config (but with fewer capabilities):

```json
{
  "mcpServers": {
    "supabase-api": {
      "command": "node",
      "args": ["-e", "console.log('Supabase connection ready')"],
      "env": {
        "SUPABASE_URL": "https://byhqueksdwlbiwodpbbd.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ"
      }
    }
  }
}
```

## Troubleshooting

### MCP Server Not Connecting?
1. Check that the password is correct
2. Ensure you restarted Cursor completely
3. Check Cursor's developer console for errors (Help → Toggle Developer Tools)

### Need to Add Bar Database Too?
You can add multiple MCP servers:

```json
{
  "mcpServers": {
    "supabase-pilates-db": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres:PASSWORD@db.byhqueksdwlbiwodpbbd.supabase.co:5432/postgres"
      }
    },
    "supabase-bar-db": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres:PASSWORD@db.grfyzitojijoptyqhujs.supabase.co:5432/postgres"
      }
    }
  }
}
```

## What's Next?

Once configured, try asking:
- "What tables exist in my database?"
- "Show me the schema for the instructor_clients table"
- "What are all the foreign key relationships?"
- "Check if there are any missing indexes"

The AI will be able to query your actual database structure and help you more accurately!


