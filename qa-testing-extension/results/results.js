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
      // Get results from storage
      const data = await chrome.storage.local.get('latestTestResults');
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
      issuesList: document.getElementById('issuesList'),
      screenshotsGrid: document.getElementById('screenshotsGrid'),
      urlResults: document.getElementById('urlResults'),
      rawDataContent: document.getElementById('rawDataContent'),
      
      // Filters
      severityFilter: document.getElementById('severityFilter'),
      typeFilter: document.getElementById('typeFilter'),
      searchFilter: document.getElementById('searchFilter'),
      
      // Badges
      issuesBadge: document.getElementById('issuesBadge'),
      
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
    
    // Filters
    this.elements.severityFilter?.addEventListener('change', () => this.filterIssues());
    this.elements.typeFilter?.addEventListener('change', () => this.filterIssues());
    this.elements.searchFilter?.addEventListener('input', () => this.filterIssues());
    
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
    this.renderIssues();
    this.renderScreenshots();
    this.renderDetailedResults();
    this.renderRawData();
  }
  
  renderUrlTabs() {
    const urls = this.testResults.urls;
    
    // Only show URL tabs if multiple URLs were tested
    if (urls && urls.length > 1) {
      this.elements.urlTabs.style.display = 'flex';
      this.elements.urlTabs.innerHTML = '';
      
      // Add "All URLs" tab
      const allTab = document.createElement('button');
      allTab.className = 'url-tab active';
      allTab.innerHTML = '<span class="url-tab-icon">🌐</span> All URLs';
      allTab.addEventListener('click', () => {
        this.currentUrl = null;
        this.updateUrlTabs();
        this.refreshReports();
      });
      this.elements.urlTabs.appendChild(allTab);
      
      // Add individual URL tabs
      urls.forEach(urlResult => {
        const urlTab = document.createElement('button');
        urlTab.className = 'url-tab';
        const urlDomain = new URL(urlResult.url).hostname;
        urlTab.innerHTML = `<span class="url-tab-icon">📄</span> ${urlDomain}`;
        urlTab.addEventListener('click', () => {
          this.currentUrl = urlResult.url;
          this.updateUrlTabs();
          this.refreshReports();
        });
        this.elements.urlTabs.appendChild(urlTab);
      });
    } else {
      this.elements.urlTabs.style.display = 'none';
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
    this.renderIssues();
    this.renderScreenshots();
  }
  
  renderOverview() {
    if (!this.elements.overviewContent) return;
    
    if (this.currentUrl) {
      // Show overview for specific URL
      const urlResult = this.testResults.urls.find(u => u.url === this.currentUrl);
      if (urlResult) {
        this.elements.overviewContent.innerHTML = `
          <h3>${this.currentUrl}</h3>
          <div class="overview-stats">
            <div>Issues Found: ${urlResult.issues.length}</div>
            <div>Tests Run: ${Object.keys(urlResult.tests || {}).length}</div>
          </div>
        `;
      }
    } else {
      // Show overall overview
      this.elements.overviewContent.innerHTML = `
        <div class="overview-stats">
          <div>Total URLs Tested: ${this.testResults.urls?.length || 0}</div>
          <div>Total Issues Found: ${this.testResults.totalIssues || 0}</div>
          <div>Total Screenshots: ${this.testResults.screenshots?.length || 0}</div>
        </div>
      `;
    }
  }

  renderSummary() {
    const { urls, totalIssues, screenshots, duration } = this.testResults;
    
    this.elements.urlCount.textContent = urls?.length || 0;
    this.elements.issueCount.textContent = totalIssues || 0;
    this.elements.screenshotCount.textContent = screenshots?.length || 0;
    
    const seconds = Math.round((duration || 0) / 1000);
    this.elements.testDuration.textContent = `${seconds}s`;
    
    // Update issues badge
    this.elements.issuesBadge.textContent = totalIssues || 0;
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
    
    if (this.currentUrl && this.testResults.aiReports?.[this.currentUrl]) {
      // Show report for specific URL
      visualReport = this.testResults.aiReports[this.currentUrl].visual;
    } else if (!this.currentUrl && this.testResults.aiReports) {
      // Show combined reports for all URLs
      const allReports = Object.entries(this.testResults.aiReports)
        .map(([url, reports]) => {
          if (reports.visual && !reports.visual.error) {
            return `## ${url}\n\n${reports.visual.content}`;
          }
          return null;
        })
        .filter(Boolean);
      
      if (allReports.length > 0) {
        visualReport = { content: allReports.join('\n\n---\n\n') };
      }
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
    
    // Render markdown content
    this.elements.visualReportContent.innerHTML = this.renderMarkdown(visualReport.content || visualReport.report);
  }

  renderTechnicalReport() {
    if (!this.elements.technicalReportContent) return;
    
    let technicalReport = null;
    
    if (this.currentUrl && this.testResults.aiReports?.[this.currentUrl]) {
      // Show report for specific URL
      technicalReport = this.testResults.aiReports[this.currentUrl].technical;
    } else if (!this.currentUrl && this.testResults.aiReports) {
      // Show combined reports for all URLs
      const allReports = Object.entries(this.testResults.aiReports)
        .map(([url, reports]) => {
          if (reports.technical && !reports.technical.error) {
            return `## ${url}\n\n${reports.technical.content}`;
          }
          return null;
        })
        .filter(Boolean);
      
      if (allReports.length > 0) {
        technicalReport = { content: allReports.join('\n\n---\n\n') };
      }
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
    
    // Render markdown content
    this.elements.technicalReportContent.innerHTML = this.renderMarkdown(technicalReport.content || technicalReport.report);
  }

  renderMarkdown(markdown) {
    if (!markdown) return '<p>No content available</p>';
    
    // Basic markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Code blocks
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      // Lists
      .replace(/^\* (.+)$/gim, '<li>$1</li>')
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
    
    // Add emoji support for severity badges
    html = html
      .replace(/🔴/g, '<span style="color: #dc2626;">●</span>')
      .replace(/🟠/g, '<span style="color: #ea580c;">●</span>')
      .replace(/🟡/g, '<span style="color: #d97706;">●</span>')
      .replace(/🟢/g, '<span style="color: #10b981;">●</span>');
    
    return html;
  }

  renderIssues() {
    let issues = this.testResults.issues || [];
    
    // Filter by current URL if selected
    if (this.currentUrl) {
      issues = issues.filter(issue => issue.url === this.currentUrl);
    }
    
    // Apply filters
    let filteredIssues = issues.filter(issue => {
      if (this.currentFilter.severity !== 'all' && issue.severity !== this.currentFilter.severity) {
        return false;
      }
      if (this.currentFilter.type !== 'all' && issue.type !== this.currentFilter.type) {
        return false;
      }
      if (this.currentFilter.search) {
        const searchTerm = this.currentFilter.search.toLowerCase();
        const searchText = `${issue.type} ${issue.message || ''} ${issue.url || ''}`.toLowerCase();
        if (!searchText.includes(searchTerm)) {
          return false;
        }
      }
      return true;
    });
    
    if (filteredIssues.length === 0) {
      this.elements.issuesList.innerHTML = `
        <div class="no-issues">
          <p>No issues found matching the current filters.</p>
        </div>
      `;
      return;
    }
    
    const issuesHTML = filteredIssues.map(issue => {
      // Extract details from the issue object
      let detailsText = 'No details available';
      if (issue.message) {
        detailsText = issue.message;
      } else if (issue.details) {
        if (typeof issue.details === 'string') {
          detailsText = issue.details;
        } else if (issue.details.message) {
          detailsText = issue.details.message;
        } else if (issue.details.type) {
          detailsText = `${issue.details.type}: ${issue.details.url || issue.details.href || issue.details.text || ''}`;
        } else {
          // Try to extract meaningful info from the details object
          const detailKeys = Object.keys(issue.details);
          if (detailKeys.length > 0) {
            detailsText = detailKeys.map(key => {
              const value = issue.details[key];
              if (typeof value === 'string' || typeof value === 'number') {
                return `${key}: ${value}`;
              }
              return null;
            }).filter(Boolean).join(', ');
          }
        }
      }
      
      return `
        <div class="issue-item">
          <div class="issue-header">
            <div class="issue-title">${this.formatIssueType(issue.type)}</div>
            <span class="issue-severity severity-${issue.severity || 'medium'}">${issue.severity || 'medium'}</span>
          </div>
          <div class="issue-details">${detailsText}</div>
          <div class="issue-url">${issue.url || ''}</div>
        </div>
      `;
    }).join('');
    
    this.elements.issuesList.innerHTML = issuesHTML;
  }

  formatIssueType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  filterIssues() {
    this.currentFilter.severity = this.elements.severityFilter.value;
    this.currentFilter.type = this.elements.typeFilter.value;
    this.currentFilter.search = this.elements.searchFilter.value;
    this.renderIssues();
  }

  renderScreenshots() {
    let screenshots = this.testResults.screenshots || [];
    
    // Filter screenshots by current URL if selected
    if (this.currentUrl) {
      screenshots = screenshots.filter(s => s.url === this.currentUrl);
    }
    
    if (screenshots.length === 0) {
      this.elements.screenshotsGrid.innerHTML = `
        <div class="no-screenshots">
          <p>No screenshots captured during this test.</p>
        </div>
      `;
      return;
    }
    
    const screenshotsHTML = screenshots.map((screenshot, index) => {
      // Handle new screenshot format
      let imageUrl = null;
      
      // Primary data field contains the full page image or first segment
      if (screenshot.data && typeof screenshot.data === 'string') {
        imageUrl = screenshot.data;
      } 
      // Fallback to fullPageDataUrl if available
      else if (screenshot.fullPageDataUrl) {
        imageUrl = screenshot.fullPageDataUrl;
      }
      // Fallback to first segment if available
      else if (screenshot.segments && screenshot.segments.length > 0) {
        imageUrl = screenshot.segments[0].dataUrl;
      }
      
      if (!imageUrl) {
        console.warn('No image URL found for screenshot:', screenshot);
        return '';
      }
      
      const type = screenshot.type || 'desktop';
      const dimensions = screenshot.dimensions || {};
      const width = dimensions.document?.width || 'Unknown';
      const height = dimensions.document?.height || 'Unknown';
      
      return `
        <div class="screenshot-item" data-index="${index}">
          <img class="screenshot-image" src="${imageUrl}" alt="${type} screenshot ${index + 1}">
          <div class="screenshot-info">
            <div class="screenshot-url">${screenshot.url}</div>
            <div class="screenshot-meta">
              <span class="screenshot-type">${type}</span>
              <span class="screenshot-dimensions">${width}x${height}px</span>
              ${screenshot.stitched ? '<span class="screenshot-badge">Full Page</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.screenshotsGrid.innerHTML = screenshotsHTML;
    
    // Add click handlers for modal
    document.querySelectorAll('.screenshot-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.showScreenshot(screenshots[index]);
      });
    });
  }

  showScreenshot(screenshot) {
    // Get the image URL based on new data structure
    let imageUrl = null;
    
    if (screenshot.data && typeof screenshot.data === 'string') {
      imageUrl = screenshot.data;
    } else if (screenshot.fullPageDataUrl) {
      imageUrl = screenshot.fullPageDataUrl;
    } else if (screenshot.segments && screenshot.segments.length > 0) {
      imageUrl = screenshot.segments[0].dataUrl;
    }
    
    if (!imageUrl) {
      console.error('No image URL found for screenshot modal:', screenshot);
      return;
    }
    
    this.elements.modalImage.src = imageUrl;
    this.elements.modalCaption.textContent = `${screenshot.url} (${screenshot.type || 'desktop'})`;
    this.elements.modal.classList.add('show');
  }

  closeModal() {
    this.elements.modal.classList.remove('show');
    this.elements.modalImage.src = '';
  }

  renderDetailedResults() {
    const urls = this.testResults.urls || [];
    
    const resultsHTML = urls.map((urlResult, index) => {
      const issueCount = urlResult.issues?.length || 0;
      const testsRun = Object.keys(urlResult.tests || {}).length;
      
      return `
        <div class="url-result-item" data-index="${index}">
          <div class="url-result-header">
            <div class="url-result-title">${urlResult.url}</div>
            <div class="url-result-stats">
              <span>${issueCount} issues</span>
              <span>${testsRun} tests</span>
            </div>
          </div>
          <div class="url-result-content">
            ${this.renderUrlDetails(urlResult)}
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.urlResults.innerHTML = resultsHTML;
    
    // Add click handlers for expandable sections
    document.querySelectorAll('.url-result-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('expanded');
      });
    });
  }

  renderUrlDetails(urlResult) {
    let html = '';
    
    // Issues section
    if (urlResult.issues?.length > 0) {
      html += `
        <div class="result-section">
          <h4>Issues (${urlResult.issues.length})</h4>
          <ul>
            ${urlResult.issues.map(issue => 
              `<li><strong>${this.formatIssueType(issue.type)}</strong>: ${issue.message || 'No details'}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    // Test results
    if (urlResult.tests) {
      Object.entries(urlResult.tests).forEach(([testName, testResult]) => {
        if (testResult) {
          html += `
            <div class="result-section">
              <h4>${this.formatIssueType(testName)}</h4>
              <pre>${JSON.stringify(testResult, null, 2)}</pre>
            </div>
          `;
        }
      });
    }
    
    return html || '<p>No detailed results available for this URL.</p>';
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