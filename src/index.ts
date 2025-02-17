import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { User, UserApiGetUserRequest } from "@okta/okta-sdk-nodejs";

import pkg from "@okta/okta-sdk-nodejs";
const { Client: OktaClient } = pkg;
import { z } from "zod";

// Initiatilize the server
const server = new Server(
  {
    name: "okta-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const schemas = {
  toolInputs: {
    getUser: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
  },
};

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

// Tool definitions
const TOOL_DEFINITIONS = [
  {
    name: "get_user",
    description:
      "Retrieve detailed user information from Okta by user ID, including profile, account status, dates, employment details, and contact information",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The unique identifier of the Okta user",
        },
      },
      required: ["userId"],
    },
  },
];

// Types
interface OktaApiError {
  status?: number;
  message: string;
}

type ToolHandler = (args: unknown) => Promise<{
  content: Array<{ type: "text"; text: string }>;
}>;

// Utility functions
function isOktaApiError(error: unknown): error is OktaApiError {
  return error !== null && typeof error === "object" && "status" in error;
}

// Tool handlers
const toolHandlers: Record<string, ToolHandler> = {
  get_user: async (args: unknown) => {
    const { userId } = schemas.toolInputs.getUser.parse(args);

    try {
      const oktaClient = new OktaClient({
        orgUrl: process.env.OKTA_ORG_URL,
        token: process.env.OKTA_API_TOKEN,
      });

      const params: UserApiGetUserRequest = {
        userId,
      };

      const user = await oktaClient.userApi.getUser(params);

      if (!user.profile) {
        throw new Error("User profile is undefined");
      }

      const getProfileValue = (value: string | undefined | null): string =>
        value ?? "N/A";

      const formattedUser = `• User Details:
            ID: ${user.id}
            Status: ${user.status}
          
          - Account Dates:
            Created: ${user.created}
            Activated: ${user.activated}
            Last Login: ${user.lastLogin}
            Last Updated: ${user.lastUpdated}
            Status Changed: ${user.statusChanged}
            Password Changed: ${user.passwordChanged}
          
          - Personal Information:
            Login: ${user.profile.login}
            Email: ${user.profile.email}
            Secondary Email: ${getProfileValue(user.profile.secondEmail)}
            First Name: ${user.profile.firstName}
            Last Name: ${user.profile.lastName}
            Display Name: ${user.profile.displayName}
            Nickname: ${getProfileValue(user.profile.nickName)}
          
          - Employment Details:
            Organization: ${user.profile.organization}
            Title: ${user.profile.title}
            Division: ${user.profile.division}
            Department: ${user.profile.department}
            Employee Number: ${user.profile.employeeNumber}
            User Type: ${user.profile.userType}
            Cost Center: ${user.profile.costCenter}
          
          - Contact Information:
            Mobile Phone: ${getProfileValue(user.profile.mobilePhone)}
            Primary Phone: ${getProfileValue(user.profile.primaryPhone)}
            
          - Address:
            Street: ${user.profile.streetAddress}
            City: ${user.profile.city}
            State: ${user.profile.state}
            Zip Code: ${user.profile.zipCode}
            Country: ${user.profile.countryCode}
          
          - Preferences:
            Preferred Language: ${user.profile.preferredLanguage}
            Profile URL: ${getProfileValue(user.profile.profileUrl)}`;

      return {
        content: [
          {
            type: "text" as const,
            text: formattedUser,
          },
        ],
      };
    } catch (error: unknown) {
      if (isOktaApiError(error) && error.status === 404) {
        return {
          content: [
            {
              type: "text" as const,
              text: `User with ID ${userId} not found.`,
            },
          ],
        };
      }
      console.error("Error fetching user:", error);
      throw new Error("Failed to fetch user details");
    }
  },
};

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Tools requested by client");
  return { tools: TOOL_DEFINITIONS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = toolHandlers[name as keyof typeof toolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler(args);
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw error;
  }
});

// Start the server
async function main() {
  try {
    // Check for required environment variables
    const requiredEnvVars: string[] = [];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );
    if (missingVars.length > 0) {
      console.error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
      process.exit(1);
    }

    console.error("Starting server with env vars:", {});

    const transport = new StdioServerTransport();
    console.error("Created transport");

    await server.connect(transport);
    console.error("Connected to transport");

    console.error("Okta MCP Server running on stdio");
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
