/**
 * Asset base path helper.
 *
 * All runtime fetches of files under public/ MUST go through assetUrl().
 * Vite serves public/ at import.meta.env.BASE_URL.
 *
 * Usage:
 *   import { assetUrl } from "./asset-base";
 *   loader.loadAsync(assetUrl("models/RobotExpressive.glb"));
 */

export const ASSET_BASE: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
  "/";

/** Prefix a public/ asset path (e.g. "models/X.glb") with the deploy base. */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return ASSET_BASE.endsWith("/") ? `${ASSET_BASE}${clean}` : `${ASSET_BASE}/${clean}`;
}
