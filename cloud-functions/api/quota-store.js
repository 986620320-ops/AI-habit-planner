import { getStore } from '@edgeone/pages-blob';

export function installBlobQuotaStore() {
  try {
    const store = getStore('ai-habit-quota');
    globalThis.__HABIT_QUOTA_STORE__ = {
      mode: 'blob',
      async list(prefix) {
        const result = await store.list({ prefix, consistency: 'strong', paginate: false });
        return (result && Array.isArray(result.blobs) ? result.blobs : []).map(function (item) { return item.key; });
      },
      async set(key, value) {
        await store.setJSON(key, value);
      },
      async delete(key) {
        await store.delete(key);
      }
    };
    return true;
  } catch (error) {
    console.warn('Blob quota store unavailable, falling back to memory:', error && error.message ? error.message : error);
    delete globalThis.__HABIT_QUOTA_STORE__;
    return false;
  }
}
