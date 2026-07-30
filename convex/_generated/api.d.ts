/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminShop from "../adminShop.js";
import type * as audit from "../audit.js";
import type * as authz from "../authz.js";
import type * as billing from "../billing.js";
import type * as cards from "../cards.js";
import type * as checkout from "../checkout.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as leads from "../leads.js";
import type * as maintenance from "../maintenance.js";
import type * as notifications from "../notifications.js";
import type * as payrex from "../payrex.js";
import type * as plans from "../plans.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as rateLimit from "../rateLimit.js";
import type * as settings from "../settings.js";
import type * as shop from "../shop.js";
import type * as teams from "../teams.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminShop: typeof adminShop;
  audit: typeof audit;
  authz: typeof authz;
  billing: typeof billing;
  cards: typeof cards;
  checkout: typeof checkout;
  crons: typeof crons;
  email: typeof email;
  http: typeof http;
  images: typeof images;
  leads: typeof leads;
  maintenance: typeof maintenance;
  notifications: typeof notifications;
  payrex: typeof payrex;
  plans: typeof plans;
  profiles: typeof profiles;
  projects: typeof projects;
  rateLimit: typeof rateLimit;
  settings: typeof settings;
  shop: typeof shop;
  teams: typeof teams;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
