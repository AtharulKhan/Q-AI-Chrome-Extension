// Results page JavaScript
class ResultsPage {
  constructor() {
    this.testResults = null;
    this.currentUrl = null;
    this.currentFilter = {
      severity: 'all',
      type: 'all',
      search: ''
    };
    
    this.init();
  }

  async init() {
    await this.loadResults();
    this.bindElements();
    this.bindEvents();
    this.render();
  }

  async loadResults() {
    try {
      // Get results from storage (using local storage for higher quota)
      const data = await chrome.storage.local.get(['latestTestResults']);
      this.testResults = data.latestTestResults;
      
      if (!this.testResults) {
        this.showError('No test results found');
        return;
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      this.showError('Failed to load test results');
    }
  }

  bindElements() {
    this.elements = {
      // Summary
      urlCount: document.getElementById('urlCount'),
      issueCount: document.getElementById('issueCount'),
      screenshotCount: document.getElementById('screenshotCount'),
      testDuration: document.getElementById('testDuration'),
      
      // Scores
      overallScore: document.getElementById('overallScore'),
      scoreCircle: document.getElementById('scoreCircle'),
      scoreText: document.getElementById('scoreText'),
      accessibilityScore: document.getElementById('accessibilityScore'),
      accessibilityValue: document.getElementById('accessibilityValue'),
      performanceScore: document.getElementById('performanceScore'),
      performanceValue: document.getElementById('performanceValue'),
      seoScore: document.getElementById('seoScore'),
      seoValue: document.getElementById('seoValue'),
      
      // Tabs
      tabs: document.querySelectorAll('.tab'),
      tabPanes: document.querySelectorAll('.tab-pane'),
      
      // Content areas
      overviewContent: document.getElementById('overviewContent'),
      visualReportContent: document.getElementById('visualReportContent'),
      technicalReportContent: document.getElementById('technicalReportContent'),
      urlTabs: document.getElementById('urlTabs'),
      screenshotsGrid: document.getElementById('screenshotsGrid'),
      rawDataContent: document.getElementById('rawDataContent'),
      
      
      
      // Modal
      modal: document.getElementById('screenshotModal'),
      modalImage: document.getElementById('modalImage'),
      modalCaption: document.getElementById('modalCaption'),
      modalClose: document.querySelector('.modal-close'),
      
      // Actions
      exportMarkdown: document.getElementById('exportMarkdown'),
      exportJSON: document.getElementById('exportJSON'),
      exportPDF: document.getElementById('exportPDF'),
      copyVisualReport: document.getElementById('copyVisualReport'),
      copyTechnicalReport: document.getElementById('copyTechnicalReport'),
      newTest: document.getElementById('newTest')
    };
  }

  bindEvents() {
    // Tab switching
    this.elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab));
    });
    
    
    // Export actions
    this.elements.exportMarkdown?.addEventListener('click', () => this.exportMarkdown());
    this.elements.exportJSON?.addEventListener('click', () => this.exportJSON());
    this.elements.exportPDF?.addEventListener('click', () => this.exportPDF());
    this.elements.copyVisualReport?.addEventListener('click', () => this.copyReportContent('visual'));
    this.elements.copyTechnicalReport?.addEventListener('click', () => this.copyReportContent('technical'));
    this.elements.newTest?.addEventListener('click', () => this.newTest());
    
    // Modal
    this.elements.modalClose?.addEventListener('click', () => this.closeModal());
    this.elements.modal?.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) {
        this.closeModal();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  render() {
    if (!this.testResults) return;
    
    this.renderSummary();
    this.renderScores();
    this.renderUrlTabs();
    this.renderOverview();
    this.renderVisualReport();
    this.renderTechnicalReport();
    this.renderScreenshots();
    this.renderRawData();
  }
  
  renderUrlTabs() {
    // Hide URL tabs since we're only testing one URL at a time
    this.elements.urlTabs.style.display = 'none';
    
    // Set the current URL to the single tested URL
    if (this.testResults.urls && this.testResults.urls.length > 0) {
      this.currentUrl = this.testResults.urls[0].url;
    }
  }
  
  updateUrlTabs() {
    const tabs = this.elements.urlTabs.querySelectorAll('.url-tab');
    tabs.forEach((tab, index) => {
      if (index === 0) {
        // "All URLs" tab
        tab.classList.toggle('active', !this.currentUrl);
      } else {
        // Individual URL tabs
        const urlDomain = tab.textContent.trim().replace('📄 ', '');
        const isActive = this.testResults.urls.some(u => 
          new URL(u.url).hostname === urlDomain && u.url === this.currentUrl
        );
        tab.classList.toggle('active', isActive);
      }
    });
  }
  
  refreshReports() {
    this.renderOverview();
    this.renderVisualReport();
    this.renderTechnicalReport();
    this.renderScreenshots();
  }
  
  renderOverview() {
    if (!this.elements.overviewContent) return;
    
    // Always show overview for the single URL tested
    const urlResult = this.testResults.urls && this.testResults.urls[0];
    if (urlResult) {
      this.elements.overviewContent.innerHTML = `
        <h3>${urlResult.url}</h3>
        <div class="overview-stats">
          <div>Issues Found: ${urlResult.issues.length}</div>
          <div>Tests Run: ${Object.keys(urlResult.tests || {}).length}</div>
          <div>Screenshots Captured: ${this.testResults.screenshots?.length || 0}</div>
        </div>
      `;
    } else {
      this.elements.overviewContent.innerHTML = `
        <div class="error-message">
          <p>No test data available</p>
        </div>
      `;
    }
  }

  renderSummary() {
    const { urls, totalIssues, screenshots, duration } = this.testResults;
    
    this.elements.urlCount.textContent = '1';  // Always 1 URL for active tab testing
    this.elements.issueCount.textContent = totalIssues || 0;
    this.elements.screenshotCount.textContent = screenshots?.length || 0;
    
    const seconds = Math.round((duration || 0) / 1000);
    this.elements.testDuration.textContent = `${seconds}s`;
    
  }

  renderScores() {
    // Calculate average scores from test results
    let accessibilityTotal = 0;
    let performanceTotal = 0;
    let seoTotal = 0;
    let count = 0;
    
    this.testResults.urls?.forEach(url => {
      if (url.tests?.accessibility?.score !== undefined) {
        accessibilityTotal += url.tests.accessibility.score;
      }
      if (url.tests?.performance?.score !== undefined) {
        performanceTotal += url.tests.performance.score;
      }
      if (url.tests?.seo?.score !== undefined) {
        seoTotal += url.tests.seo.score;
      }
      count++;
    });
    
    const accessibilityScore = count > 0 ? Math.round(accessibilityTotal / count) : 0;
    const performanceScore = count > 0 ? Math.round(performanceTotal / count) : 0;
    const seoScore = count > 0 ? Math.round(seoTotal / count) : 0;
    
    // Calculate overall score
    const overallScore = Math.round((accessibilityScore + performanceScore + seoScore) / 3);
    
    // Update overall score circle
    this.elements.scoreText.textContent = overallScore;
    this.elements.scoreCircle.setAttribute('stroke-dasharray', `${overallScore}, 100`);
    
    // Set color based on score
    let color = '#10b981'; // Green
    if (overallScore < 50) {
      color = '#ef4444'; // Red
    } else if (overallScore < 80) {
      color = '#f59e0b'; // Orange
    }
    this.elements.scoreCircle.style.stroke = color;
    
    // Update individual scores
    this.updateScoreBar('accessibility', accessibilityScore);
    this.updateScoreBar('performance', performanceScore);
    this.updateScoreBar('seo', seoScore);
  }

  updateScoreBar(type, score) {
    const scoreElement = this.elements[`${type}Score`];
    const valueElement = this.elements[`${type}Value`];
    
    if (scoreElement && valueElement) {
      scoreElement.style.width = `${score}%`;
      valueElement.textContent = score;
      
      // Set color based on score
      let color = 'linear-gradient(90deg, #10b981 0%, #059669 100%)'; // Green
      if (score < 50) {
        color = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'; // Red
      } else if (score < 80) {
        color = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'; // Orange
      }
      scoreElement.style.background = color;
    }
  }

  renderVisualReport() {
    if (!this.elements.visualReportContent) return;
    
    let visualReport = null;
    
    // Get the single URL that was tested
    const testedUrl = this.testResults.urls && this.testResults.urls[0]?.url;
    
    if (testedUrl && this.testResults.aiReports?.[testedUrl]) {
      visualReport = this.testResults.aiReports[testedUrl].visual;
    }
    
    if (!visualReport || visualReport.error) {
      this.elements.visualReportContent.innerHTML = `
        <div class="error-message">
          <h3>Visual Analysis Not Available</h3>
          <p>${visualReport?.error || 'No visual analysis was performed.'}</p>
        </div>
      `;
      return;
    }
    
    // Render markdown content with interactive checkboxes
    this.elements.visualReportContent.innerHTML = this.renderMarkdown(visualReport.content || visualReport.report, 'visual');
    // Restore checkbox states and bind events
    this.restoreCheckboxStates();
    this.bindCheckboxEvents();
  }

  renderTechnicalReport() {
    if (!this.elements.technicalReportContent) return;
    
    let technicalReport = null;
    
    // Get the single URL that was tested
    const testedUrl = this.testResults.urls && this.testResults.urls[0]?.url;
    
    if (testedUrl && this.testResults.aiReports?.[testedUrl]) {
      technicalReport = this.testResults.aiReports[testedUrl].technical;
    }
    
    if (!technicalReport || technicalReport.error) {
      this.elements.technicalReportContent.innerHTML = `
        <div class="error-message">
          <h3>Technical Analysis Not Available</h3>
          <p>${technicalReport?.error || 'No technical analysis was performed.'}</p>
        </div>
      `;
      return;
    }
    
    // Render markdown content with interactive checkboxes
    this.elements.technicalReportContent.innerHTML = this.renderMarkdown(technicalReport.content || technicalReport.report, 'technical');
    // Restore checkbox states and bind events
    this.restoreCheckboxStates();
    this.bindCheckboxEvents();
  }

  renderMarkdown(markdown, reportType) {
    if (!markdown) return '<p>No content available</p>';
    
    // Generate a unique prefix for checkbox IDs based on report type and current URL
    const checkboxPrefix = `${reportType}_${this.currentUrl || 'all'}`.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Basic markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic (but not list items)
      .replace(/(?<!^- \[[ x]\] )\*([^*]+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Code blocks
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      // Regular lists (not checkboxes)
      .replace(/^(?!- \[[ x]\])^\* (.+)$/gim, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
      // Wrap in paragraphs
      .replace(/^(?!<[h|l|p|u])/gim, '<p>')
      .replace(/(?<![>])$/gim, '</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[1-6]>)/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
      // Wrap list items
      .replace(/(<li>.*<\/li>)\n?(<li>)/g, '$1$2')
      .replace(/(<li>.*<\/li>)(?!<li>)/g, '<ul>$1</ul>');
    
    // Convert checkbox syntax to interactive checkboxes
    let checkboxIndex = 0;
    html = html.replace(/^- \[([ x])\] (.+)$/gim, (match, checked, text) => {
      checkboxIndex++;
      const checkboxId = `${checkboxPrefix}_checkbox_${checkboxIndex}`;
      const isChecked = checked.toLowerCase() === 'x';
      
      // Create a hash of the text for consistent ID across reloads
      const textHash = this.hashString(text);
      const uniqueId = `${checkboxPrefix}_${textHash}`;
      
      return `<div class="checkbox-item">
        <input type="checkbox" 
               id="${uniqueId}" 
               class="report-checkbox" 
               data-report="${reportType}"
               data-url="${this.currentUrl || 'all'}"
               ${isChecked ? 'checked' : ''}>
        <label for="${uniqueId}" class="checkbox-label">${text}</label>
      </div>`;
    });
    
    // Add emoji support for severity badges
    html = html
      .replace(/🔴/g, '<span class="priority-icon critical">●</span>')
      .replace(/🟠/g, '<span class="priority-icon high">●</span>')
      .replace(/🟡/g, '<span class="priority-icon medium">●</span>')
      .replace(/🟢/g, '<span class="priority-icon low">●</span>');
    
    return html;
  }
  
  // Simple hash function for generating consistent IDs
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  // Bind checkbox events for persistence
  bindCheckboxEvents() {
    const checkboxes = document.querySelectorAll('.report-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.saveCheckboxState(e.target);
        this.updateCheckboxLabel(e.target);
      });
    });
  }
  
  // Save checkbox state to localStorage
  saveCheckboxState(checkbox) {
    const storageKey = 'qaTestCheckboxStates';
    const states = JSON.parse(localStorage.getItem(storageKey) || '{}');
    states[checkbox.id] = checkbox.checked;
    localStorage.setItem(storageKey, JSON.stringify(states));
  }
  
  // Restore checkbox states from localStorage
  restoreCheckboxStates() {
    const storageKey = 'qaTestCheckboxStates';
    const states = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    Object.keys(states).forEach(checkboxId => {
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.checked = states[checkboxId];
        this.updateCheckboxLabel(checkbox);
      }
    });
  }
  
  // Update checkbox label style based on state
  updateCheckboxLabel(checkbox) {
    const label = document.querySelector(`label[for="${checkbox.id}"]`);
    if (label) {
      if (checkbox.checked) {
        label.classList.add('checked');
      } else {
        label.classList.remove('checked');
      }
    }
  }


  formatIssueType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }


  renderScreenshots() {
    // Show all screenshots since we're only testing one URL
    let screenshots = this.testResults.screenshots || [];
    
    if (screenshots.length === 0) {
      this.elements.screenshotsGrid.innerHTML = `
        <div class="no-screenshots">
          <p>No screenshots captured during this test.</p>
        </div>
      `;
      return;
    }
    
    // Screenshots no longer contain image data after AI analysis
    this.elements.screenshotsGrid.innerHTML = `
      <div class="screenshots-info">
        <h3>Screenshot Information</h3>
        <p>Screenshots were captured and analyzed by AI. Image data has been removed to save storage.</p>
        <div class="screenshot-metadata">
          ${screenshots.map(screenshot => {
            const type = screenshot.type || 'desktop';
            const dimensions = screenshot.dimensions || {};
            const width = dimensions.document?.width || 'Unknown';
            const height = dimensions.document?.height || 'Unknown';
            
            return `
              <div class="screenshot-meta-item">
                <strong>${type.charAt(0).toUpperCase() + type.slice(1)} View:</strong>
                <span>${width} × ${height}px</span>
                <span class="screenshot-timestamp">Captured at ${new Date(screenshot.timestamp).toLocaleTimeString()}</span>
              </div>
            `;
          }).join('')}
        </div>
        <p class="screenshot-note">View the Visual Analysis tab to see the AI's analysis of the captured screenshots.</p>
      </div>
    `;
  }

  showScreenshot(screenshot) {
    // Screenshots no longer have image data after AI analysis
    console.log('Screenshot preview not available - image data has been removed to save storage');
  }

  closeModal() {
    this.elements.modal.classList.remove('show');
    this.elements.modalImage.src = '';
  }



  renderRawData() {
    this.elements.rawDataContent.textContent = JSON.stringify(this.testResults, null, 2);
  }

  switchTab(clickedTab) {
    const tabName = clickedTab.dataset.tab;
    
    // Update active states
    this.elements.tabs.forEach(tab => {
      tab.classList.toggle('active', tab === clickedTab);
    });
    
    this.elements.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabName);
    });
  }

  async exportMarkdown() {
    const markdown = this.generateMarkdownReport();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${Date.now()}.md`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  generateMarkdownReport() {
    const { urls, totalIssues, aiReport } = this.testResults;
    const date = new Date().toLocaleString();
    
    let markdown = `# Website QA Testing Report\n\n`;
    markdown += `**Generated:** ${date}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **URLs Tested:** ${urls?.length || 0}\n`;
    markdown += `- **Total Issues:** ${totalIssues || 0}\n\n`;
    
    if (aiReport?.report) {
      markdown += `## AI Analysis\n\n${aiReport.report}\n\n`;
    }
    
    markdown += `## Detailed Issues\n\n`;
    
    const issuesByUrl = {};
    this.testResults.issues?.forEach(issue => {
      const url = issue.url || 'General';
      if (!issuesByUrl[url]) {
        issuesByUrl[url] = [];
      }
      issuesByUrl[url].push(issue);
    });
    
    Object.entries(issuesByUrl).forEach(([url, issues]) => {
      markdown += `### ${url}\n\n`;
      issues.forEach(issue => {
        markdown += `- **${this.formatIssueType(issue.type)}** (${issue.severity || 'medium'}): ${issue.message || 'No details'}\n`;
      });
      markdown += '\n';
    });
    
    return markdown;
  }

  async exportJSON() {
    const json = JSON.stringify(this.testResults, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  async exportPDF() {
    // Simple implementation - opens print dialog
    // For a production version, you'd use a library like jsPDF
    window.print();
  }

  async copyReportContent(type) {
    const report = type === 'visual' ? this.testResults?.aiVisualReport : this.testResults?.aiTechnicalReport;
    const button = type === 'visual' ? this.elements.copyVisualReport : this.elements.copyTechnicalReport;
    
    if (!report?.content) {
      alert(`No ${type} report to copy`);
      return;
    }
    
    try {
      await navigator.clipboard.writeText(report.content);
      
      // Show success feedback
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="icon">✓</span> Copied!';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy report to clipboard');
    }
  }

  newTest() {
    // Close this tab and focus on extension popup
    chrome.runtime.sendMessage({ action: 'openPopup' });
    window.close();
  }

  showError(message) {
    document.querySelector('.container').innerHTML = `
      <div class="error-container" style="text-align: center; padding: 48px;">
        <h2>Error</h2>
        <p>${message}</p>
        <button onclick="window.close()" class="btn btn-primary" style="margin-top: 20px;">Close</button>
      </div>
    `;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ResultsPage();
});