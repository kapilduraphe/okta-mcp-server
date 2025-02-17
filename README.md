# Okta MCP Server

This MCP server enables Claude to interact with Okta's user management system, currently providing user information retrieval capabilities.

## Prerequisites

- Node.js (v16 or higher)
- Claude Desktop App
- Okta Developer Account
- Admin API Token from Okta

## Setup Instructions

### 1. Create an Okta Developer Account
- Go to the [Okta Developer Console](https://developer.okta.com/)
- Create a new account or sign in to an existing one
- Note your Okta domain (e.g., `dev-123456.okta.com`)

### 2. Create an API Token
- In the Okta Developer Console, go to Security > API > Tokens
- Click "Create Token"
- Give your token a meaningful name (e.g., "MCP Server Token")
- Copy the token value (you won't be able to see it again)

### 3. Initial Project Setup

Create a new directory for your project:
```bash
mkdir okta-mcp
cd okta-mcp
```

Initialize a new npm project:
```bash
npm init -y
```

Install dependencies:
```bash
npm install @modelcontextprotocol/sdk @okta/okta-sdk-nodejs zod
npm install -D @types/node typescript
```

Create a `tsconfig.json` file:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Create your source directory and add the server implementation:
```bash
mkdir src
```

### 4. Configure Environment Variables

Create a `.env` file for local development (don't commit this file):
```
OKTA_ORG_URL=https://your-domain.okta.com
OKTA_API_TOKEN=your-api-token
```

### 5. Configure Claude Desktop

Open your Claude Desktop configuration file:

For MacOS:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

For Windows:
```bash
code %AppData%\Claude\claude_desktop_config.json
```

Add or update the configuration:
```json
{
    "mcpServers": {
        "okta": {
            "command": "node",
            "args": [
                "/ABSOLUTE/PATH/TO/YOUR/build/index.js"
            ],
            "env": {
                "OKTA_ORG_URL": "https://your-domain.okta.com",
                "OKTA_API_TOKEN": "your-api-token"
            }
        }
    }
}
```

Save the file and restart Claude Desktop.

## Available Tools

The server currently provides the following tool:

### get_user
Retrieves detailed user information from Okta, including:
- User Details (ID, Status)
- Account Dates (Created, Activated, Last Login, etc.)
- Personal Information (Name, Email)
- Employment Details
- Contact Information
- Address
- Preferences

## Example Usage in Claude

After setup, you can use commands like:

- "Show me details for user example@domain.com"
- "What's the status of user john.doe@company.com"
- "When was the last login for user jane.smith@organization.com"

## Error Handling

The server includes robust error handling for:
- User not found (404 errors)
- API authentication issues
- Missing or invalid user profiles
- General API errors

## Troubleshooting

### Common Issues

**Tools not appearing in Claude:**
- Check Claude Desktop logs: `tail -f ~/Library/Logs/Claude/mcp*.log`
- Verify all environment variables are set correctly
- Ensure the path to index.js is absolute and correct

**Authentication Errors:**
- Verify your API token is valid
- Check if OKTA_ORG_URL includes the full URL with https://
- Ensure your Okta domain is correct

**Server Connection Issues:**
- Check if the server built successfully
- Verify file permissions on build/index.js (should be 755)
- Try running the server directly: `node /path/to/build/index.js`

### Viewing Logs

To view server logs:

For MacOS/Linux:
```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

For Windows:
```powershell
Get-Content -Path "$env:AppData\Claude\Logs\mcp*.log" -Wait -Tail 20
```

### Environment Variables

If you're getting environment variable errors, verify:
- `OKTA_ORG_URL`: Should be complete URL (e.g., "https://dev-123456.okta.com")
- `OKTA_API_TOKEN`: Should be a valid API token

## Security Considerations

- Keep your API token secure
- Don't commit credentials to version control
- Use environment variables for sensitive data
- Regularly rotate API tokens
- Monitor API usage in Okta Admin Console
- Implement rate limiting for API calls
- Use minimum required permissions for API token

## Types

The server includes TypeScript interfaces for Okta user data:

```typescript
interface OktaUserProfile {
  login: string;
  email: string;
  secondEmail?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  nickName?: string;
  organization: string;
  title: string;
  division: string;
  department: string;
  employeeNumber: string;
  userType: string;
  costCenter: string;
  mobilePhone?: string;
  primaryPhone?: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  countryCode: string;
  preferredLanguage: string;
  profileUrl?: string;
}

interface OktaUser {
  id: string;
  status: string;
  created: string;
  activated: string;
  lastLogin: string;
  lastUpdated: string;
  statusChanged: string;
  passwordChanged: string;
  profile: OktaUserProfile;
}
```

## License

MIT License - See LICENSE file for details.

## Support

If you encounter any issues:
- Check the troubleshooting section above
- Review Claude Desktop logs
- Examine the server's error output
- Check Okta's developer documentation