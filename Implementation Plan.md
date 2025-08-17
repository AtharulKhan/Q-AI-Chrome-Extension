# Chrome Extension for Website QA Testing - Complete Implementation Guide

## Overview
This Chrome extension will perform comprehensive website testing including visual captures, technical validation, and AI-powered analysis using OpenRouter. The extension will test multiple URLs, capture full-page screenshots, run various quality checks, and generate AI-powered reports.

## Extension Architecture

### File Structure
```
qa-testing-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── background.js
├── content/
│   └── content.js
├── lib/
│   ├── lighthouse.js
│   ├── accessibility.js
│   ├── seo-checker.js
│   ├── link-checker.js
│   └── openrouter.js
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── options/
    ├── options.html
    ├── options.css
    └── options.js
```

## 1. Manifest Configuration

**File: `manifest.json`**
```json
{
  "manifest_version": 3,
  "name": "Website QA Testing Suite",
  "version": "1.0.0",
  "description": "Comprehensive website testing with AI-powered analysis",
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "scripting",
    "webNavigation",
    "background",
    "declarativeContent",
    "offscreen"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "QA Testing Suite",
    "default_icon": {
      "16": "assets/icon16.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    }
  },
  "options_page": "options/options.html",
  "web_accessible_resources": [
    {
      "resources": ["lib/*.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## 2. Main Popup Interface

**File: `popup/popup.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Website QA Testing Suite</h1>
    
    <div class="section">
      <h3>URLs to Test</h3>
      <textarea id="urlList" placeholder="Enter URLs (one per line)&#10;https://example.com&#10;https://example.com/about"></textarea>
      <div class="url-count">URLs: <span id="urlCount">0</span></div>
    </div>

    <div class="section">
      <h3>Test Configuration</h3>
      <div class="checkbox-group">
        <label><input type="checkbox" id="fullScreenshots" checked> Full-page Screenshots</label>
        <label><input type="checkbox" id="brokenLinks" checked> Broken Link Detection</label>
        <label><input type="checkbox" id="stagingUrls" checked> Staging URL Detection</label>
        <label><input type="checkbox" id="spacingValidation" checked> Layout/Spacing Validation</label>
        <label><input type="checkbox" id="accessibility" checked> AODA Accessibility Check</label>
        <label><input type="checkbox" id="mobileTablet" checked> Mobile/Tablet Testing</label>
        <label><input type="checkbox" id="lighthouse" checked> Lighthouse Performance</label>
        <label><input type="checkbox" id="seoCheck" checked> SEO Analysis</label>
      </div>
    </div>

    <div class="section">
      <h3>AI Analysis</h3>
      <label><input type="checkbox" id="aiAnalysis" checked> Generate AI Report</label>
      <div class="ai-config">
        <label>OpenRouter API Key:</label>
        <input type="password" id="apiKey" placeholder="Your OpenRouter API key">
        <small>Stored locally for this session</small>
      </div>
    </div>

    <div class="controls">
      <button id="startTest" class="primary">Start Testing</button>
      <button id="stopTest" class="secondary" disabled>Stop</button>
    </div>

    <div id="progress" class="progress-section" style="display: none;">
      <div class="progress-bar">
        <div id="progressFill"></div>
      </div>
      <div id="progressText">Initializing...</div>
      <div id="currentUrl"></div>
    </div>

    <div id="results" class="results-section" style="display: none;">
      <h3>Test Results</h3>
      <div class="results-summary">
        <div class="stat">
          <span class="label">URLs Tested:</span>
          <span id="urlsTested">0</span>
        </div>
        <div class="stat">
          <span class="label">Issues Found:</span>
          <span id="issuesFound">0</span>
        </div>
        <div class="stat">
          <span class="label">Screenshots:</span>
          <span id="screenshotCount">0</span>
        </div>
      </div>
      <button id="viewReport" class="primary">View Full Report</button>
      <button id="exportResults" class="secondary">Export Results</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

**File: `popup/popup.css`**
```css
body {
  width: 400px;
  min-height: 500px;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  background: #f8f9fa;
}

.container {
  padding: 20px;
}

h1 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #2c3e50;
  text-align: center;
}

h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #34495e;
}

.section {
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

#urlList {
  width: 100%;
  height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  resize: vertical;
  box-sizing: border-box;
}

.url-count {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.checkbox-group {
  display: grid;
  gap: 8px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-group input[type="checkbox"] {
  margin-right: 8px;
}

.ai-config {
  margin-top: 10px;
}

.ai-config label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 500;
}

.ai-config input {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  box-sizing: border-box;
}

.ai-config small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: #666;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary {
  background: #3498db;
  color: white;
}

.primary:hover:not(:disabled) {
  background: #2980b9;
}

.secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.secondary:hover:not(:disabled) {
  background: #d5dbdb;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

#progressFill {
  height: 100%;
  background: #3498db;
  transition: width 0.3s ease;
  width: 0%;
}

#progressText {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 5px;
}

#currentUrl {
  font-size: 11px;
  color: #666;
  word-break: break-all;
}

.results-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.results-summary {
  display: grid;
  gap: 8px;
  margin-bottom: 15px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.stat .label {
  font-size: 12px;
  color: #666;
}

.stat span:last-child {
  font-weight: 600;
  color: #2c3e50;
}
```

## 3. Popup Logic

**File: `popup/popup.js`**
```javascript
class QATestingPopup {
  constructor() {
    this.isRunning = false;
    this.currentTest = null;
    this.results = {
      urls: [],
      screenshots: [],
      issues: [],
      performance: {},
      accessibility: {},
      seo: {}
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSettings();
    this.updateUrlCount();
  }

  bindEvents() {
    // URL textarea updates
    document.getElementById('urlList').addEventListener('input', () => {
      this.updateUrlCount();
    });

    // Start testing
    document.getElementById('startTest').addEventListener('click', () => {
      this.startTesting();
    });

    // Stop testing
    document.getElementById('stopTest').addEventListener('click', () => {
      this.stopTesting();
    });

    // View report
    document.getElementById('viewReport').addEventListener('click', () => {
      this.openReport();
    });

    // Export results
    document.getElementById('exportResults').addEventListener('click', () => {
      this.exportResults();
    });

    // Save API key
    document.getElementById('apiKey').addEventListener('change', (e) => {
      chrome.storage.session.set({ openrouterApiKey: e.target.value });
    });
  }

  updateUrlCount() {
    const urls = this.getUrls();
    document.getElementById('urlCount').textContent = urls.length;
  }

  getUrls() {
    const text = document.getElementById('urlList').value;
    return text.split('\n')
      .map(url => url.trim())
      .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));
  }

  getTestConfig() {
    return {
      fullScreenshots: document.getElementById('fullScreenshots').checked,
      brokenLinks: document.getElementById('brokenLinks').checked,
      stagingUrls: document.getElementById('stagingUrls').checked,
      spacingValidation: document.getElementById('spacingValidation').checked,
      accessibility: document.getElementById('accessibility').checked,
      mobileTablet: document.getElementById('mobileTablet').checked,
      lighthouse: document.getElementById('lighthouse').checked,
      seoCheck: document.getElementById('seoCheck').checked,
      aiAnalysis: document.getElementById('aiAnalysis').checked
    };
  }

  async startTesting() {
    const urls = this.getUrls();
    if (urls.length === 0) {
      alert('Please enter at least one valid URL');
      return;
    }

    if (urls.length > 50) {
      alert('Maximum 50 URLs allowed per test');
      return;
    }

    const config = this.getTestConfig();
    
    if (config.aiAnalysis) {
      const apiKey = document.getElementById('apiKey').value;
      if (!apiKey) {
        alert('Please enter your OpenRouter API key for AI analysis');
        return;
      }
    }

    this.isRunning = true;
    this.updateUI();
    
    // Reset results
    this.results = {
      urls: [],
      screenshots: [],
      issues: [],
      performance: {},
      accessibility: {},
      seo: {},
      startTime: Date.now()
    };

    try {
      // Start the testing process in background
      const response = await chrome.runtime.sendMessage({
        action: 'startTesting',
        urls: urls,
        config: config
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      this.currentTest = response.testId;
      this.startProgressMonitoring();

    } catch (error) {
      console.error('Failed to start testing:', error);
      alert('Failed to start testing: ' + error.message);
      this.isRunning = false;
      this.updateUI();
    }
  }

  async stopTesting() {
    if (this.currentTest) {
      await chrome.runtime.sendMessage({
        action: 'stopTesting',
        testId: this.currentTest
      });
    }
    
    this.isRunning = false;
    this.currentTest = null;
    this.updateUI();
  }

  startProgressMonitoring() {
    const updateProgress = async () => {
      if (!this.isRunning) return;

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getProgress',
          testId: this.currentTest
        });

        if (response.success) {
          this.updateProgress(response.progress);
          
          if (response.progress.completed) {
            this.onTestingComplete(response.results);
          } else {
            setTimeout(updateProgress, 1000);
          }
        }
      } catch (error) {
        console.error('Progress monitoring error:', error);
      }
    };

    updateProgress();
  }

  updateProgress(progress) {
    const { current, total, currentUrl, status } = progress;
    
    document.getElementById('progressFill').style.width = 
      `${(current / total) * 100}%`;
    
    document.getElementById('progressText').textContent = 
      `${status} (${current}/${total})`;
    
    document.getElementById('currentUrl').textContent = 
      currentUrl || '';
  }

  onTestingComplete(results) {
    this.isRunning = false;
    this.results = results;
    this.updateUI();
    this.updateResultsSummary();
  }

  updateResultsSummary() {
    document.getElementById('urlsTested').textContent = 
      this.results.urls.length;
    
    document.getElementById('issuesFound').textContent = 
      this.results.issues.length;
    
    document.getElementById('screenshotCount').textContent = 
      this.results.screenshots.length;
  }

  updateUI() {
    document.getElementById('startTest').disabled = this.isRunning;
    document.getElementById('stopTest').disabled = !this.isRunning;
    
    document.getElementById('progress').style.display = 
      this.isRunning ? 'block' : 'none';
    
    document.getElementById('results').style.display = 
      (!this.isRunning && this.results.urls.length > 0) ? 'block' : 'none';
  }

  async openReport() {
    // Open results in a new tab
    const url = chrome.runtime.getURL('results/results.html');
    await chrome.tabs.create({ url });
  }

  async exportResults() {
    const blob = new Blob([JSON.stringify(this.results, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.session.get(['openrouterApiKey']);
      if (result.openrouterApiKey) {
        document.getElementById('apiKey').value = result.openrouterApiKey;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new QATestingPopup();
});
```

## 4. Background Service Worker

**File: `background/background.js`**
```javascript
class QATestingBackground {
  constructor() {
    this.activeTests = new Map();
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'startTesting':
          const result = await this.startTesting(request.urls, request.config);
          sendResponse(result);
          break;
        
        case 'stopTesting':
          await this.stopTesting(request.testId);
          sendResponse({ success: true });
          break;
        
        case 'getProgress':
          const progress = this.getProgress(request.testId);
          sendResponse({ success: true, progress });
          break;
        
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background message error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async startTesting(urls, config) {
    const testId = 'test_' + Date.now();
    
    const testInstance = new QATestInstance(testId, urls, config);
    this.activeTests.set(testId, testInstance);
    
    // Start testing asynchronously
    testInstance.start().catch(error => {
      console.error('Test execution error:', error);
    });
    
    return { success: true, testId };
  }

  async stopTesting(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      await test.stop();
      this.activeTests.delete(testId);
    }
  }

  getProgress(testId) {
    const test = this.activeTests.get(testId);
    return test ? test.getProgress() : null;
  }
}

class QATestInstance {
  constructor(testId, urls, config) {
    this.testId = testId;
    this.urls = urls;
    this.config = config;
    this.progress = {
      current: 0,
      total: urls.length,
      currentUrl: '',
      status: 'Initializing',
      completed: false
    };
    this.results = {
      urls: [],
      screenshots: [],
      issues: [],
      performance: {},
      accessibility: {},
      seo: {},
      aiReport: null
    };
    this.stopped = false;
  }

  async start() {
    try {
      this.updateStatus('Starting tests...');
      
      for (let i = 0; i < this.urls.length && !this.stopped; i++) {
        const url = this.urls[i];
        this.progress.current = i + 1;
        this.progress.currentUrl = url;
        
        await this.testUrl(url);
      }
      
      if (!this.stopped) {
        await this.generateAIReport();
        this.progress.completed = true;
        this.updateStatus('Testing completed');
      }
    } catch (error) {
      console.error('Test execution error:', error);
      this.updateStatus('Error: ' + error.message);
    }
  }

  async testUrl(url) {
    this.updateStatus(`Testing: ${url}`);
    
    // Create a new tab for testing
    const tab = await chrome.tabs.create({ url, active: false });
    
    try {
      // Wait for page load
      await this.waitForPageLoad(tab.id);
      
      const urlResults = {
        url,
        timestamp: Date.now(),
        issues: [],
        metrics: {}
      };

      // Run all enabled tests
      if (this.config.fullScreenshots) {
        urlResults.screenshot = await this.captureFullScreenshot(tab.id);
      }
      
      if (this.config.brokenLinks) {
        urlResults.brokenLinks = await this.checkBrokenLinks(tab.id);
      }
      
      if (this.config.stagingUrls) {
        urlResults.stagingUrls = await this.checkStagingUrls(tab.id);
      }
      
      if (this.config.spacingValidation) {
        urlResults.spacing = await this.validateSpacing(tab.id);
      }
      
      if (this.config.accessibility) {
        urlResults.accessibility = await this.runAccessibilityChecks(tab.id);
      }
      
      if (this.config.mobileTablet) {
        urlResults.responsive = await this.testResponsive(tab.id);
      }
      
      if (this.config.lighthouse) {
        urlResults.lighthouse = await this.runLighthouse(tab.id);
      }
      
      if (this.config.seoCheck) {
        urlResults.seo = await this.checkSEO(tab.id);
      }

      this.results.urls.push(urlResults);
      
      // Close the tab
      await chrome.tabs.remove(tab.id);
      
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
      this.results.issues.push({
        url,
        type: 'testing_error',
        message: error.message,
        timestamp: Date.now()
      });
      
      // Try to close tab if it still exists
      try {
        await chrome.tabs.remove(tab.id);
      } catch (e) {
        // Tab might already be closed
      }
    }
  }

  async waitForPageLoad(tabId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Page load timeout'));
      }, 30000);

      const checkComplete = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            clearTimeout(timeout);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (tab.status === 'complete') {
            clearTimeout(timeout);
            // Additional wait for JS execution
            setTimeout(resolve, 2000);
          } else {
            setTimeout(checkComplete, 500);
          }
        });
      };

      checkComplete();
    });
  }

  async captureFullScreenshot(tabId) {
    try {
      // Inject script to get full page dimensions
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            width: Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth
            ),
            height: Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight
            ),
            viewportHeight: window.innerHeight
          };
        }
      });

      const { width, height, viewportHeight } = result.result;
      const screenshots = [];
      
      // Calculate number of screenshots needed
      const numScreenshots = Math.ceil(height / viewportHeight);
      
      for (let i = 0; i < numScreenshots; i++) {
        const scrollY = i * viewportHeight;
        
        // Scroll to position
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (y) => window.scrollTo(0, y),
          args: [scrollY]
        });
        
        // Wait for scroll
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Capture screenshot
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: 'png',
          quality: 90
        });
        
        screenshots.push({
          dataUrl,
          scrollY,
          width,
          height: Math.min(viewportHeight, height - scrollY)
        });
      }
      
      // Store screenshot data
      this.results.screenshots.push({
        url: await this.getCurrentUrl(tabId),
        timestamp: Date.now(),
        screenshots,
        fullHeight: height,
        fullWidth: width
      });
      
      return screenshots;
      
    } catch (error) {
      console.error('Screenshot capture error:', error);
      throw error;
    }
  }

  async checkBrokenLinks(tabId) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links.map(link => ({
          url: link.href,
          text: link.textContent.trim(),
          element: {
            tag: link.tagName,
            className: link.className,
            id: link.id
          }
        }));
      }
    });
    
    const links = result.result;
    const brokenLinks = [];
    
    // Test each link (limit to avoid overwhelming)
    const linksToTest = links.slice(0, 100);
    
    for (const link of linksToTest) {
      if (this.stopped) break;
      
      try {
        const response = await fetch(link.url, {
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        if (!response.ok && response.status !== 0) {
          brokenLinks.push({
            ...link,
            status: response.status,
            statusText: response.statusText
          });
        }
      } catch (error) {
        brokenLinks.push({
          ...link,
          error: error.message
        });
      }
    }
    
    return {
      totalLinks: links.length,
      testedLinks: linksToTest.length,
      brokenLinks
    };
  }

  async checkStagingUrls(tabId) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const stagingPatterns = [
          /staging\./i,
          /dev\./i,
          /test\./i,
          /localhost/i,
          /127\.0\.0\.1/,
          /192\.168\./,
          /\.local/i,
          /development/i,
          /stage\./i
        ];
        
        const elements = Array.from(document.querySelectorAll('a[href], img[src], script[src], link[href]'));
        const stagingUrls = [];
        
        elements.forEach(el => {
          const url = el.href || el.src;
          if (url && stagingPatterns.some(pattern => pattern.test(url))) {
            stagingUrls.push({
              url,
              element: el.tagName,
              attribute: el.href ? 'href' : 'src',
              text: el.textContent?.trim() || el.alt || '',
              location: el.getBoundingClientRect()
            });
          }
        });
        
        return stagingUrls;
      }
    });
    
    return result.result;
  }

  async validateSpacing(tabId) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const issues = [];
        const elements = document.querySelectorAll('*:not(script):not(style)');
        
        elements.forEach(el => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          // Check for elements with no spacing
          if (rect.width > 0 && rect.height > 0) {
            const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
            const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            
            // Flag elements with insufficient spacing
            if (margin === 0 && padding === 0 && el.children.length > 1) {
              issues.push({
                element: el.tagName,
                className: el.className,
                issue: 'No spacing between child elements',
                rect: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                }
              });
            }
          }
        });
        
        return issues;
      }
    });
    
    return result.result;
  }

  async runAccessibilityChecks(tabId) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const issues = [];
        
        // Check for missing alt text
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (!img.alt) {
            issues.push({
              type: 'missing_alt_text',
              element: 'img',
              src: img.src,
              message: 'Image missing alt text'
            });
          }
        });
        
        // Check for missing form labels
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea, select');
        inputs.forEach(input => {
          const label = document.querySelector(`label[for="${input.id}"]`);
          const ariaLabel = input.getAttribute('aria-label');
          const ariaLabelledBy = input.getAttribute('aria-labelledby');
          
          if (!label && !ariaLabel && !ariaLabelledBy) {
            issues.push({
              type: 'missing_label',
              element: input.tagName,
              id: input.id,
              message: 'Form input missing label'
            });
          }
        });
        
        // Check heading hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let lastLevel = 0;
        headings.forEach(heading => {
          const level = parseInt(heading.tagName.substring(1));
          if (level > lastLevel + 1) {
            issues.push({
              type: 'heading_hierarchy',
              element: heading.tagName,
              message: `Heading level jumps from h${lastLevel} to h${level}`
            });
          }
          lastLevel = level;
        });
        
        // Check color contrast (basic)
        const textElements = document.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6');
        textElements.forEach(el => {
          const style = getComputedStyle(el);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          
          // Simple contrast check (this is basic, you might want to use a proper contrast checker)
          if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            // Add to issues if contrast seems low (this is a simplified check)
            const isLowContrast = this.checkContrast(color, backgroundColor);
            if (isLowContrast) {
              issues.push({
                type: 'low_contrast',
                element: el.tagName,
                color: color,
                backgroundColor: backgroundColor,
                message: 'Potential low color contrast'
              });
            }
          }
        });
        
        return {
          totalIssues: issues.length,
          issues: issues.slice(0, 50) // Limit results
        };
      }
    });
    
    return result.result;
  }

  async testResponsive(tabId) {
    const devices = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    const results = [];
    
    for (const device of devices) {
      try {
        // Set viewport size
        await chrome.debugger.attach({ tabId }, "1.0");
        await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
          width: device.width,
          height: device.height,
          deviceScaleFactor: 1,
          mobile: device.name === 'Mobile'
        });
        
        // Wait for reflow
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for responsive issues
        const [result] = await chrome.scripting.executeScript({
          target: { tabId },
          func: (deviceName) => {
            const issues = [];
            
            // Check for horizontal scrollbar
            if (document.documentElement.scrollWidth > window.innerWidth) {
              issues.push({
                type: 'horizontal_scroll',
                message: 'Horizontal scrollbar present',
                device: deviceName
              });
            }
            
            // Check for elements extending beyond viewport
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.right > window.innerWidth && rect.width > 50) {
                issues.push({
                  type: 'element_overflow',
                  element: el.tagName,
                  className: el.className,
                  message: 'Element extends beyond viewport',
                  device: deviceName
                });
              }
            });
            
            return {
              device: deviceName,
              viewport: { width: window.innerWidth, height: window.innerHeight },
              issues: issues.slice(0, 10)
            };
          },
          args: [device.name]
        });
        
        results.push(result.result);
        
        await chrome.debugger.detach({ tabId });
        
      } catch (error) {
        console.error(`Responsive test error for ${device.name}:`, error);
        try {
          await chrome.debugger.detach({ tabId });
        } catch (e) {}
      }
    }
    
    return results;
  }

  async runLighthouse(tabId) {
    // Note: This is a simplified implementation
    // In a real implementation, you'd use the Lighthouse API
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Basic performance metrics
          const performance = window.performance;
          const navigation = performance.getEntriesByType('navigation')[0];
          
          return {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
            resources: performance.getEntriesByType('resource').length,
            timestamp: Date.now()
          };
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('Lighthouse test error:', error);
      return { error: error.message };
    }
  }

  async checkSEO(tabId) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const seoData = {
          title: document.title,
          metaDescription: document.querySelector('meta[name="description"]')?.content || '',
          metaKeywords: document.querySelector('meta[name="keywords"]')?.content || '',
          h1Count: document.querySelectorAll('h1').length,
          h2Count: document.querySelectorAll('h2').length,
          h3Count: document.querySelectorAll('h3').length,
          imgWithoutAlt: document.querySelectorAll('img:not([alt])').length,
          internalLinks: document.querySelectorAll('a[href^="/"], a[href*="' + window.location.hostname + '"]').length,
          externalLinks: document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])').length,
          canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || '',
          ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
          ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
          ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
          twitterCard: document.querySelector('meta[name="twitter:card"]')?.content || '',
          structuredData: document.querySelectorAll('script[type="application/ld+json"]').length,
          issues: []
        };
        
        // SEO Issues Detection
        if (!seoData.title || seoData.title.length < 10) {
          seoData.issues.push({ type: 'title', message: 'Title tag missing or too short' });
        }
        
        if (!seoData.metaDescription || seoData.metaDescription.length < 120) {
          seoData.issues.push({ type: 'meta_description', message: 'Meta description missing or too short' });
        }
        
        if (seoData.h1Count === 0) {
          seoData.issues.push({ type: 'h1', message: 'No H1 tag found' });
        } else if (seoData.h1Count > 1) {
          seoData.issues.push({ type: 'h1', message: 'Multiple H1 tags found' });
        }
        
        if (seoData.imgWithoutAlt > 0) {
          seoData.issues.push({ type: 'alt_text', message: `${seoData.imgWithoutAlt} images missing alt text` });
        }
        
        return seoData;
      }
    });
    
    return result.result;
  }

  async generateAIReport() {
    if (!this.config.aiAnalysis) return;
    
    this.updateStatus('Generating AI report...');
    
    try {
      // Get API key
      const storage = await chrome.storage.session.get(['openrouterApiKey']);
      const apiKey = storage.openrouterApiKey;
      
      if (!apiKey) {
        throw new Error('OpenRouter API key not found');
      }
      
      // Prepare data for AI analysis
      const analysisData = this.prepareAnalysisData();
      
      // Send to OpenRouter
      const report = await this.sendToOpenRouter(apiKey, analysisData);
      
      this.results.aiReport = report;
      
    } catch (error) {
      console.error('AI report generation error:', error);
      this.results.aiReport = {
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  prepareAnalysisData() {
    const screenshots = this.results.screenshots.slice(0, 10); // Limit to 10 screenshots
    
    return {
      summary: {
        totalUrls: this.results.urls.length,
        totalIssues: this.results.issues.length,
        testDuration: Date.now() - this.results.startTime
      },
      urls: this.results.urls.map(url => ({
        url: url.url,
        issues: url.issues || [],
        seo: url.seo || {},
        accessibility: url.accessibility || {},
        performance: url.lighthouse || {},
        hasScreenshot: screenshots.some(s => s.url === url.url)
      })),
      screenshots: screenshots.map(s => ({
        url: s.url,
        screenshotCount: s.screenshots?.length || 0
      }))
    };
  }

  async sendToOpenRouter(apiKey, analysisData) {
    const screenshots = this.results.screenshots.slice(0, 10);
    
    // Prepare content array with text and images
    const content = [
      {
        type: 'text',
        text: `Please analyze this website QA testing data and provide a comprehensive report in Markdown format. 

## Test Summary
- URLs Tested: ${analysisData.summary.totalUrls}
- Total Issues Found: ${analysisData.summary.totalIssues}
- Test Duration: ${Math.round(analysisData.summary.testDuration / 1000)}s

## URLs and Issues
${JSON.stringify(analysisData.urls, null, 2)}

Please analyze the screenshots, identify visual issues, layout problems, responsive design issues, and provide actionable recommendations. Format your response as a detailed Markdown report with sections for:

1. Executive Summary
2. Critical Issues
3. Visual Analysis
4. Performance Issues
5. SEO Recommendations
6. Accessibility Concerns
7. Recommendations and Next Steps

Be specific about issues found and provide clear, actionable solutions.`
      }
    ];
    
    // Add screenshots (up to 10)
    for (const screenshot of screenshots) {
      if (screenshot.screenshots && screenshot.screenshots.length > 0) {
        // Use the first screenshot of each page
        const mainScreenshot = screenshot.screenshots[0];
        
        content.push({
          type: 'image_url',
          image_url: {
            url: mainScreenshot.dataUrl
          }
        });
        
        content.push({
          type: 'text',
          text: `Screenshot of: ${screenshot.url}`
        });
      }
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'chrome-extension://qa-testing-suite',
        'X-Title': 'QA Testing Suite'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      report: data.choices[0].message.content,
      model: 'google/gemini-2.0-flash-001',
      timestamp: Date.now(),
      usage: data.usage
    };
  }

  async getCurrentUrl(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        resolve(tab.url);
      });
    });
  }

  updateStatus(status) {
    this.progress.status = status;
  }

  getProgress() {
    return { ...this.progress, results: this.results };
  }

  async stop() {
    this.stopped = true;
    this.updateStatus('Stopping...');
  }
}

// Initialize background service
new QATestingBackground();
```

## 5. Content Script

**File: `content/content.js`**
```javascript
// Content script for additional page analysis
class QAContentScript {
  constructor() {
    this.init();
  }

  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getPageData':
          const pageData = await this.getPageData();
          sendResponse({ success: true, data: pageData });
          break;
        
        case 'checkAccessibility':
          const a11yData = await this.checkAccessibility();
          sendResponse({ success: true, data: a11yData });
          break;
        
        case 'analyzeLayout':
          const layoutData = await this.analyzeLayout();
          sendResponse({ success: true, data: layoutData });
          break;
        
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async getPageData() {
    return {
      url: window.location.href,
      title: document.title,
      meta: this.getMetaTags(),
      headings: this.getHeadings(),
      links: this.getLinks(),
      images: this.getImages(),
      forms: this.getForms(),
      scripts: this.getScripts(),
      styles: this.getStyles(),
      performance: this.getPerformanceData()
    };
  }

  getMetaTags() {
    const meta = {};
    document.querySelectorAll('meta').forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        meta[name] = content;
      }
    });
    return meta;
  }

  getHeadings() {
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      headings.push({
        tag: heading.tagName,
        text: heading.textContent.trim(),
        level: parseInt(heading.tagName.substring(1)),
        id: heading.id,
        className: heading.className
      });
    });
    return headings;
  }

  getLinks() {
    const links = [];
    document.querySelectorAll('a[href]').forEach(link => {
      links.push({
        href: link.href,
        text: link.textContent.trim(),
        title: link.title,
        target: link.target,
        rel: link.rel,
        isExternal: !link.href.includes(window.location.hostname)
      });
    });
    return links;
  }

  getImages() {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      images.push({
        src: img.src,
        alt: img.alt,
        title: img.title,
        width: img.naturalWidth,
        height: img.naturalHeight,
        loading: img.loading,
        hasAlt: !!img.alt
      });
    });
    return images;
  }

  getForms() {
    const forms = [];
    document.querySelectorAll('form').forEach(form => {
      const inputs = [];
      form.querySelectorAll('input, textarea, select').forEach(input => {
        inputs.push({
          type: input.type,
          name: input.name,
          id: input.id,
          required: input.required,
          hasLabel: this.hasLabel(input)
        });
      });
      
      forms.push({
        action: form.action,
        method: form.method,
        inputs: inputs
      });
    });
    return forms;
  }

  hasLabel(input) {
    if (input.getAttribute('aria-label')) return true;
    if (input.getAttribute('aria-labelledby')) return true;
    if (document.querySelector(`label[for="${input.id}"]`)) return true;
    return false;
  }

  getScripts() {
    const scripts = [];
    document.querySelectorAll('script[src]').forEach(script => {
      scripts.push({
        src: script.src,
        async: script.async,
        defer: script.defer,
        type: script.type
      });
    });
    return scripts;
  }

  getStyles() {
    const styles = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      styles.push({
        href: link.href,
        media: link.media
      });
    });
    return styles;
  }

  getPerformanceData() {
    if (!window.performance) return null;
    
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      resources: performance.getEntriesByType('resource').length
    };
  }

  async checkAccessibility() {
    const issues = [];
    
    // Check for missing alt text
    document.querySelectorAll('img:not([alt])').forEach(img => {
      issues.push({
        type: 'missing_alt',
        element: 'img',
        src: img.src,
        severity: 'high'
      });
    });
    
    // Check for missing form labels
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (!this.hasLabel(input)) {
        issues.push({
          type: 'missing_label',
          element: input.tagName,
          id: input.id,
          name: input.name,
          severity: 'high'
        });
      }
    });
    
    // Check heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1));
      if (level > lastLevel + 1) {
        issues.push({
          type: 'heading_skip',
          element: heading.tagName,
          text: heading.textContent.trim(),
          severity: 'medium'
        });
      }
      lastLevel = level;
    });
    
    // Check for keyboard accessibility
    document.querySelectorAll('div[onclick], span[onclick]').forEach(el => {
      if (!el.getAttribute('tabindex') && !el.getAttribute('role')) {
        issues.push({
          type: 'no_keyboard_access',
          element: el.tagName,
          severity: 'medium'
        });
      }
    });
    
    return {
      totalIssues: issues.length,
      issues: issues,
      score: Math.max(0, 100 - (issues.length * 5))
    };
  }

  async analyzeLayout() {
    const issues = [];
    
    // Check for elements extending beyond viewport
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth && rect.width > 100) {
        issues.push({
          type: 'overflow',
          element: el.tagName,
          className: el.className,
          width: rect.width,
          right: rect.right
        });
      }
    });
    
    // Check for overlapping elements
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    
    for (let i = 0; i < elements.length - 1; i++) {
      const rect1 = elements[i].getBoundingClientRect();
      for (let j = i + 1; j < elements.length; j++) {
        const rect2 = elements[j].getBoundingClientRect();
        
        if (this.isOverlapping(rect1, rect2)) {
          issues.push({
            type: 'overlap',
            element1: elements[i].tagName,
            element2: elements[j].tagName,
            severity: 'low'
          });
          break; // Only report first overlap per element
        }
      }
    }
    
    return {
      totalIssues: issues.length,
      issues: issues.slice(0, 20), // Limit results
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  isOverlapping(rect1, rect2) {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right || 
             rect1.bottom < rect2.top || 
             rect1.top > rect2.bottom);
  }
}

// Initialize content script
new QAContentScript();
```

## 6. OpenRouter Integration Library

**File: `lib/openrouter.js`**
```javascript
class OpenRouterClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  async analyzeWebsiteData(websiteData, screenshots) {
    try {
      const content = this.prepareContent(websiteData, screenshots);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'chrome-extension://qa-testing-suite',
          'X-Title': 'QA Testing Suite'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: 'You are a professional website QA analyst. Analyze the provided website data and screenshots to create a comprehensive quality assurance report in Markdown format.'
            },
            {
              role: 'user',
              content: content
            }
          ],
          max_tokens: 4000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        report: data.choices[0].message.content,
        usage: data.usage,
        model: 'google/gemini-2.0-flash-001',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('OpenRouter analysis error:', error);
      throw error;
    }
  }

  prepareContent(websiteData, screenshots) {
    const content = [];
    
    // Add main analysis prompt
    content.push({
      type: 'text',
      text: this.createAnalysisPrompt(websiteData)
    });

    // Add screenshots (limit to 10 as per OpenRouter guidelines)
    const limitedScreenshots = screenshots.slice(0, 10);
    
    limitedScreenshots.forEach((screenshot, index) => {
      if (screenshot.screenshots && screenshot.screenshots.length > 0) {
        // Use the first (top) screenshot of each page
        const mainScreenshot = screenshot.screenshots[0];
        
        content.push({
          type: 'image_url',
          image_url: {
            url: mainScreenshot.dataUrl
          }
        });
        
        content.push({
          type: 'text',
          text: `**Screenshot ${index + 1}:** ${screenshot.url}\n`
        });
      }
    });

    return content;
  }

  createAnalysisPrompt(websiteData) {
    return `# Website QA Analysis Request

Please analyze the following website testing data and screenshots to provide a comprehensive QA report in Markdown format.

## Test Summary
- **URLs Tested:** ${websiteData.summary.totalUrls}
- **Total Issues Found:** ${websiteData.summary.totalIssues}
- **Test Duration:** ${Math.round(websiteData.summary.testDuration / 1000)} seconds

## Detailed Data
${JSON.stringify(websiteData.urls, null, 2)}

## Analysis Requirements

Please provide a detailed analysis covering:

### 1. Executive Summary
- Overall website quality assessment
- Key findings and critical issues
- Readiness for production/client delivery

### 2. Visual Analysis (Based on Screenshots)
- Layout and design consistency
- Responsive design issues
- Visual hierarchy and spacing problems
- Cross-browser compatibility concerns

### 3. Technical Issues
- Broken links and navigation problems
- Performance and loading issues
- JavaScript errors and functionality problems

### 4. SEO Analysis
- Meta tags and title optimization
- Heading structure (H1, H2, etc.)
- Image alt text and accessibility
- URL structure and canonicalization

### 5. Accessibility Compliance (AODA/WCAG)
- Missing alt text and labels
- Color contrast issues
- Keyboard navigation problems
- Screen reader compatibility

### 6. Performance Issues
- Page load times and optimization opportunities
- Resource optimization recommendations
- Core Web Vitals assessment

### 7. Recommendations and Action Items
- Priority-ranked list of issues to fix
- Specific technical solutions
- Best practices for ongoing maintenance

## Response Format
- Use clear Markdown formatting with proper headers
- Include severity levels (Critical, High, Medium, Low) for issues
- Provide specific, actionable recommendations
- Include code examples where helpful
- Keep the report professional and client-ready

Please analyze the provided screenshots for visual issues, layout problems, and any other quality concerns you can identify.`;
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpenRouterClient;
}
```

## 7. Results Display Page

**File: `results/results.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QA Testing Results</title>
  <link rel="stylesheet" href="results.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Website QA Testing Results</h1>
      <div class="header-actions">
        <button id="exportMarkdown" class="btn primary">Export Markdown Report</button>
        <button id="exportJson" class="btn secondary">Export Raw Data</button>
      </div>
    </header>

    <div class="summary-cards">
      <div class="card">
        <div class="card-title">URLs Tested</div>
        <div class="card-value" id="urlCount">-</div>
      </div>
      <div class="card">
        <div class="card-title">Issues Found</div>
        <div class="card-value" id="issueCount">-</div>
      </div>
      <div class="card">
        <div class="card-title">Screenshots</div>
        <div class="card-value" id="screenshotCount">-</div>
      </div>
      <div class="card">
        <div class="card-title">Test Duration</div>
        <div class="card-value" id="testDuration">-</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="ai-report">AI Report</button>
      <button class="tab" data-tab="detailed-results">Detailed Results</button>
      <button class="tab" data-tab="screenshots">Screenshots</button>
      <button class="tab" data-tab="raw-data">Raw Data</button>
    </div>

    <div class="tab-content">
      <div id="ai-report" class="tab-pane active">
        <div class="ai-report-container">
          <div id="aiReportContent">Loading AI report...</div>
        </div>
      </div>

      <div id="detailed-results" class="tab-pane">
        <div id="detailedResultsContent">
          <!-- Detailed results will be populated here -->
        </div>
      </div>

      <div id="screenshots" class="tab-pane">
        <div id="screenshotsContent">
          <!-- Screenshots will be populated here -->
        </div>
      </div>

      <div id="raw-data" class="tab-pane">
        <pre id="rawDataContent"></pre>
      </div>
    </div>
  </div>

  <script src="results.js"></script>
</body>
</html>
```

## 8. Installation and Usage Instructions

### For Developers:

1. **Create the Extension Directory Structure** as outlined above
2. **Implement All Files** with the provided code
3. **Load the Extension:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

### For Users:

1. **Get OpenRouter API Key:**
   - Sign up at [OpenRouter.ai](https://openrouter.ai)
   - Get your API key from the dashboard

2. **Use the Extension:**
   - Click the extension icon in Chrome toolbar
   - Enter URLs to test (one per line)
   - Configure test options
   - Enter OpenRouter API key
   - Click "Start Testing"

3. **Review Results:**
   - Wait for testing to complete
   - View the AI-generate