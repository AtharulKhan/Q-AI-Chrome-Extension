class QATestingPopup {
  constructor() {
    this.isRunning = false;
    this.currentTestId = null;
    this.testResults = null;
    this.progressInterval = null;
    this.activeTabUrl = null;
    
    this.init();
  }

  async init() {
    this.bindElements();
    this.bindEvents();
    await this.loadSavedSettings();
    await this.getActiveTab();
    await this.checkForActiveTest();
  }

  bindElements() {
    this.elements = {
      activeTabUrl: document.getElementById('activeTabUrl'),
      apiKey: document.getElementById('apiKey'),
      modelName: document.getElementById('modelName'),
      apiKeyContainer: document.getElementById('apiKeyContainer'),
      startBtn: document.getElementById('startTest'),
      stopBtn: document.getElementById('stopTest'),
      progressSection: document.getElementById('progressSection'),
      progressStatus: document.getElementById('progressStatus'),
      progressPercent: document.getElementById('progressPercent'),
      progressFill: document.getElementById('progressFill'),
      currentUrl: document.getElementById('currentUrl'),
      resultsSection: document.getElementById('resultsSection'),
      errorSection: document.getElementById('errorSection'),
      errorMessage: document.getElementById('errorMessage'),
      
      // View mode radio buttons
      desktopView: document.getElementById('desktopView'),
      mobileView: document.getElementById('mobileView'),
      
      // Checkboxes
      fullScreenshots: document.getElementById('fullScreenshots'),
      spacingValidation: document.getElementById('spacingValidation'),
      brokenLinks: document.getElementById('brokenLinks'),
      lighthouse: document.getElementById('lighthouse'),
      seoCheck: document.getElementById('seoCheck'),
      accessibility: document.getElementById('accessibility'),
      aiAnalysis: document.getElementById('aiAnalysis'),
      
      // Results
      urlsTested: document.getElementById('urlsTested'),
      issuesFound: document.getElementById('issuesFound'),
      screenshotCount: document.getElementById('screenshotCount'),
      viewReportBtn: document.getElementById('viewReport'),
      exportBtn: document.getElementById('exportResults')
    };
  }

  bindEvents() {
    // Control buttons
    this.elements.startBtn.addEventListener('click', () => this.startTesting());
    this.elements.stopBtn.addEventListener('click', () => this.stopTesting());
    
    // AI Analysis checkbox
    this.elements.aiAnalysis.addEventListener('change', (e) => {
      this.elements.apiKeyContainer.classList.toggle('hidden', !e.target.checked);
    });
    
    // API Key save
    this.elements.apiKey.addEventListener('blur', () => this.saveApiKey());
    
    // Model name save
    this.elements.modelName.addEventListener('blur', () => this.saveModelName());
    
    // Results actions
    this.elements.viewReportBtn?.addEventListener('click', () => this.viewReport());
    this.elements.exportBtn?.addEventListener('click', () => this.exportResults());
    
    // Save settings on change
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => this.saveSettings());
    });
    
    // Save settings when view mode changes
    this.elements.desktopView.addEventListener('change', () => this.saveSettings());
    this.elements.mobileView.addEventListener('change', () => this.saveSettings());
  }

  async getActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        // Check if it's a valid URL we can test
        if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
          this.activeTabUrl = tab.url;
          this.elements.activeTabUrl.textContent = tab.url;
          this.elements.activeTabUrl.style.color = '#667eea';
        } else {
          this.activeTabUrl = null;
          this.elements.activeTabUrl.textContent = 'Cannot test this page (not HTTP/HTTPS)';
          this.elements.activeTabUrl.style.color = '#dc2626';
        }
      }
    } catch (error) {
      console.error('Failed to get active tab:', error);
      this.elements.activeTabUrl.textContent = 'Failed to get active tab';
      this.elements.activeTabUrl.style.color = '#dc2626';
    }
  }

  getTestConfig() {
    return {
      viewMode: this.elements.desktopView.checked ? 'desktop' : 'mobile',
      fullScreenshots: this.elements.fullScreenshots.checked,
      spacingValidation: this.elements.spacingValidation.checked,
      brokenLinks: this.elements.brokenLinks.checked,
      lighthouse: this.elements.lighthouse.checked,
      seoCheck: this.elements.seoCheck.checked,
      accessibility: this.elements.accessibility.checked,
      aiAnalysis: this.elements.aiAnalysis.checked
    };
  }

  async startTesting() {
    // Get the current active tab again to ensure it's still valid
    await this.getActiveTab();
    
    // Validate active tab
    if (!this.activeTabUrl) {
      this.showError('Cannot test this page. Please navigate to an HTTP/HTTPS website.');
      return;
    }
    
    // Validate API key if AI analysis is enabled
    const config = this.getTestConfig();
    if (config.aiAnalysis) {
      const apiKey = this.elements.apiKey.value.trim();
      if (!apiKey) {
        this.showError('Please enter your OpenRouter API key for AI analysis');
        this.elements.apiKey.focus();
        return;
      }
      
      const modelName = this.elements.modelName.value.trim() || 'google/gemini-2.0-flash-exp:free';
      
      // Save API key and model
      await chrome.storage.local.set({ 
        openrouterApiKey: apiKey,
        openrouterModel: modelName
      });
    }
    
    // Update UI
    this.isRunning = true;
    this.updateUI();
    
    // Reset results
    this.testResults = null;
    
    try {
      // Send message to background script to start testing
      const response = await chrome.runtime.sendMessage({
        action: 'startTesting',
        urls: [this.activeTabUrl],  // Send as array for compatibility
        config: config
      });
      
      if (response.success) {
        this.currentTestId = response.testId;
        this.startProgressMonitoring();
      } else {
        throw new Error(response.error || 'Failed to start testing');
      }
      
    } catch (error) {
      console.error('Failed to start testing:', error);
      this.showError(error.message);
      this.isRunning = false;
      this.updateUI();
    }
  }

  async stopTesting() {
    if (this.currentTestId) {
      try {
        await chrome.runtime.sendMessage({
          action: 'stopTesting',
          testId: this.currentTestId
        });
      } catch (error) {
        console.error('Failed to stop testing:', error);
      }
    }
    
    this.isRunning = false;
    this.currentTestId = null;
    this.stopProgressMonitoring();
    this.updateUI();
  }

  startProgressMonitoring() {
    this.elements.progressSection.classList.add('active');
    
    const checkProgress = async () => {
      if (!this.isRunning || !this.currentTestId) {
        this.stopProgressMonitoring();
        return;
      }
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getProgress',
          testId: this.currentTestId
        });
        
        if (response.success && response.progress) {
          this.updateProgress(response.progress);
          
          if (response.progress.completed) {
            this.onTestingComplete(response.results);
          }
        }
      } catch (error) {
        console.error('Progress check error:', error);
      }
    };
    
    // Check immediately
    checkProgress();
    
    // Then check every second
    this.progressInterval = setInterval(checkProgress, 1000);
  }

  stopProgressMonitoring() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.elements.progressSection.classList.remove('active');
  }

  updateProgress(progress) {
    const { current, total, currentUrl, status } = progress;
    const percent = Math.round((current / total) * 100);
    
    this.elements.progressStatus.textContent = status || 'Processing...';
    this.elements.progressPercent.textContent = `${percent}%`;
    this.elements.progressFill.style.width = `${percent}%`;
    
    if (currentUrl) {
      this.elements.currentUrl.textContent = currentUrl;
    }
  }

  onTestingComplete(results) {
    this.isRunning = false;
    this.currentTestId = null;
    this.testResults = results;
    this.stopProgressMonitoring();
    
    // Update results summary
    if (results) {
      this.elements.urlsTested.textContent = '1';  // Always 1 for active tab
      this.elements.issuesFound.textContent = results.totalIssues || 0;
      this.elements.screenshotCount.textContent = results.screenshots?.length || 0;
    }
    
    this.updateUI();
  }

  updateUI() {
    // Control buttons
    this.elements.startBtn.disabled = this.isRunning;
    this.elements.stopBtn.disabled = !this.isRunning;
    
    // Sections
    this.elements.progressSection.style.display = this.isRunning ? 'block' : 'none';
    this.elements.resultsSection.style.display = 
      (!this.isRunning && this.testResults) ? 'block' : 'none';
    
    // Hide error when starting
    if (this.isRunning) {
      this.hideError();
    }
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorSection.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideError(), 5000);
  }

  hideError() {
    this.elements.errorSection.style.display = 'none';
  }

  async viewReport() {
    if (!this.testResults) return;
    
    try {
      // Try to store with screenshots first
      await chrome.storage.local.set({ 
        latestTestResults: this.testResults
      });
    } catch (error) {
      console.error('Failed to store results with screenshots:', error);
      
      // If storage fails, try compressing screenshots
      try {
        const compressedResults = {
          ...this.testResults,
          screenshots: this.testResults.screenshots?.map(s => ({
            ...s,
            // Keep only the most important data
            data: s.fullPageDataUrl || s.data ? (s.fullPageDataUrl || s.data).substring(0, 500000) : null,
            fullPageDataUrl: null,
            segments: null
          }))
        };
        
        await chrome.storage.local.set({ 
          latestTestResults: compressedResults
        });
      } catch (compressionError) {
        console.error('Failed even with compression:', compressionError);
        
        // Last resort: store without screenshots
        const minimalResults = {
          ...this.testResults,
          screenshots: []
        };
        await chrome.storage.local.set({ 
          latestTestResults: minimalResults 
        });
      }
    }
    
    // Open results page in new tab
    const url = chrome.runtime.getURL('results/results.html');
    chrome.tabs.create({ url });
  }

  async exportResults() {
    if (!this.testResults) return;
    
    // Create JSON export
    const dataStr = JSON.stringify(this.testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-test-results-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  async saveSettings() {
    const settings = {
      testConfig: this.getTestConfig()
      // No URLs to save anymore
    };
    
    await chrome.storage.local.set({ qaTestSettings: settings });
  }

  async loadSavedSettings() {
    try {
      const data = await chrome.storage.local.get(['qaTestSettings', 'openrouterApiKey', 'openrouterModel']);
      
      if (data.qaTestSettings) {
        // Load test config
        if (data.qaTestSettings.testConfig) {
          const config = data.qaTestSettings.testConfig;
          Object.keys(config).forEach(key => {
            if (this.elements[key]) {
              this.elements[key].checked = config[key];
            }
          });
        }
      }
      
      // Load API key
      if (data.openrouterApiKey) {
        this.elements.apiKey.value = data.openrouterApiKey;
      }
      
      // Load model name
      if (data.openrouterModel) {
        this.elements.modelName.value = data.openrouterModel;
      }
      
      // Update API key container visibility
      this.elements.apiKeyContainer.classList.toggle(
        'hidden', 
        !this.elements.aiAnalysis.checked
      );
      
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveApiKey() {
    const apiKey = this.elements.apiKey.value.trim();
    if (apiKey) {
      await chrome.storage.local.set({ openrouterApiKey: apiKey });
    }
  }
  
  async saveModelName() {
    const modelName = this.elements.modelName.value.trim();
    if (modelName) {
      await chrome.storage.local.set({ openrouterModel: modelName });
    }
  }

  async checkForActiveTest() {
    try {
      // Check if there's an active test
      const response = await chrome.runtime.sendMessage({
        action: 'checkActiveTest'
      });
      
      if (response.success && response.hasActiveTest) {
        // Restore active test state
        this.isRunning = true;
        this.currentTestId = response.testId;
        this.updateUI();
        
        // Restore progress monitoring
        this.startProgressMonitoring();
        
        // Update progress immediately
        if (response.progress) {
          this.updateProgress(response.progress);
        }
        
      } else if (response.success && response.completed && response.results) {
        // Test completed while popup was closed
        this.onTestingComplete(response.results);
      }
      
    } catch (error) {
      console.error('Error checking for active test:', error);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new QATestingPopup();
});