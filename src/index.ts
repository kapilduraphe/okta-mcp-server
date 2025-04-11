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

// Initialize the server
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

// Schema definitions for input validation
const schemas = {
  toolInputs: {
    getUser: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    getUserLastLocation: z.object({
      userId: z.string().min(1, "User ID is required"),
    }),
    listUsers: z.object({
      limit: z.number().min(1).max(200).optional().default(50),
      filter: z.string().optional(),
      search: z.string().optional(),
      after: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
    }),
    listGroups: z.object({
      limit: z.number().min(1).max(200).optional().default(50),
      filter: z.string().optional(),
      search: z.string().optional(),
      after: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
    }),
  },
};

// Interface definitions for Okta data structures
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

interface OktaGroupProfile {
  name: string;
  description?: string;
}

interface OktaGroup {
  id: string;
  created?: string;
  lastUpdated?: string;
  lastMembershipUpdated?: string;
  type?: string;
  objectClass?: string[];
  profile?: OktaGroupProfile;
}

function getOktaClient() {
  const oktaDomain = process.env.OKTA_ORG_URL;
  const apiToken = process.env.OKTA_API_TOKEN;

  if (!oktaDomain) {
    throw new Error(
      "OKTA_ORG_URL environment variable is not set. Please set it to your Okta domain."
    );
  }

  if (!apiToken) {
    throw new Error(
      "OKTA_API_TOKEN environment variable is not set. Please generate an API token in the Okta Admin Console."
    );
  }

  return new OktaClient({
    orgUrl: oktaDomain,
    token: apiToken,
  });
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
  {
    name: "get_user_last_location",
    description: "Retrieve the last known location and login information for a user from Okta system logs",
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
  {
    name: "list_users",
    description: "List users from Okta with optional filtering and pagination",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description:
            "Maximum number of users to return (default: 50, max: 200)",
        },
        filter: {
          type: "string",
          description:
            "SCIM filter expression to filter users (e.g. 'profile.firstName eq \"John\"')",
        },
        search: {
          type: "string",
          description: "Free-form text search across multiple fields",
        },
        after: {
          type: "string",
          description: "Cursor for pagination, obtained from previous response",
        },
        sortBy: {
          type: "string",
          description:
            "Field to sort results by (e.g. 'status', 'created', 'lastUpdated')",
        },
        sortOrder: {
          type: "string",
          description: "Sort order (asc or desc, default: asc)",
          enum: ["asc", "desc"],
        },
      },
    },
  },
  {
    name: "list_groups",
    description:
      "List user groups from Okta with optional filtering and pagination",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description:
            "Maximum number of groups to return (default: 50, max: 200)",
        },
        filter: {
          type: "string",
          description:
            "Filter expression for groups (e.g. 'type eq \"OKTA_GROUP\"')",
        },
        search: {
          type: "string",
          description: "Free-form text search across group fields",
        },
        after: {
          type: "string",
          description: "Cursor for pagination, obtained from previous response",
        },
        sortBy: {
          type: "string",
          description: "Field to sort results by (e.g. 'name', 'type')",
        },
        sortOrder: {
          type: "string",
          description: "Sort order (asc or desc, default: asc)",
          enum: ["asc", "desc"],
        },
      },
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
function isOktaApiError(error: any): error is OktaApiError {
  return error !== null && typeof error === "object" && "status" in error;
}

function getProfileValue(value: string | undefined | null): string {
  return value ?? "N/A";
}

function formatDate(dateString: Date | string | undefined | null): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString instanceof Date
      ? dateString.toISOString()
      : dateString || "N/A";
  }
}

function formatArray(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return "N/A";
  return arr.join(", ");
}

// Tool handlers
const toolHandlers: Record<string, ToolHandler> = {
  get_user: async (args: unknown) => {
    const { userId } = schemas.toolInputs.getUser.parse(args);

    try {
      const params: UserApiGetUserRequest = {
        userId,
      };

      const oktaClient = getOktaClient();

      const user = await oktaClient.userApi.getUser(params);

      if (!user.profile) {
        throw new Error("User profile is undefined");
      }

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
    } catch (error) {
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
      throw new Error(
        `Failed to fetch user details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  get_user_last_location: async (args: unknown) => {
    const { userId } = schemas.toolInputs.getUserLastLocation.parse(args);

    try {
      const oktaClient = getOktaClient();

      // First get the user to ensure they exist and get their login
      const user = await oktaClient.userApi.getUser({ userId });

      if (!user || !user.profile) {
        return {
          content: [
            {
              type: "text" as const,
              text: `User with ID ${userId} not found.`,
            },
          ],
        };
      }

      // Get the last 90 days of system logs for this user's login events
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Use the system log API to get login events with the previously working filter syntax
      const logs = await oktaClient.systemLogApi.listLogEvents({
        since: ninetyDaysAgo,
        filter: `target.id eq "${userId}" and (eventType eq "user.session.start" or eventType eq "user.authentication.auth_via_mfa" or eventType eq "user.authentication.sso")`,
        limit: 1
      });

      // Get the first (most recent) log entry
      const lastLogin = await logs.next();

      if (!lastLogin || !lastLogin.value) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No login events found for user ${user.profile.login} in the last 90 days. This might mean the user hasn't logged in recently or the events are not being captured in the system logs.`,
            },
          ],
        };
      }

      const event = lastLogin.value;
      const clientData = event.client || {};
      const geographicalContext = event.client?.geographicalContext || {};

      const formattedLocation = `• Last Login Information for User ${user.profile.login}:
            Time: ${formatDate(event.published)}
            Event Type: ${event.eventType || "N/A"}
            IP Address: ${clientData.ipAddress || "N/A"}
            City: ${geographicalContext.city || "N/A"}
            State: ${geographicalContext.state || "N/A"}
            Country: ${geographicalContext.country || "N/A"}
            Device: ${clientData.device || "N/A"}
            User Agent: ${clientData.userAgent || "N/A"}`;

      return {
        content: [
          {
            type: "text" as const,
            text: formattedLocation,
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching user location:", error);
      throw new Error(
        `Failed to fetch user location: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  list_users: async (args: unknown) => {
    const params = schemas.toolInputs.listUsers.parse(args);

    try {
      // Build query parameters
      const queryParams: Record<string, any> = {};
      if (params.limit) queryParams.limit = params.limit;
      if (params.after) queryParams.after = params.after;
      if (params.filter) queryParams.filter = params.filter;
      if (params.search) queryParams.search = params.search;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

      const oktaClient = getOktaClient();

      // Get users list
      const users = await oktaClient.userApi.listUsers(queryParams);

      if (!users) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No users data was returned from Okta.",
            },
          ],
        };
      }

      // Format the response
      let formattedResponse = "Users:\n";
      let count = 0;

      // Track pagination info
      let after: string | undefined;

      // Process the users collection
      for await (const user of users) {
        // Check if user is valid
        if (!user || !user.id) {
          continue;
        }

        count++;

        // Remember the last user ID for pagination
        after = user.id;

        formattedResponse += `
  ${count}. ${user.profile?.firstName || ""} ${user.profile?.lastName || ""} (${user.profile?.email || "No email"})
   - ID: ${user.id}
   - Status: ${user.status || "Unknown"}
   - Created: ${formatDate(user.created)}
   - Last Updated: ${formatDate(user.lastUpdated)}
  `;
      }

      if (count === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No users found matching your criteria.",
            },
          ],
        };
      }

      // Add pagination information
      if (after && count >= (params.limit || 50)) {
        formattedResponse += `\nPagination:\n- Total users shown: ${count}\n`;
        formattedResponse += `- For next page, use 'after' parameter with value: ${after}\n`;
      } else {
        formattedResponse += `\nTotal users: ${count}\n`;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      console.error("Error listing users:", error);
      throw new Error(
        `Failed to list users: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  list_groups: async (args: unknown) => {
    const params = schemas.toolInputs.listGroups.parse(args);

    try {
      // Build query parameters
      const queryParams: Record<string, any> = {};
      if (params.limit) queryParams.limit = params.limit;
      if (params.after) queryParams.after = params.after;
      if (params.filter) queryParams.filter = params.filter;
      if (params.search) queryParams.search = params.search;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

      const oktaClient = getOktaClient();

      // Get groups list
      const groups = await oktaClient.groupApi.listGroups(queryParams);

      if (!groups) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No groups data was returned from Okta.",
            },
          ],
        };
      }

      // Format the response
      let formattedResponse = "Groups:\n";
      let count = 0;

      // Track pagination info
      let after: string | undefined;

      // Process the groups collection
      for await (const group of groups) {
        // Check if group is valid
        if (!group || !group.id) {
          continue;
        }

        count++;

        // Remember the last group ID for pagination
        after = group.id;

        formattedResponse += `
  ${count}. ${group.profile?.name || "Unnamed Group"}
     - ID: ${group.id}
     - Type: ${group.type || "Unknown"}
     - Object Class: ${formatArray(group.objectClass)}
     - Description: ${group.profile?.description || "No description"}
     - Created: ${formatDate(group.created)}
     - Last Updated: ${formatDate(group.lastUpdated)}
     - Last Membership Updated: ${formatDate(group.lastMembershipUpdated)}
  `;
      }

      if (count === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No groups found matching your criteria.",
            },
          ],
        };
      }

      // Add pagination information
      if (after && count >= (params.limit || 50)) {
        formattedResponse += `\nPagination:\n- Total groups shown: ${count}\n`;
        formattedResponse += `- For next page, use 'after' parameter with value: ${after}\n`;
      } else {
        formattedResponse += `\nTotal groups: ${count}\n`;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      console.error("Error listing groups:", error);
      throw new Error(
        `Failed to list groups: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
}; // Added closing brace for toolHandlers object

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
    throw new Error(
      `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error(
      "Startup error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    "Fatal error in main():",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});