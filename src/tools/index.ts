import { userTools, userHandlers } from "./users.js";
import { groupTools, groupHandlers } from "./groups.js";
import { onboardingTools, onboardingHandlers } from "./onboarding.js";

// Combine all tools from different modules
export const TOOLS = [...userTools, ...groupTools, ...onboardingTools];

// Combine all handlers from different modules
export const HANDLERS = {
  ...userHandlers,
  ...groupHandlers,
  ...onboardingHandlers,
};
