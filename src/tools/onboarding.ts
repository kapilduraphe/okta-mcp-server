import { z } from "zod";
import pkg from "@okta/okta-sdk-nodejs";
const { Client: OktaClient } = pkg;
import Papa from "papaparse";

// Schemas for input validation
const onboardingSchemas = {
  bulkUserImport: z.object({
    csvData: z.string().min(1, "CSV data is required"),
    activateUsers: z.boolean().optional().default(false),
    sendEmail: z.boolean().optional().default(true),
    defaultGroups: z.array(z.string()).optional().default([]),
  }),

  assignUsersToGroups: z.object({
    userIds: z.array(z.string().min(1, "User ID is required")),
    attributeMapping: z.record(z.record(z.string())).describe(
      "Mapping of user attributes to group IDs (e.g., {\"department\": {\"Engineering\": \"group1Id\"}})"
    ),
  }),

  provisionApplications: z.object({
    userIds: z.array(z.string().min(1, "User ID is required")),
    applicationIds: z.array(z.string().min(1, "Application ID is required")),
  }),

  runOnboardingWorkflow: z.object({
    csvData: z.string().min(1, "CSV data is required"),
    activateUsers: z.boolean().optional().default(true),
    defaultGroups: z.array(z.string()).optional().default([]),
    groupMappings: z.record(z.record(z.string())).optional().default({}),
    applicationIds: z.array(z.string()).optional().default([]),
    sendWelcomeEmail: z.boolean().optional().default(true),
  }),
};

// Utility function to get Okta client (reusing the same function as in your other files)
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

// Tool definitions for onboarding automation
export const onboardingTools = [
  {
    name: "bulk_user_import",
    description: "Import multiple users from a CSV string",
    inputSchema: {
      type: "object",
      properties: {
        csvData: {
          type: "string",
          description: "CSV string with user information (header row required)"
        },
        activateUsers: {
          type: "boolean",
          description: "Whether to activate users immediately (default: false)",
          default: false
        },
        sendEmail: {
          type: "boolean",
          description: "Whether to send activation emails (default: true)",
          default: true
        },
        defaultGroups: {
          type: "array",
          items: { type: "string" },
          description: "Default group IDs to assign all imported users to",
          default: []
        }
      },
      required: ["csvData"]
    },
  },
  {
    name: "assign_users_to_groups",
    description: "Assign multiple users to groups based on attributes",
    inputSchema: {
      type: "object",
      properties: {
        userIds: {
          type: "array",
          items: { type: "string" },
          description: "List of user IDs to assign"
        },
        attributeMapping: {
          type: "object",
          description: "Mapping of user attributes to group IDs (e.g., {\"department\": {\"Engineering\": \"group1Id\", \"Sales\": \"group2Id\"}})"
        }
      },
      required: ["userIds", "attributeMapping"]
    },
  },
  {
    name: "provision_applications",
    description: "Provision application access for multiple users",
    inputSchema: {
      type: "object",
      properties: {
        userIds: {
          type: "array",
          items: { type: "string" },
          description: "List of user IDs to provision access for"
        },
        applicationIds: {
          type: "array",
          items: { type: "string" },
          description: "Application IDs to provision"
        }
      },
      required: ["userIds", "applicationIds"]
    },
  },
  {
    name: "run_onboarding_workflow",
    description: "Run a complete onboarding workflow for multiple users from CSV data",
    inputSchema: {
      type: "object",
      properties: {
        csvData: {
          type: "string",
          description: "CSV string with user information"
        },
        activateUsers: {
          type: "boolean",
          description: "Whether to activate users immediately (default: true)",
          default: true
        },
        defaultGroups: {
          type: "array",
          items: { type: "string" },
          description: "Default group IDs to assign all users to",
          default: []
        },
        groupMappings: {
          type: "object", 
          description: "Mapping of user attributes to group IDs (e.g., {\"department\": {\"Engineering\": \"group1Id\"}})",
          default: {}
        },
        applicationIds: {
          type: "array",
          items: { type: "string" },
          description: "Application IDs to provision for all users",
          default: []
        },
        sendWelcomeEmail: {
          type: "boolean",
          description: "Whether to send welcome emails (default: true)",
          default: true
        }
      },
      required: ["csvData"]
    },
  }
];

// Handlers for onboarding tools
export const onboardingHandlers = {
  bulk_user_import: async (request: { parameters: unknown }) => {
    const { csvData, activateUsers, sendEmail, defaultGroups } = 
      onboardingSchemas.bulkUserImport.parse(request.parameters);
    
    try {
      const oktaClient = getOktaClient();
      
      // Parse CSV data
      const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const users = parsedData.data;
      
      if (!Array.isArray(users) || users.length === 0) {
        return {
          content: [{ type: 'text', text: 'No valid users found in CSV data.' }],
          isError: true
        };
      }
      
      // Process each user
      const results = {
        success: [] as any[],
        failed: [] as any[]
      };
      
      for (const userData of users as any[]) {
        try {
          // Basic validation
          if (!userData.email || !userData.firstName || !userData.lastName) {
            results.failed.push({
              email: userData.email || 'Missing email',
              reason: 'Missing required fields (email, firstName, or lastName)'
            });
            continue;
          }
          
          // Create user object with profile data
          const newUser = {
            profile: {
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              login: userData.email,
              // Add any additional profile fields from CSV
              ...(userData.department && { department: userData.department }),
              ...(userData.title && { title: userData.title }),
              ...(userData.mobilePhone && { mobilePhone: userData.mobilePhone })
            }
          };
          
          // Create the user in Okta
          const createdUser = await oktaClient.userApi.createUser({
            body: newUser
          });
          
          // Activate if requested
          if (activateUsers && createdUser.id) {
            await oktaClient.userApi.activateUser({
              userId: createdUser.id,
              sendEmail: sendEmail
            });
          }
          
          // Assign to default groups if provided
          if (defaultGroups.length > 0 && createdUser.id) {
            for (const groupId of defaultGroups) {
              await oktaClient.groupApi.assignUserToGroup({
                groupId,
                userId: createdUser.id
              });
            }
          }
          
          results.success.push({
            id: createdUser.id,
            email: userData.email,
            status: activateUsers ? 'ACTIVE' : 'STAGED'
          });
        } catch (error) {
          results.failed.push({
            email: userData.email || 'Unknown',
            reason: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Format response
      const summary = `Processed ${users.length} users from CSV data:
- Successfully created: ${results.success.length}
- Failed: ${results.failed.length}

${results.success.length > 0 ? `• Successfully created users:
${results.success.map((user, i) => `${i+1}. ${user.email} (ID: ${user.id}, Status: ${user.status})`).join('\n')}` : ''}

${results.failed.length > 0 ? `• Failed users:
${results.failed.map((user, i) => `${i+1}. ${user.email} - ${user.reason}`).join('\n')}` : ''}`;
      
      return {
        content: [{ type: 'text', text: summary }],
        data: results
      };
    } catch (error) {
      console.error("Error during bulk user import:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to import users: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  
  assign_users_to_groups: async (request: { parameters: unknown }) => {
    const { userIds, attributeMapping } = 
      onboardingSchemas.assignUsersToGroups.parse(request.parameters);
    
    try {
      const oktaClient = getOktaClient();
      
      const results = {
        success: [] as any[],
        failed: [] as any[]
      };
      
      // Process each user
      for (const userId of userIds) {
        try {
          // Get user details to access attributes
          const user = await oktaClient.userApi.getUser({ userId });
          
          if (!user || !user.profile) {
            results.failed.push({
              userId: userId,
              reason: 'User not found or profile unavailable'
            });
            continue;
          }
          
          // Determine which groups to assign based on user attributes
          const groupsToAssign = new Set<string>();
          
          // Process attribute mapping
          for (const [attribute, valueMapping] of Object.entries(attributeMapping)) {
            const userAttributeValue = user.profile[attribute as keyof typeof user.profile];
            if (userAttributeValue && valueMapping[userAttributeValue as string]) {
              groupsToAssign.add(valueMapping[userAttributeValue as string]);
            }
          }
          
          // Skip if no groups matched
          if (groupsToAssign.size === 0) {
            results.success.push({
              id: userId,
              email: user.profile.email,
              assignedGroups: [],
              message: 'No group mappings matched user attributes'
            });
            continue;
          }
          
          // Assign user to each mapped group
          const assignedGroups = [];
          for (const groupId of groupsToAssign) {
            await oktaClient.groupApi.assignUserToGroup({
              groupId,
              userId
            });
            assignedGroups.push(groupId);
          }
          
          results.success.push({
            userId: userId,
            email: user.profile.email,
            assignedGroups
          });
        } catch (error) {
          results.failed.push({
            id: userId,
            reason: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Format response
      const summary = `Processed group assignments for ${userIds.length} users:
- Successful assignments: ${results.success.length}
- Failed assignments: ${results.failed.length}

${results.success.length > 0 ? `• Successfully assigned users:
${results.success.map((user, i) => {
  const groupsInfo = user.assignedGroups.length > 0 
    ? `assigned to ${user.assignedGroups.length} groups`
    : user.message || 'no matching groups';
  return `${i+1}. ${user.email || user.userId} (${groupsInfo})`;
}).join('\n')}` : ''}

${results.failed.length > 0 ? `• Failed assignments:
${results.failed.map((user, i) => `${i+1}. User ID: ${user.userId} - ${user.reason}`).join('\n')}` : ''}`;
      
      return {
        content: [{ type: 'text', text: summary }],
        data: results
      };
    } catch (error) {
      console.error("Error during group assignment:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to assign users to groups: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  
  provision_applications: async (request: { parameters: unknown }) => {
    const { userIds, applicationIds } = 
      onboardingSchemas.provisionApplications.parse(request.parameters);
    
    try {
      const oktaClient = getOktaClient();
      
      const results = {
        success: [] as any[],
        failed: [] as any[]
      };
      
      // Process each user
      for (const userId of userIds) {
        try {
          // Get user details
          const user = await oktaClient.userApi.getUser({ userId });
          
          if (!user || !user.profile) {
            results.failed.push({
              userId,
              reason: 'User not found or profile unavailable'
            });
            continue;
          }
          
          const userResults = {
            userId,
            email: user.profile.email,
            applications: [] as any[]
          };
          
          let hasFailure = false;
          
          // Assign each application
          for (const appId of applicationIds) {
            try {
              // Assign user to application
              await oktaClient.applicationApi.assignUserToApplication({
                appId,
                appUser: {
                  id: userId
                }
              });
              
              userResults.applications.push({
                appId,
                status: 'assigned'
              });
            } catch (error) {
              hasFailure = true;
              userResults.applications.push({
                appId,
                status: 'failed',
                reason: error instanceof Error ? error.message : String(error)
              });
            }
          }
          
          if (hasFailure) {
            results.failed.push(userResults);
          } else {
            results.success.push(userResults);
          }
        } catch (error) {
          results.failed.push({
            userId,
            reason: error instanceof Error ? error.message : String(error),
            applications: []
          });
        }
      }
      
      // Format response
      const summary = `Processed application provisioning for ${userIds.length} users across ${applicationIds.length} applications:
- Successful provisioning: ${results.success.length} users
- Failed provisioning: ${results.failed.length} users

${results.success.length > 0 ? `• Successfully provisioned users:
${results.success.map((user, i) => 
  `${i+1}. ${user.email || user.userId} (provisioned ${user.applications.length} applications)`
).join('\n')}` : ''}

${results.failed.length > 0 ? `• Failed provisioning:
${results.failed.map((user, i) => {
  const failedApps = user.applications.filter((app: { status: string; }) => app.status === 'failed').length;
  return `${i+1}. ${user.email || user.userId} - ${user.reason || `${failedApps} applications failed`}`;
}).join('\n')}` : ''}`;
      
      return {
        content: [{ type: 'text', text: summary }],
        data: results
      };
    } catch (error) {
      console.error("Error during application provisioning:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to provision applications: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  
  run_onboarding_workflow: async (request: { parameters: unknown }) => {
    const {
      csvData,
      activateUsers,
      defaultGroups,
      groupMappings,
      applicationIds,
      sendWelcomeEmail
    } = onboardingSchemas.runOnboardingWorkflow.parse(request.parameters);
    
    try {
      // Step 1: Import users
      const importResults = await onboardingHandlers.bulk_user_import({
        parameters: {
          csvData,
          activateUsers,
          sendEmail: sendWelcomeEmail,
          defaultGroups
        }
      });
      
      if (!importResults.data || !importResults.data.success || importResults.data.success.length === 0) {
        return {
          content: [{ type: 'text', text: 'No users were successfully created during the onboarding workflow.' }],
          data: { userImport: importResults.data }
        };
      }
      
      const createdUserIds = importResults.data.success.map((user: any) => user.id);
      
      // Step 2: Assign to groups based on attributes (if mappings provided)
      let groupResults: any = { data: { success: [], failed: [] } };
      if (Object.keys(groupMappings).length > 0) {
        groupResults = await onboardingHandlers.assign_users_to_groups({
          parameters: {
            userIds: createdUserIds,
            attributeMapping: groupMappings
          }
        });
      }
      
      // Step 3: Provision applications (if any provided)
      let appResults: any = { data: { success: [], failed: [] } };
      if (applicationIds.length > 0) {
        appResults = await onboardingHandlers.provision_applications({
          parameters: {
            userIds: createdUserIds,
            applicationIds
          }
        });
      }
      
      // Compile workflow results
      const workflow = {
        userImport: importResults.data,
        groupAssignment: groupResults.data,
        applicationProvisioning: appResults.data,
        summary: {
          totalProcessed: importResults.data.success.length + importResults.data.failed.length,
          successfullyOnboarded: importResults.data.success.length,
          failedUsers: importResults.data.failed.length,
          groupsAssigned: groupResults.data.success.length,
          applicationsProvisioned: appResults.data.success.length
        }
      };
      
      // Format response with detailed summary
      const summary = `Onboarding Workflow Complete:

- User Import:
  - Processed ${workflow.summary.totalProcessed} users
  - Successfully created: ${workflow.summary.successfullyOnboarded}
  - Failed: ${workflow.summary.failedUsers}

${Object.keys(groupMappings).length > 0 ? `• Group Assignment:
  - Users assigned to groups: ${workflow.groupAssignment.success.length}
  - Failed group assignments: ${workflow.groupAssignment.failed.length}` : '• Group Assignment: Not configured'}

${applicationIds.length > 0 ? `• Application Provisioning:
  - Users provisioned with applications: ${workflow.applicationProvisioning.success.length}
  - Failed application provisioning: ${workflow.applicationProvisioning.failed.length}` : '• Application Provisioning: Not configured'}

Overall, successfully onboarded ${workflow.summary.successfullyOnboarded} out of ${workflow.summary.totalProcessed} users with ${Object.keys(groupMappings).length > 0 ? 'attribute-based group assignment' : 'default groups only'} and ${applicationIds.length > 0 ? 'application provisioning' : 'no application provisioning'}.`;
      
      return {
        content: [{ type: 'text', text: summary }],
        data: workflow
      };
    } catch (error) {
      console.error("Error during onboarding workflow:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to complete onboarding workflow: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
};