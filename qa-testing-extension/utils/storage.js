// Storage manager utility
export class StorageManager {
  constructor() {
    this.storageType = 'local'; // Use local storage for persistence
  }

  async get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage[this.storageType].get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  async set(data) {
    return new Promise((resolve, reject) => {
      chrome.storage[this.storageType].set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage[this.storageType].remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage[this.storageType].clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Store test results
  async saveTestResults(testId, results) {
    const key = `test_${testId}`;
    const data = {
      [key]: {
        ...results,
        savedAt: Date.now()
      }
    };
    
    await this.set(data);
    
    // Clean up old results (keep only last 10)
    await this.cleanupOldResults();
  }

  // Get test results
  async getTestResults(testId) {
    const key = `test_${testId}`;
    const result = await this.get(key);
    return result[key];
  }

  // Get all test results
  async getAllTestResults() {
    const allData = await this.get(null);
    const testResults = {};
    
    Object.keys(allData).forEach(key => {
      if (key.startsWith('test_')) {
        testResults[key] = allData[key];
      }
    });
    
    return testResults;
  }

  // Clean up old test results
  async cleanupOldResults() {
    const allResults = await this.getAllTestResults();
    const sortedKeys = Object.keys(allResults).sort((a, b) => {
      return (allResults[b].savedAt || 0) - (allResults[a].savedAt || 0);
    });
    
    // Keep only the 10 most recent results
    if (sortedKeys.length > 10) {
      const keysToRemove = sortedKeys.slice(10);
      await this.remove(keysToRemove);
    }
  }

  // Settings management
  async saveSettings(settings) {
    await this.set({ settings: settings });
  }

  async getSettings() {
    const result = await this.get('settings');
    return result.settings || {};
  }

  // API key management (encrypted)
  async saveApiKey(apiKey) {
    // In production, you should encrypt the API key
    const encryptedKey = this.simpleEncrypt(apiKey);
    await this.set({ apiKey: encryptedKey });
  }

  async getApiKey() {
    const result = await this.get('apiKey');
    if (result.apiKey) {
      return this.simpleDecrypt(result.apiKey);
    }
    return null;
  }

  // Simple obfuscation (not secure encryption - use proper encryption in production)
  simpleEncrypt(text) {
    return btoa(text).split('').reverse().join('');
  }

  simpleDecrypt(text) {
    return atob(text.split('').reverse().join(''));
  }

  // Session storage for temporary data
  async setSession(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.session.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async getSession(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.session.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  // Export/Import functionality
  async exportData() {
    const allData = await this.get(null);
    return JSON.stringify(allData, null, 2);
  }

  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      await this.set(data);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  // Usage statistics
  async trackUsage(action, details = {}) {
    const stats = await this.getUsageStats();
    
    if (!stats[action]) {
      stats[action] = {
        count: 0,
        lastUsed: null,
        details: []
      };
    }
    
    stats[action].count++;
    stats[action].lastUsed = Date.now();
    
    // Keep only last 10 detail entries
    stats[action].details.unshift({
      timestamp: Date.now(),
      ...details
    });
    stats[action].details = stats[action].details.slice(0, 10);
    
    await this.set({ usageStats: stats });
  }

  async getUsageStats() {
    const result = await this.get('usageStats');
    return result.usageStats || {};
  }

  // Get storage size info
  async getStorageInfo() {
    return new Promise((resolve) => {
      if (chrome.storage[this.storageType].getBytesInUse) {
        chrome.storage[this.storageType].getBytesInUse(null, (bytesInUse) => {
          const maxBytes = chrome.storage[this.storageType].QUOTA_BYTES || 5242880; // 5MB default
          resolve({
            used: bytesInUse,
            total: maxBytes,
            percentage: Math.round((bytesInUse / maxBytes) * 100)
          });
        });
      } else {
        resolve({
          used: 0,
          total: 5242880,
          percentage: 0
        });
      }
    });
  }
}