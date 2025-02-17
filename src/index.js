"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var okta_sdk_nodejs_1 = require("@okta/okta-sdk-nodejs");
var zod_1 = require("zod");
// Initiatilize the server
var server = new index_js_1.Server({
    name: "okta-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// And here's the corresponding Zod schema:
var schemas = {
    toolInputs: {
        getUser: zod_1.z.object({
            userId: zod_1.z.string().min(1, "User ID is required"),
        }),
    },
};
var TOOL_DEFINITIONS = [
    {
        name: "get_user",
        description: "Retrieve detailed user information from Okta by user ID, including profile, account status, dates, employment details, and contact information",
        inputSchema: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The unique identifier of the Okta user",
                },
                expand: {
                    type: "string",
                    description: "Optional parameter to include additional metadata. Possible value: 'blocks'",
                    optional: true,
                },
            },
            required: ["userId"],
        },
    },
];
var toolHandlers = {
    get_user: function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, oktaClient, params, user, formattedUser, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userId = schemas.toolInputs.getUser.parse(args).userId;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        oktaClient = new okta_sdk_nodejs_1.Client({
                            orgUrl: process.env.OKTA_ORG_URL,
                            token: process.env.OKTA_API_TOKEN,
                        });
                        params = {
                            userId: userId,
                        };
                        return [4 /*yield*/, oktaClient.userApi.getUser(params)];
                    case 2:
                        user = _a.sent();
                        formattedUser = "\u2022 User Details:\n    ID: ".concat(user.id, "\n    Status: ").concat(user.status, "\n  \n  - Account Dates:\n    Created: ").concat(user.created, "\n    Activated: ").concat(user.activated, "\n    Last Login: ").concat(user.lastLogin, "\n    Last Updated: ").concat(user.lastUpdated, "\n    Status Changed: ").concat(user.statusChanged, "\n    Password Changed: ").concat(user.passwordChanged, "\n  \n  - Personal Information:\n    Login: ").concat(user.profile.login, "\n    Email: ").concat(user.profile.email, "\n    Secondary Email: ").concat(user.profile.secondEmail || "N/A", "\n    First Name: ").concat(user.profile.firstName, "\n    Last Name: ").concat(user.profile.lastName, "\n    Display Name: ").concat(user.profile.displayName, "\n    Nickname: ").concat(user.profile.nickName || "N/A", "\n  \n  - Employment Details:\n    Organization: ").concat(user.profile.organization, "\n    Title: ").concat(user.profile.title, "\n    Division: ").concat(user.profile.division, "\n    Department: ").concat(user.profile.department, "\n    Employee Number: ").concat(user.profile.employeeNumber, "\n    User Type: ").concat(user.profile.userType, "\n    Cost Center: ").concat(user.profile.costCenter, "\n  \n  - Contact Information:\n    Mobile Phone: ").concat(user.profile.mobilePhone || "N/A", "\n    Primary Phone: ").concat(user.profile.primaryPhone || "N/A", "\n    \n  - Address:\n    Street: ").concat(user.profile.streetAddress, "\n    City: ").concat(user.profile.city, "\n    State: ").concat(user.profile.state, "\n    Zip Code: ").concat(user.profile.zipCode, "\n    Country: ").concat(user.profile.countryCode, "\n  \n  - Preferences:\n    Preferred Language: ").concat(user.profile.preferredLanguage, "\n    Profile URL: ").concat(user.profile.profileUrl || "N/A");
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: "text",
                                        text: formattedUser,
                                    },
                                ],
                            }];
                    case 3:
                        error_1 = _a.sent();
                        if (error_1.status === 404) {
                            return [2 /*return*/, {
                                    content: [
                                        {
                                            type: "text",
                                            text: "User with ID ".concat(userId, " not found."),
                                        },
                                    ],
                                }];
                        }
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
};
// Register tool handlers
server.setRequestHandler(types_js_1.ListToolsRequestSchema, function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.error("Tools requested by client");
        return [2 /*return*/, { tools: TOOL_DEFINITIONS }];
    });
}); });
server.setRequestHandler(types_js_1.ListToolsRequestSchema, function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.error("Tools requested by client");
        console.error("Returning tools:", JSON.stringify(TOOL_DEFINITIONS, null, 2));
        return [2 /*return*/, { tools: TOOL_DEFINITIONS }];
    });
}); });
server.setRequestHandler(types_js_1.CallToolRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, args, handler, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.params, name = _a.name, args = _a.arguments;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                handler = toolHandlers[name];
                if (!handler) {
                    throw new Error("Unknown tool: ".concat(name));
                }
                return [4 /*yield*/, handler(args)];
            case 2: return [2 /*return*/, _b.sent()];
            case 3:
                error_2 = _b.sent();
                console.error("Error executing tool ".concat(name, ":"), error_2);
                throw error_2;
            case 4: return [2 /*return*/];
        }
    });
}); });
// Start the server
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var requiredEnvVars, missingVars, transport, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    requiredEnvVars = [];
                    missingVars = requiredEnvVars.filter(function (varName) { return !process.env[varName]; });
                    if (missingVars.length > 0) {
                        console.error("Missing required environment variables: ".concat(missingVars.join(", ")));
                        process.exit(1);
                    }
                    console.error("Starting server with env vars:", {});
                    transport = new stdio_js_1.StdioServerTransport();
                    console.error("Created transport");
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error("Connected to transport");
                    console.error("Okta MCP Server running on stdio");
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error("Startup error:", error_3);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("Fatal error:", error);
    process.exit(1);
});
