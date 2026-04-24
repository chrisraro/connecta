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
import type * as cards from "../cards.js";
import type * as checkout from "../checkout.js";
import type * as email from "../email.js";
import type * as images from "../images.js";
import type * as leads from "../leads.js";
import type * as notifications from "../notifications.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as shop from "../shop.js";
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
  cards: typeof cards;
  checkout: typeof checkout;
  email: typeof email;
  images: typeof images;
  leads: typeof leads;
  notifications: typeof notifications;
  profiles: typeof profiles;
  projects: typeof projects;
  shop: typeof shop;
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
