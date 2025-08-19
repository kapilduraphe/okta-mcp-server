import { z } from "zod";
import pkg from "@okta/okta-sdk-nodejs";
const { Client: OktaClient } = pkg;

// Schemas for input validation
const userSchemas = {
  getUser: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),

  getUserByAttribute: z.object({
    attribute: z.string().min(1, "Attribute name is required"),
    value: z.string().min(1, "Value is required"),
    operator: z.enum(["eq", "sw", "ew", "co", "pr"]).optional().default("eq"),
    limit: z.number().min(1).max(200).optional().default(50),
    includeInactive: z.boolean().optional().default(false),
  }),

  listUsers: z.object({
    limit: z.number().min(1).max(200).optional().default(50),
    filter: z.string().optional(),
    search: z.string().optional(),
    after: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  }),

  createUser: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    login: z.string().optional(),
    activate: z.boolean().optional().default(false),
  }),

  activateUser: z.object({
    userId: z.string().min(1, "User ID is required"),
    sendEmail: z.boolean().optional().default(true),
  }),

  suspendUser: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),

  unsuspendUser: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),

  deactivateUser: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),

  deleteUser: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),

  getUserLastLocation: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
};

// Utility function to get Okta client
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

// Utility function to format profile values
function getProfileValue(value: string | undefined | null): string {
  return value ?? "N/A";
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

// Utility functions to handle PII safely
function isPIIAttribute(attribute: string): boolean {
  const piiAttributes = [
    "email",
    "login",
    "firstName",
    "lastName",
    "displayName",
    "nickName",
    "mobilePhone",
    "primaryPhone",
    "streetAddress",
    "secondEmail",
    "employeeNumber",
    "manager",
    "managerId",
  ];
  return piiAttributes.includes(attribute.toLowerCase());
}

function maskValue(value: string): string {
  if (value.length <= 3) {
    return "***";
  }
  return (
    value.charAt(0) +
    "*".repeat(value.length - 2) +
    value.charAt(value.length - 1)
  );
}

// Tool definitions for users
export const userTools = [
  {
    name: "get_user",
    description: "Retrieve detailed user information from Okta by user ID",
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
    name: "find_users_by_attribute",
    description:
      "Search users by any profile attribute (manager, department, title, firstName, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        attribute: {
          type: "string",
          description:
            "Profile attribute to search by. Common attributes: firstName, lastName, email, manager, department, title, division, organization, employeeNumber, costCenter, userType, city, state",
        },
        value: {
          type: "string",
          description: "Value to search for",
        },
        operator: {
          type: "string",
          description:
            "How to match the value: 'eq' (exact), 'sw' (starts with), 'ew' (ends with), 'co' (contains), 'pr' (has any value - ignores 'value' param)",
          enum: ["eq", "sw", "ew", "co", "pr"],
        },
        limit: {
          type: "number",
          description: "Maximum users to return (default: 50, max: 200)",
        },
        includeInactive: {
          type: "boolean",
          description: "Include suspended/deactivated users (default: false)",
        },
      },
      required: ["attribute", "value"],
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
          description: "SCIM filter expression to filter users",
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
    name: "create_user",
    description: "Create a new user in Okta",
    inputSchema: {
      type: "object",
      properties: {
        firstName: {
          type: "string",
          description: "User's first name",
        },
        lastName: {
          type: "string",
          description: "User's last name",
        },
        email: {
          type: "string",
          description: "User's email address",
        },
        login: {
          type: "string",
          description: "User's login (defaults to email if not provided)",
        },
        activate: {
          type: "boolean",
          description:
            "Whether to activate the user immediately (default: false)",
        },
      },
      required: ["firstName", "lastName", "email"],
    },
  },
  {
    name: "activate_user",
    description: "Activate a user in Okta",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The unique identifier of the Okta user",
        },
        sendEmail: {
          type: "boolean",
          description: "Whether to send an activation email (default: true)",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "suspend_user",
    description: "Suspend a user in Okta",
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
    name: "unsuspend_user",
    description: "Unsuspend a user in Okta",
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
    name: "deactivate_user",
    description: "Deactivate a user in Okta",
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
    name: "delete_user",
    description: "Delete a user from Okta (must be deactivated first)",
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
    description:
      "Retrieve the last known location and login information for a user from Okta system logs",
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

// Handlers for user-related tools
export const userHandlers = {
  get_user: async (request: { parameters: unknown }) => {
    const { userId } = userSchemas.getUser.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      const user = await oktaClient.userApi.getUser({ userId });

      if (!user.profile) {
        throw new Error("User profile is undefined");
      }

      const formattedUser = `• User Details:
  ID: ${user.id}
  Status: ${user.status}

- Account Dates:
  Created: ${formatDate(user.created)}
  Activated: ${formatDate(user.activated)}
  Last Login: ${formatDate(user.lastLogin)}
  Last Updated: ${formatDate(user.lastUpdated)}
  Status Changed: ${formatDate(user.statusChanged)}
  Password Changed: ${formatDate(user.passwordChanged)}

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
  Manager: ${getProfileValue(user.profile.manager)}
  ManagerId ${getProfileValue(user.profile.managerId)}

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
            type: "text",
            text: formattedUser,
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to get user: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  list_users: async (request: { parameters: unknown }) => {
    const params = userSchemas.listUsers.parse(request.parameters);

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
              type: "text",
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
              type: "text",
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
            type: "text",
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      console.error("Error listing users:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to list users: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  create_user: async (request: { parameters: unknown }) => {
    const params = userSchemas.createUser.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      const newUser = {
        profile: {
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          login: params.login || params.email,
        },
      };

      const user = await oktaClient.userApi.createUser({
        body: newUser,
        activate: params.activate,
      });

      return {
        content: [
          {
            type: "text",
            text: `User created successfully:
ID: ${user.id}
Login: ${user.profile?.login}
Status: ${user.status}
Created: ${formatDate(user.created)}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error creating user:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  activate_user: async (request: { parameters: unknown }) => {
    const { userId, sendEmail } = userSchemas.activateUser.parse(
      request.parameters
    );

    try {
      const oktaClient = getOktaClient();

      await oktaClient.userApi.activateUser({
        userId,
        sendEmail,
      });

      return {
        content: [
          {
            type: "text",
            text: `User with ID ${userId} has been activated successfully.${
              sendEmail ? " An activation email has been sent." : ""
            }`,
          },
        ],
      };
    } catch (error) {
      console.error("Error activating user:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to activate user: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  suspend_user: async (request: { parameters: unknown }) => {
    const { userId } = userSchemas.suspendUser.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      await oktaClient.userApi.suspendUser({
        userId,
      });

      return {
        content: [
          {
            type: "text",
            text: `User with ID ${userId} has been suspended.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error suspending user:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to suspend user: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  unsuspend_user: async (request: { parameters: unknown }) => {
    const { userId } = userSchemas.unsuspendUser.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      await oktaClient.userApi.unsuspendUser({
        userId,
      });

      return {
        content: [
          {
            type: "text",
            text: `User with ID ${userId} has been unsuspended and is now active.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error unsuspending user:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to unsuspend user: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  deactivate_user: async (request: { parameters: unknown }) => {
    const { userId } = userSchemas.deactivateUser.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      await oktaClient.userApi.deactivateUser({
        userId,
      });

      return {
        content: [
          {
            type: "text",
            text: `User with ID ${userId} has been deactivated.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error deactivating user:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to deactivate user: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  delete_user: async (request: { parameters: unknown }) => {
    const { userId } = userSchemas.deleteUser.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      await oktaClient.userApi.deleteUser({
        userId,
      });

      return {
        content: [
          {
            type: "text",
            text: `User with ID ${userId} has been permanently deleted.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error deleting user:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete user: ${error instanceof Error ? error.message : String(error)}. Note: Users must be deactivated before they can be deleted.`,
          },
        ],
        isError: true,
      };
    }
  },

  find_users_by_attribute: async (request: { parameters: unknown }) => {
    const { attribute, value, operator, limit, includeInactive } =
      userSchemas.getUserByAttribute.parse(request.parameters);

    try {
      const oktaClient = getOktaClient();

      // Strategy 1: Try formatted search query first (much faster and more accurate)
      let users;
      let searchMethod = "";

      try {
        // Construct proper search query based on attribute and operator
        let searchQuery;

        if (operator === "pr") {
          searchQuery = `profile.${attribute} pr`;
        } else {
          searchQuery = `profile.${attribute} ${operator} "${value}"`;
        }

        const searchParams = {
          search: searchQuery,
          limit: limit || 50,
        };

        users = await oktaClient.userApi.listUsers(searchParams);
        searchMethod = "formatted search";
      } catch (searchError) {
        // Check if it's an unsupported operator error
        const errorMessage =
          searchError instanceof Error
            ? searchError.message
            : String(searchError);

        if (errorMessage.includes("operator is not supported")) {
          // Strategy 2: Try free-text search (works for some attributes)
          try {
            const freeTextParams = {
              search: value,
              limit: limit || 50,
            };

            users = await oktaClient.userApi.listUsers(freeTextParams);
            searchMethod = "free-text search";
          } catch (freeTextError) {
            // Strategy 3: Fall back to client-side filtering
            const basicParams = {
              limit: 200,
            };

            users = await oktaClient.userApi.listUsers(basicParams);
            searchMethod = "client-side filtering (limited to 200 users)";
          }
        } else {
          // For other errors, go straight to client-side filtering
          const basicParams = {
            limit: 200,
          };

          users = await oktaClient.userApi.listUsers(basicParams);
          searchMethod = "client-side filtering (limited to 200 users)";
        }
      }

      if (!users) {
        return {
          content: [
            {
              type: "text",
              text: "No users data returned from Okta.",
            },
          ],
        };
      }

      // Collect users and apply filtering
      const candidateUsers: any[] = [];
      for await (const user of users) {
        if (!user?.id) continue;
        candidateUsers.push(user);
      }

      // Apply filtering based on search method
      const matchingUsers: any[] = [];

      if (searchMethod === "formatted search") {
        // For formatted search, the results should already be filtered by Okta
        // We just need to apply status filtering and get full user details
        for (const user of candidateUsers) {
          try {
            const fullUser = await oktaClient.userApi.getUser({
              userId: user.id,
            });

            if (!fullUser?.profile) continue;

            // Apply status filter
            if (!includeInactive && fullUser.status !== "ACTIVE") continue;

            matchingUsers.push(fullUser);
          } catch (userError) {
            // Silent error handling - just skip this user
            continue;
          }
        }
      } else {
        // For free-text search and client-side filtering, we need to verify the attribute match
        for (const user of candidateUsers) {
          try {
            const fullUser = await oktaClient.userApi.getUser({
              userId: user.id,
            });

            if (!fullUser?.profile) continue;

            // Apply status filter
            if (!includeInactive && fullUser.status !== "ACTIVE") continue;

            // Check if this user actually matches our specific attribute
            const attributeValue =
              fullUser.profile[attribute as keyof typeof fullUser.profile];

            // Handle 'pr' operator (present/exists)
            if (operator === "pr") {
              if (
                attributeValue !== undefined &&
                attributeValue !== null &&
                attributeValue !== ""
              ) {
                matchingUsers.push(fullUser);
              }
              continue;
            }

            // For other operators, value must exist
            if (attributeValue === undefined || attributeValue === null)
              continue;

            const attrValueStr = String(attributeValue).toLowerCase();
            const searchValueStr = value.toLowerCase();

            let isMatch = false;
            switch (operator) {
              case "eq":
                isMatch = attrValueStr === searchValueStr;
                break;
              case "sw":
                isMatch = attrValueStr.startsWith(searchValueStr);
                break;
              case "ew":
                isMatch = attrValueStr.endsWith(searchValueStr);
                break;
              case "co":
                isMatch = attrValueStr.includes(searchValueStr);
                break;
            }

            if (isMatch) {
              matchingUsers.push(fullUser);

              if (matchingUsers.length >= (limit || 50)) {
                break;
              }
            }
          } catch (userError) {
            // Silent error handling - just skip this user
            continue;
          }
        }
      }

      // Build response - mask PII in search value display
      const displayValue = isPIIAttribute(attribute) ? maskValue(value) : value;
      let response = `Search Results for ${attribute} ${operator} "${displayValue}"\n`;
      response += `Method: ${searchMethod}\n`;
      response += `${includeInactive ? "Including" : "Excluding"} inactive users\n\n`;

      if (matchingUsers.length === 0) {
        response += `No users found with ${attribute} matching the specified criteria`;
        if (searchMethod.includes("limited")) {
          response += `\n(Note: Only checked first 200 users for performance)`;
        }
      } else {
        const userList: string[] = [];

        matchingUsers.forEach((user, index) => {
          const actualValue =
            user.profile?.[attribute as keyof typeof user.profile] || "N/A";

          userList.push(`${index + 1}. ${user.profile?.firstName || ""} ${user.profile?.lastName || ""}
   Email: ${user.profile?.email || "No email"}
   ID: ${user.id}
   Status: ${user.status}
   ${attribute}: ${actualValue}
   Department: ${user.profile?.department || "N/A"}
   Title: ${user.profile?.title || "N/A"}
   Last Login: ${formatDate(user.lastLogin)}`);
        });

        response += userList.join("\n\n");
        response += `\n\nTotal found: ${matchingUsers.length} user${matchingUsers.length !== 1 ? "s" : ""}`;

        // Add helpful note about search capabilities
        if (searchMethod === "formatted search") {
          response += `\n\n✅ Note: This search used Okta's native filtering for optimal performance.`;
        } else if (searchMethod.includes("limited")) {
          response += `\n\n⚠️ Note: This search was limited to 200 users for performance. For comprehensive results across all users, consider using more specific search criteria.`;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    } catch (error) {
      console.error("[ERROR] Search failed:", error);
      return {
        content: [
          {
            type: "text",
            text: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },

  get_user_last_location: async (request: { parameters: unknown }) => {
    const { userId } = userSchemas.getUserLastLocation.parse(
      request.parameters
    );

    try {
      const oktaClient = getOktaClient();

      // First get the user to ensure they exist and get their login
      const user = await oktaClient.userApi.getUser({ userId });

      if (!user || !user.profile) {
        return {
          content: [
            {
              type: "text",
              text: `User with ID ${userId} not found.`,
            },
          ],
        };
      }

      // Get the last 90 days of system logs for this user's login events
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Use the system log API to get login events
      const logs = await oktaClient.systemLogApi.listLogEvents({
        since: ninetyDaysAgo.toISOString(),
        filter: `target.id eq "${userId}" and (eventType eq "user.session.start" or eventType eq "user.authentication.auth_via_mfa" or eventType eq "user.authentication.sso")`,
        limit: 1,
      });

      // Get the first (most recent) log entry
      const lastLogin = await logs.next();

      if (!lastLogin || !lastLogin.value) {
        return {
          content: [
            {
              type: "text",
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
            type: "text",
            text: formattedLocation,
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching user location:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch user location: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
