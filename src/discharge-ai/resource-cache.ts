/**
 * AfterCare Discharge AI - Resource Cache
 *
 * Plain in-memory store bridging Tools -> Resources, matching the plain-const-
 * export style used throughout tools.ts (no DI container is used in this
 * project, so this is a simple module-level singleton rather than an
 * @Injectable service).
 *
 * Each tool's handler, after computing its result, should call
 * `resourceCache.set(CACHE_KEYS.X, result)` right before returning. See the
 * "integration step" note in resources.ts / RESOURCES_README.md for the
 * exact one-line addition needed per tool.
 */

class ResourceCache {
  private readonly store = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  clear(key: string): void {
    this.store.delete(key);
  }
}

/** Module-level singleton — imported by both tools.ts (to write) and resources.ts (to read). */
export const resourceCache = new ResourceCache();

/**
 * Cache key constants, one per tool that has a corresponding resource.
 * Names match the real return types in schemas.ts / tools.ts.
 */
export const CACHE_KEYS = {
  DISCHARGE_SUMMARY: 'discharge:summary:latest',
  RECOVERY_TIMELINE: 'discharge:recovery-timeline:latest',
  GROCERY_CART: 'discharge:grocery-cart:latest',
  CARE_SERVICE_PAYLOADS: 'discharge:care-services:latest',
  SYMPTOM_EVALUATION: 'discharge:symptom-evaluation:latest',
} as const;
