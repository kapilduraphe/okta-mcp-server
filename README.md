# Okta MCP Server

This MCP server enables Claude to interact with Okta's user management system, providing user and group management capabilities.

<a href="https://glama.ai/mcp/servers/@kapilduraphe/okta-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@kapilduraphe/okta-mcp-server/badge" alt="Okta Server MCP server" />
</a>

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

Install dependencies:
```bash
npm install
```

### 4. Configure Claude Desktop

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
                "PATH_TO_PROJECT_DIRECTORY/dist/index.js"
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

The server provides the following tools:

### get_user
Retrieves detailed user information from Okta, including:
- User Details (ID, Status)
- Account Dates (Created, Activated, Last Login, etc.)
- Personal Information (Name, Email)
- Employment Details
- Contact Information
- Address
- Preferences

### list_users
Lists users from Okta with optional filtering and pagination:
- Supports SCIM filter expressions (e.g., 'profile.firstName eq "John"')
- Free-form text search across multiple fields
- Sorting options (by status, creation date, etc.)
- Pagination support with customizable limits

### list_groups
Lists user groups from Okta with optional filtering and pagination:
- Filter expressions for groups (e.g., 'type eq "OKTA_GROUP"')
- Free-form text search across group fields
- Sorting options (by name, type, etc.)
- Pagination support with customizable limits

## Example Usage in Claude

After setup, you can use commands like:

- "Show me details for user with userId XXXX"
- "What's the status of user john.doe@company.com"
- "When was the last login for user jane.smith@organization.com"
- "List all users in the marketing department"
- "Find users created in the last month"
- "Show me all the groups in my Okta organization"
- "List groups containing the word 'admin'"

## Error Handling

The server includes robust error handling for:
- User or group not found (404 errors)
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

The server includes TypeScript interfaces for Okta user and group data:

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

interface OktaGroup {
  id: string;
  created: string;
  lastUpdated: string;
  lastMembershipUpdated: string;
  type: string;
  objectClass: string[];
  profile: {
    name: string;
    description: string;
  };
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

Note: PRs welcome!