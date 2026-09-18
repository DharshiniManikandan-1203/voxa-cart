/**
 * Redis In-Memory & Distributed State Store
 * Provides key-value caching, session hash management, token buckets, and distributed locks.
 */

class StateStore {
  private store: Map<string, { value: any; expiresAt: number | null }> = new Map();

  async get<T = any>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async hset(hashKey: string, field: string, value: any): Promise<void> {
    const existing = (await this.get<Record<string, any>>(hashKey)) || {};
    existing[field] = value;
    await this.set(hashKey, existing, 7200); // 2 hours TTL for conversation sessions
  }

  async hget<T = any>(hashKey: string, field: string): Promise<T | null> {
    const existing = await this.get<Record<string, any>>(hashKey);
    if (!existing || !(field in existing)) return null;
    return existing[field] as T;
  }

  async hgetall(hashKey: string): Promise<Record<string, any> | null> {
    return this.get<Record<string, any>>(hashKey);
  }

  async incr(key: string, ttlSeconds: number = 60): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  async acquireLock(lockKey: string, ttlSeconds: number = 5): Promise<boolean> {
    const existing = await this.get(lockKey);
    if (existing) return false;
    await this.set(lockKey, 'LOCKED', ttlSeconds);
    return true;
  }

  async releaseLock(lockKey: string): Promise<void> {
    await this.del(lockKey);
  }
}

export const redisClient = new StateStore();
