import { z } from "zod";
import pkg from "@okta/okta-sdk-nodejs";
const { Client: OktaClient } = pkg;

// Schemas for input validation
const groupSchemas = {
  listGroups: z.object({
    limit: z.number().min(1).max(200).optional().default(50),
    filter: z.string().optional(),
    search: z.string().optional(),
    after: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  }),

  createGroup: z.object({
    name: z.string().min(1, "Group name is required"),
    description: z.string().optional(),
  }),

  getGroup: z.object({
    groupId: z.string().min(1, "Group ID is required"),
  }),

  deleteGroup: z.object({
    groupId: z.string().min(1, "Group ID is required"),
  }),

  assignUserToGroup: z.object({
    groupId: z.string().min(1, "Group ID is required"),
    userId: z.string().min(1, "User ID is required"),
  }),

  removeUserFromGroup: z.object({
    groupId: z.string().min(1, "Group ID is required"),
    userId: z.string().min(1, "User ID is required"),
  }),

  listGroupUsers: z.object({
    groupId: z.string().min(1, "Group ID is required"),
    limit: z.number().min(1).max(200).optional().default(50),
    after: z.string().optional(),
  }),
};

// Utility function to get Okta client (can be moved to a shared utility file)
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

// Utility function to format array values
function formatArray(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return "N/A";
  return arr.join(", ");
}

// Utility function to format dates
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

// Utility function to format profile values
function getProfileValue(value: string | undefined | null): string {
  return value ?? "N/A";
}

// Tool definitions for groups
export const groupTools = [
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
          description: "Filter expression for groups",
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
          description: "Field to sort results by",
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
    name: "create_group",
    description: "Create a new group in Okta",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the group",
        },
        description: {
          type: "string",
          description: "Description of the group (optional)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_group",
    description: "Get detailed information about a specific group",
    inputSchema: {
      type: "object",
      properties: {
        groupId: {
          type: "string",
          description: "ID of the group to retrieve",
        },
      },
      required: ["groupId"],
    },
  },
  {
    name: "delete_group",
    description: "Delete a group from Okta",
    inputSchema: {
      type: "object",
      properties: {
        groupId: {
          type: "string",
          description: "ID of the group to delete",
        },
      },
      required: ["groupId"],
    },
  },
  {
    name: "assign_user_to_group",
    description: "Assign a user to a group in Okta",
    inputSchema: {
      type: "object",
      properties: {
        groupId: {
          type: "string",
          description: "ID of the group",
        },
        userId: {
          type: "string",
          description: "ID of the user to assign to the group",
        },
      },
      required: ["groupId", "userId"],
    },
  },
  {
    name: "remove_user_from_group",
    description: "Remove a user from a group in Okta",
    inputSchema: {
      type: "object",
      properties: {
        groupId: {
          type: "string",
          description: "ID of the group",
        },
        userId: {
          type: "string",
          description: "ID of the user to remove from the group",
        },
      },
      required: ["groupId", "userId"],
    },
  },
  {
    name: "list_group_users",
    description: "List all users in a specific group",
    inputSchema: {
      type: "object",
      properties: {
        groupId: {
          type: "string",
          description: "ID of the group",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of users to return (default: 50, max: 200)",
        },
        after: {
          type: "string",
          description: "Cursor for pagination, obtained from previous response",
        },
      },
      required: ["groupId"],
    },
  },
];

// Handlers for group-related tools
export const groupHandlers = {
  list_groups: async (request: { parameters: unknown }) => {
    const params = groupSchemas.listGroups.parse(request.parameters);

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
              type: "text",
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
              type: "text",
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
            type: "text",
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      console.error("Error listing groups:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to list groups: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  create_group: async (request: { parameters: unknown }) => {
    const { name, description } = groupSchemas.createGroup.parse(
      request.parameters
    );

    try {
      const oktaClient = getOktaClient();

      const newGroup = {
        profile: {
          name,
          description: description || "",
        },
      };

      const group = await oktaClient.groupApi.createGroup({
        group: newGroup,
      });

      return {
        content: [
          {
            type: "text",
            text: `Group created successfully:
ID: ${group.id}
Name: ${group.profile?.name}
Type: ${group.type || "OKTA_GROUP"}
Created: ${formatDate(group.created)}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error creating group:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to create group: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  get_group: async (request: { parameters: unknown }) => {
    const { groupId } = groupSchemas.getGroup.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      const group = await oktaClient.groupApi.getGroup({
        groupId,
      });

      if (!group || !group.profile) {
        return {
          content: [
            {
              type: "text",
              text: `No group found with ID: ${groupId}`,
            },
          ],
        };
      }

      const formattedGroup = `Group Details:
- ID: ${group.id}
- Name: ${group.profile.name}
- Description: ${getProfileValue(group.profile.description)}
- Type: ${group.type || "Unknown"}
- Object Class: ${formatArray(group.objectClass)}
- Created: ${formatDate(group.created)}
- Last Updated: ${formatDate(group.lastUpdated)}
- Last Membership Updated: ${formatDate(group.lastMembershipUpdated)}`;

      return {
        content: [
          {
            type: "text",
            text: formattedGroup,
          },
        ],
      };
    } catch (error) {
      console.error("Error getting group:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to get group: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  delete_group: async (request: { parameters: unknown }) => {
    const { groupId } = groupSchemas.deleteGroup.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      await oktaClient.groupApi.deleteGroup({
        groupId,
      });

      return {
        content: [
          {
            type: "text",
            text: `Group with ID ${groupId} has been successfully deleted.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error deleting group:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete group: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  assign_user_to_group: async (request: { parameters: unknown }) => {
    const { groupId, userId } = groupSchemas.assignUserToGroup.parse(
      request.parameters
    );

    try {
      const oktaClient = getOktaClient();

      await oktaClient.groupApi.assignUserToGroup({
        groupId,
        userId,
      });

      return {
        content: [
          {
            type: "text",
            text: `User with ID ${userId} has been successfully assigned to group with ID ${groupId}.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error assigning user to group:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to assign user to group: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  remove_user_from_group: async (request: { parameters: unknown }) => {
    const { groupId, userId } = groupSchemas.removeUserFromGroup.parse(
      request.parameters
    );

    try {
      const oktaClient = getOktaClient();

      await oktaClient.groupApi.unassignUserFromGroup({
        groupId,
        userId,
      });

      return {
        content: [
          {
            type: "text",
            text: `User with ID ${userId} has been successfully removed from group with ID ${groupId}.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error removing user from group:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to remove user from group: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  list_group_users: async (request: { parameters: unknown }) => {
    const params = groupSchemas.listGroupUsers.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      // Build query parameters for pagination
      const queryParams: Record<string, any> = {};
      if (params.limit) queryParams.limit = params.limit;
      if (params.after) queryParams.after = params.after;

      // Get group users list
      const users = await oktaClient.groupApi.listGroupUsers({
        groupId: params.groupId,
        ...queryParams,
      });

      if (!users) {
        return {
          content: [
            {
              type: "text",
              text: "No users data was returned from Okta.",
            },
          ],
        };
      }

      // Format the response
      let formattedResponse = `Users in Group (ID: ${params.groupId}):\n`;
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
              type: "text",
              text: "No users found in this group.",
            },
          ],
        };
      }

      // Add pagination information
      if (after && count >= (params.limit || 50)) {
        formattedResponse += `\nPagination:\n- Total users shown: ${count}\n`;
        formattedResponse += `- For next page, use 'after' parameter with value: ${after}\n`;
      } else {
        formattedResponse += `\nTotal users in group: ${count}\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      console.error("Error listing group users:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to list group users: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
