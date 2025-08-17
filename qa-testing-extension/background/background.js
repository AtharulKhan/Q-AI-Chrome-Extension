// Background service worker for QA Testing Suite

class QATestingBackground {
  constructor() {
    this.activeTests = new Map();
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Clean up on extension update/reload
    chrome.runtime.onInstalled.addListener(() => {
      console.log('QA Testing Suite installed/updated');
    });

    // Restore active tests on service worker restart
    this.restoreActiveTests();
  }

  async restoreActiveTests() {
    try {
      const data = await chrome.storage.local.get(['activeTestId']);
      if (data.activeTestId) {
        console.log('Found active test:', data.activeTestId);
        // Test is marked as active but service worker restarted
        // We'll let the popup check for results
      }
    } catch (error) {
      console.error('Error restoring active tests:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('Background received message:', request.action);
    
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
          sendResponse({ 
            success: true, 
            progress: progress?.getProgress(),
            results: progress?.getResults()
          });
          break;

        case 'getResults':
          const test = this.activeTests.get(request.testId);
          sendResponse({ 
            success: true, 
            results: test?.getResults() 
          });
          break;

        case 'checkActiveTest':
          const activeData = await chrome.storage.local.get(['activeTestId', 'activeTestConfig']);
          if (activeData.activeTestId && this.activeTests.has(activeData.activeTestId)) {
            const activeTest = this.activeTests.get(activeData.activeTestId);
            sendResponse({
              success: true,
              hasActiveTest: true,
              testId: activeData.activeTestId,
              progress: activeTest.getProgress(),
              results: activeTest.getResults()
            });
          } else if (activeData.activeTestId) {
            // Test was running but service worker restarted
            // Check if we have stored results
            const resultsData = await chrome.storage.local.get(['latestTestResults']);
            sendResponse({
              success: true,
              hasActiveTest: false,
              testId: activeData.activeTestId,
              completed: true,
              results: resultsData.latestTestResults
            });
            // Clear active test
            await chrome.storage.local.remove(['activeTestId', 'activeTestConfig']);
          } else {
            sendResponse({
              success: true,
              hasActiveTest: false
            });
          }
          break;

        default:
          sendResponse({ 
            success: false, 
            error: 'Unknown action: ' + request.action 
          });
      }
    } catch (error) {
      console.error('Background message error:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async startTesting(urls, config) {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Store active test info
      await chrome.storage.local.set({
        activeTestId: testId,
        activeTestConfig: { urls, config }
      });

      // Create new test orchestrator
      const orchestrator = new TestOrchestrator(testId, urls, config);
      this.activeTests.set(testId, orchestrator);
      
      // Start testing asynchronously
      orchestrator.start().then(async () => {
        // Test completed
        console.log(`Test ${testId} completed`);
        
        // Store results
        const results = orchestrator.getResults();
        await chrome.storage.local.set({ latestTestResults: results });
        
      }).catch(error => {
        console.error(`Test ${testId} failed:`, error);
      }).finally(async () => {
        // Clear active test
        await chrome.storage.local.remove(['activeTestId', 'activeTestConfig']);
        
        // Clean up after a delay to allow result retrieval
        setTimeout(() => {
          this.activeTests.delete(testId);
        }, 60000); // Keep results for 1 minute
      });
      
      return { 
        success: true, 
        testId: testId 
      };
      
    } catch (error) {
      console.error('Failed to start testing:', error);
      await chrome.storage.local.remove(['activeTestId', 'activeTestConfig']);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async stopTesting(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      await test.stop();
      this.activeTests.delete(testId);
    }
    await chrome.storage.local.remove(['activeTestId', 'activeTestConfig']);
  }

  getProgress(testId) {
    return this.activeTests.get(testId);
  }
}

// Test Orchestrator Class (self-contained without imports)
class TestOrchestrator {
  constructor(testId, urls, config) {
    this.testId = testId;
    this.urls = urls;
    this.config = config;
    this.stopped = false;
    
    this.progress = {
      current: 0,
      total: urls.length,
      currentUrl: '',
      status: 'Initializing',
      completed: false
    };
    
    this.results = {
      testId: testId,
      startTime: Date.now(),
      urls: [],
      screenshots: [],
      issues: [],
      totalIssues: 0,
      performance: {},
      accessibility: {},
      seo: {},
      seoData: [],
      aiReports: {} // Per-URL AI reports: { 'url': { visual: {...}, technical: {...} } }
    };
  }

  async start() {
    try {
      this.updateStatus('Starting tests...');
      
      // Test each URL
      for (let i = 0; i < this.urls.length && !this.stopped; i++) {
        const url = this.urls[i];
        this.progress.current = i + 1;
        this.progress.currentUrl = url;
        this.updateStatus(`Testing ${i + 1}/${this.urls.length}: ${url}`);
        
        await this.testUrl(url);
      }
      
      // AI reports are now generated per-URL inside testUrl method
      
      // Mark as completed
      if (!this.stopped) {
        this.progress.completed = true;
        this.updateStatus('Testing completed');
        this.results.endTime = Date.now();
        this.results.duration = this.results.endTime - this.results.startTime;
      }
      
    } catch (error) {
      console.error('Test execution error:', error);
      this.updateStatus('Error: ' + error.message);
      this.results.error = error.message;
    }
  }

  async testUrl(url) {
    const urlResult = {
      url: url,
      timestamp: Date.now(),
      tests: {},
      issues: [],
      metrics: {}
    };

    try {
      // Create tab for testing
      const tab = await chrome.tabs.create({ 
        url: url, 
        active: false 
      });

      try {
        // Wait for page to load
        await this.waitForPageLoad(tab.id);
        
        // PHASE 1: Screenshot capture first (if enabled)
        // This runs BEFORE any viewport modifications
        if (this.config.fullScreenshots) {
          console.log('=== PHASE 1: Starting screenshot capture (desktop and mobile in parallel) ===');
          
          const screenshotPromises = [];
          
          // Desktop screenshot promise
          screenshotPromises.push(
            this.captureScreenshot(tab.id, tab.windowId)
              .then(result => {
                urlResult.tests.screenshot = result;
                if (result.success && result.data) {
                  console.log('Desktop screenshot captured successfully');
                  console.log('Desktop screenshot data structure:', {
                    hasData: !!result.data,
                    dataLength: result.data ? result.data.length : 0,
                    hasSegments: !!result.segments,
                    segmentCount: result.segments ? result.segments.length : 0,
                    isStitched: result.stitched
                  });
                  
                  this.results.screenshots.push({
                    url: url,
                    data: result.data, // This is the full page stitched image or first segment
                    fullPageDataUrl: result.fullPageDataUrl, // Full page if stitched
                    segments: result.segments, // Individual segments for fallback
                    dimensions: result.dimensions,
                    type: 'desktop',
                    timestamp: Date.now(),
                    stitched: result.stitched
                  });
                } else {
                  console.error('Desktop screenshot failed:', result.error);
                }
              })
              .catch(error => {
                console.error('Desktop screenshot capture error:', error);
                urlResult.tests.screenshot = { success: false, error: error.message };
              })
          );
          
          // Mobile screenshot promise (runs in parallel in a separate tab)
          screenshotPromises.push(
            this.captureMobileScreenshot(url)
              .then(mobileResult => {
                urlResult.tests.mobileScreenshot = mobileResult;
                if (mobileResult.success && mobileResult.data) {
                  console.log('Mobile screenshot captured successfully');
                  console.log('Mobile screenshot data structure:', {
                    hasData: !!mobileResult.data,
                    dataLength: mobileResult.data ? mobileResult.data.length : 0,
                    hasSegments: !!mobileResult.segments,
                    segmentCount: mobileResult.segments ? mobileResult.segments.length : 0,
                    isStitched: mobileResult.stitched
                  });
                  
                  this.results.screenshots.push({
                    url: url,
                    data: mobileResult.data, // Full page or first segment
                    fullPageDataUrl: mobileResult.fullPageDataUrl,
                    segments: mobileResult.segments,
                    dimensions: mobileResult.dimensions,
                    type: 'mobile',
                    timestamp: Date.now(),
                    stitched: mobileResult.stitched
                  });
                } else {
                  console.error('Mobile screenshot failed:', mobileResult.error);
                }
              })
              .catch(mobileError => {
                console.error('Mobile screenshot capture error:', mobileError);
                urlResult.tests.mobileScreenshot = { success: false, error: mobileError.message };
              })
          );
          
          // Wait for all screenshots to complete before moving to other tests
          await Promise.allSettled(screenshotPromises);
          console.log('=== PHASE 1 COMPLETE: All screenshots captured ===');
        }
        
        // PHASE 2: Run other tests (after screenshots are done)
        console.log('=== PHASE 2: Running other tests ===');
        const otherTestPromises = [];
        
        // Page analysis (all other tests)
        otherTestPromises.push(
          this.runPageAnalysis(tab.id, url, urlResult)
        );
        
        // Mobile/Tablet testing (now safe to modify viewport after screenshots are done)
        if (this.config.mobileTablet) {
          console.log('Running responsive testing (viewport will be modified)');
          otherTestPromises.push(
            this.testResponsive(tab.id).then(result => {
              urlResult.tests.responsive = result;
              if (result.issues?.length > 0) {
                urlResult.issues.push(...result.issues.map(issue => ({
                  type: 'responsive',
                  severity: 'medium',
                  details: issue
                })));
              }
            })
          );
        }
        
        // Wait for all other tests to complete
        await Promise.allSettled(otherTestPromises);
        console.log('=== PHASE 2 COMPLETE: All tests finished ===');
        
      } finally {
        // Always close the tab
        try {
          await chrome.tabs.remove(tab.id);
        } catch (e) {
          console.error('Failed to close tab:', e);
        }
      }
      
    } catch (error) {
      console.error(`Error testing ${url}:`, error);
      urlResult.error = error.message;
      urlResult.issues.push({
        type: 'test_error',
        severity: 'critical',
        message: error.message
      });
    }
    
    // Add to results
    this.results.urls.push(urlResult);
    this.results.totalIssues += urlResult.issues.length;
    
    // Aggregate issues
    this.results.issues.push(...urlResult.issues.map(issue => ({
      ...issue,
      url: url
    })));
    
    // Generate AI reports for this URL if enabled
    if (this.config.aiAnalysis && !this.stopped) {
      console.log(`Generating AI reports for ${url}...`);
      console.log('AI Analysis enabled:', this.config.aiAnalysis);
      console.log('Total screenshots in results:', this.results.screenshots.length);
      
      // Get screenshots for this URL
      const urlScreenshots = this.results.screenshots.filter(s => s.url === url);
      const urlSeoData = this.results.seoData.find(s => s.url === url);
      
      console.log(`Found ${urlScreenshots.length} screenshots for URL ${url}`);
      console.log('Screenshot types:', urlScreenshots.map(s => s.type));
      
      // Generate visual report if screenshots exist
      if (urlScreenshots.length > 0) {
        console.log('Starting visual AI report generation...');
        const visualReport = await this.generateVisualAIReportForUrl(url, urlScreenshots);
        if (!this.results.aiReports[url]) {
          this.results.aiReports[url] = {};
        }
        this.results.aiReports[url].visual = visualReport;
        console.log('Visual report generated:', visualReport.error ? `Error: ${visualReport.error}` : 'Success');
      } else {
        console.warn(`No screenshots found for ${url}, skipping visual AI analysis`);
        if (!this.results.aiReports[url]) {
          this.results.aiReports[url] = {};
        }
        this.results.aiReports[url].visual = {
          error: 'No screenshots captured for visual analysis',
          timestamp: Date.now(),
          url: url
        };
      }
      
      // Generate technical report with SEO data
      console.log('Starting technical AI report generation...');
      const technicalReport = await this.generateTechnicalAIReportForUrl(url, urlResult, urlSeoData);
      if (!this.results.aiReports[url]) {
        this.results.aiReports[url] = {};
      }
      this.results.aiReports[url].technical = technicalReport;
      console.log('Technical report generated:', technicalReport.error ? `Error: ${technicalReport.error}` : 'Success');
    }
  }

  async captureMobileScreenshot(url) {
    let mobileTab = null;
    let debuggerAttached = false;
    
    try {
      console.log('Creating new tab for mobile screenshot:', url);
      
      // Create a new tab for mobile view
      mobileTab = await chrome.tabs.create({ 
        url: url, 
        active: false 
      });
      
      console.log('Mobile tab created with ID:', mobileTab.id);
      
      // Wait for page to load
      await this.waitForPageLoad(mobileTab.id);
      console.log('Mobile page loaded');
      
      // Attach debugger for mobile emulation
      await chrome.debugger.attach({ tabId: mobileTab.id }, "1.3");
      debuggerAttached = true;
      console.log('Debugger attached for mobile emulation');
      
      // Set mobile device metrics (iPhone 12 Pro)
      await chrome.debugger.sendCommand({ tabId: mobileTab.id }, "Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        mobile: true,
        screenWidth: 390,
        screenHeight: 844,
        positionX: 0,
        positionY: 0
      });
      
      // Set user agent for mobile
      await chrome.debugger.sendCommand({ tabId: mobileTab.id }, "Emulation.setUserAgentOverride", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
      });
      
      console.log('Mobile emulation settings applied');
      
      // Wait for viewport to settle and mobile styles to apply
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Now capture the mobile screenshot using the same scrolling logic
      console.log('Starting mobile screenshot capture with scrolling...');
      const result = await this.captureScreenshot(mobileTab.id, mobileTab.windowId);
      
      console.log('Mobile screenshot capture completed:', result.success ? 'Success' : 'Failed');
      
      return result;
      
    } catch (error) {
      console.error('Mobile screenshot capture error:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        segments: [],
        dimensions: null
      };
    } finally {
      // Clean up: detach debugger and close tab
      if (debuggerAttached && mobileTab) {
        try {
          await chrome.debugger.detach({ tabId: mobileTab.id });
          console.log('Debugger detached');
        } catch (e) {
          console.error('Failed to detach debugger:', e);
        }
      }
      
      if (mobileTab) {
        try {
          await chrome.tabs.remove(mobileTab.id);
          console.log('Mobile tab closed');
        } catch (e) {
          console.error('Failed to close mobile tab:', e);
        }
      }
    }
  }

  async captureScreenshot(tabId, windowId) {
    try {
      console.log('=== DESKTOP SCREENSHOT CAPTURE START ===');
      console.log('Tab ID:', tabId, 'Window ID:', windowId);
      
      // If windowId not provided, get it from tab
      if (!windowId) {
        const tab = await chrome.tabs.get(tabId);
        windowId = tab.windowId;
        console.log('Retrieved windowId from tab:', windowId);
      }
      
      // Check if any debugger is attached (which might interfere)
      const [debuggerCheck] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            hasDebugger: typeof chrome !== 'undefined' && chrome.debugger,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            userAgent: navigator.userAgent
          };
        }
      });
      console.log('Pre-capture check:', debuggerCheck.result);
      
      // Get page dimensions first
      const [dimensionResult] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            document: {
              width: Math.max(
                document.documentElement.scrollWidth,
                document.body.scrollWidth,
                document.documentElement.offsetWidth
              ),
              height: Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
                document.documentElement.offsetHeight
              )
            },
            scrollPosition: {
              x: window.scrollX,
              y: window.scrollY
            },
            devicePixelRatio: window.devicePixelRatio || 1,
            url: window.location.href
          };
        }
      });

      const dimensions = dimensionResult.result;
      console.log('Page dimensions:', dimensions);
      console.log('Document size:', dimensions.document.width + 'x' + dimensions.document.height);
      console.log('Viewport size:', dimensions.viewport.width + 'x' + dimensions.viewport.height);
      
      const viewportHeight = dimensions.viewport.height;
      const totalHeight = dimensions.document.height;
      
      // If page fits in viewport, capture once
      if (totalHeight <= viewportHeight) {
        console.log('Page fits in viewport, single capture');
        const screenshot = await chrome.tabs.captureVisibleTab(windowId, {
          format: 'png',
          quality: 90
        });
        
        // Validate the screenshot was captured
        if (!screenshot) {
          console.error('Single capture failed - no data returned');
          return {
            success: false,
            error: 'Failed to capture screenshot',
            data: null,
            fullPageDataUrl: null,
            segments: [],
            dimensions: dimensions,
            timestamp: Date.now(),
            stitched: false
          };
        }
        
        console.log(`Single screenshot captured, data length: ${screenshot.length}`);
        
        return {
          success: true,
          data: screenshot, // Main screenshot data for AI analysis
          fullPageDataUrl: screenshot, // Same as data since it's a single capture
          segments: [{ dataUrl: screenshot, x: 0, y: 0, height: totalHeight, viewportHeight: viewportHeight, index: 0 }],
          dimensions: dimensions,
          timestamp: Date.now(),
          stitched: false // No stitching needed for single capture
        };
      }
      
      // Calculate scroll positions for full page
      const screenshots = [];
      const scrollPositions = [];
      
      for (let y = 0; y < totalHeight; y += viewportHeight) {
        scrollPositions.push({
          x: 0,
          y: y,
          height: Math.min(viewportHeight, totalHeight - y)
        });
      }
      
      // Limit to reasonable number of captures
      const maxCaptures = 10;
      const capturePositions = scrollPositions.slice(0, maxCaptures);
      console.log(`Will capture ${capturePositions.length} screenshot segments`);
      
      // Capture screenshots with scrolling
      for (let i = 0; i < capturePositions.length; i++) {
        try {
          const pos = capturePositions[i];
          console.log(`Scrolling to position ${i + 1}/${capturePositions.length}: x=${pos.x}, y=${pos.y}`);
          
          // Scroll to position and verify it worked
          const [scrollResult] = await chrome.scripting.executeScript({
            target: { tabId },
            func: (x, y) => {
              window.scrollTo(x, y);
              // Return the actual scroll position to verify it worked
              return {
                scrolledTo: { x: x, y: y },
                actualPosition: { x: window.scrollX, y: window.scrollY },
                success: window.scrollY === y || window.scrollY >= (y - 10) // Allow small difference
              };
            },
            args: [pos.x, pos.y]
          });
          
          console.log('Scroll result:', scrollResult.result);
          
          if (!scrollResult.result.success) {
            console.warn(`Scrolling may have failed. Requested: ${pos.y}, Actual: ${scrollResult.result.actualPosition.y}`);
          }
          
          // Wait for rendering (600ms to avoid rate limiting - max 2 captures/second)
          await new Promise(resolve => setTimeout(resolve, 600));
          
          // Capture visible area
          console.log(`Capturing screenshot segment ${i + 1}`);
          const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
            format: 'png',
            quality: 90
          });
          
          // Validate the captured data
          if (!dataUrl) {
            console.error(`Screenshot segment ${i + 1} returned no data`);
            continue;
          }
          
          console.log(`Screenshot segment ${i + 1} data length: ${dataUrl.length}`);
          
          screenshots.push({
            dataUrl: dataUrl,
            x: pos.x,
            y: pos.y,
            height: pos.height,
            viewportHeight: viewportHeight,
            index: i
          });
          
          console.log(`Screenshot segment ${i + 1} captured and added successfully`);
        } catch (segmentError) {
          console.error(`Failed to capture segment ${i + 1}:`, segmentError);
          // Continue with next segment instead of failing completely
        }
      }
      
      // Check if we captured any screenshots
      console.log(`Total screenshots captured: ${screenshots.length}`);
      
      // If no screenshots were captured, try a fallback capture of current viewport
      if (screenshots.length === 0) {
        console.warn('No screenshots captured during scrolling, attempting fallback capture...');
        try {
          const fallbackScreenshot = await chrome.tabs.captureVisibleTab(windowId, {
            format: 'png',
            quality: 90
          });
          
          if (fallbackScreenshot) {
            screenshots.push({
              dataUrl: fallbackScreenshot,
              x: 0,
              y: 0,
              height: viewportHeight,
              viewportHeight: viewportHeight,
              index: 0
            });
            console.log('Fallback screenshot captured successfully');
          }
        } catch (fallbackError) {
          console.error('Fallback screenshot also failed:', fallbackError);
        }
      }
      
      // Restore original scroll position
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (pos) => window.scrollTo(pos.x, pos.y),
        args: [dimensions.scrollPosition]
      });
      
      // Stitch screenshots together
      let stitchedDataUrl = null;
      try {
        console.log('Starting screenshot stitching process...');
        const [stitchedResult] = await chrome.scripting.executeScript({
          target: { tabId },
          func: (screenshots, pageInfo) => {
            // This function runs in the page context
            return new Promise((resolve) => {
              try {
                // Create canvas for full page
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions
                canvas.width = pageInfo.document.width;
                canvas.height = pageInfo.document.height;
                
                // Track loading of all images
                let loadedCount = 0;
                const totalImages = screenshots.length;
                const images = [];
                
                // Function to draw when all images are loaded
                const checkAndFinish = () => {
                  loadedCount++;
                  if (loadedCount === totalImages) {
                    // All images loaded, now draw them
                    screenshots.forEach((screenshot, index) => {
                      const img = images[index];
                      if (img && img.complete) {
                        // Calculate the actual height to draw
                        const drawHeight = Math.min(
                          screenshot.height,
                          img.height,
                          canvas.height - screenshot.y
                        );
                        
                        // Draw the image at the correct position
                        ctx.drawImage(
                          img,
                          0, 0, img.width, drawHeight,
                          screenshot.x, screenshot.y, pageInfo.document.width, drawHeight
                        );
                      }
                    });
                    
                    // Compress if too large (> 1MB)
                    let quality = 0.9;
                    let fullPageDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // Progressively reduce quality if image is too large
                    while (fullPageDataUrl.length > 1024 * 1024 && quality > 0.3) {
                      quality -= 0.1;
                      fullPageDataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    
                    resolve({
                      success: true,
                      dataUrl: fullPageDataUrl,
                      quality: quality,
                      originalSize: fullPageDataUrl.length
                    });
                  }
                };
                
                // Load all screenshots
                screenshots.forEach((screenshot, index) => {
                  const img = new Image();
                  images[index] = img;
                  
                  img.onload = checkAndFinish;
                  img.onerror = () => {
                    console.error('Failed to load screenshot segment', index);
                    checkAndFinish();
                  };
                  
                  img.src = screenshot.dataUrl;
                });
                
                // Timeout fallback
                setTimeout(() => {
                  resolve({
                    success: false,
                    error: 'Timeout while stitching screenshots'
                  });
                }, 30000);
                
              } catch (error) {
                console.error('Stitching error:', error);
                resolve({
                  success: false,
                  error: error.message
                });
              }
            });
          },
          args: [screenshots, dimensions]
        });
        
        console.log('Stitching result:', stitchedResult.result);
        
        if (stitchedResult.result && stitchedResult.result.success) {
          stitchedDataUrl = stitchedResult.result.dataUrl;
          console.log('Successfully stitched screenshots into full page image');
        }
      } catch (stitchError) {
        console.error('Failed to stitch screenshots:', stitchError);
      }
      
      // Check if we have any valid data to return
      const finalDataUrl = stitchedDataUrl || (screenshots.length > 0 ? screenshots[0].dataUrl : null);
      
      // If no screenshots were captured at all, return failure
      if (!finalDataUrl && screenshots.length === 0) {
        console.error('No screenshots were captured - returning failure');
        return {
          success: false,
          error: 'Failed to capture any screenshots',
          data: null,
          fullPageDataUrl: null,
          segments: [],
          dimensions: dimensions,
          timestamp: Date.now(),
          stitched: false
        };
      }
      
      // Return with proper data structure for AI analysis
      console.log('Returning screenshot data:', {
        hasData: !!finalDataUrl,
        dataLength: finalDataUrl ? finalDataUrl.length : 0,
        segmentCount: screenshots.length,
        isStitched: stitchedDataUrl !== null
      });
      
      return {
        success: true,
        data: finalDataUrl, // Main screenshot data for AI analysis
        fullPageDataUrl: stitchedDataUrl, // Full page stitched image if available
        segments: screenshots, // Individual segments
        dimensions: dimensions,
        timestamp: Date.now(),
        stitched: stitchedDataUrl !== null
      };
    } catch (error) {
      console.error('Screenshot capture error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


  async runPageAnalysis(tabId, url, urlResult) {
    try {
      // Inject content script to analyze the page
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (config) => {
          const analysis = {
            brokenLinks: [],
            layoutIssues: [],
            seoData: {
              headers: [],
              metaTags: {},
              links: { internal: [], external: [] },
              structuredData: [],
              canonical: null
            },
            accessibilityIssues: [],
            seoIssues: [],
            performance: {}
          };

          // Check for broken links
          if (config.brokenLinks) {
            const links = document.querySelectorAll('a[href]');
            links.forEach(link => {
              const href = link.href;
              if (href.includes('404') || href.includes('non-existent') || href.includes('#non-existent')) {
                analysis.brokenLinks.push({
                  href: href,
                  text: link.textContent,
                  selector: link.className || link.id || 'a'
                });
              }
            });
          }

          // Removed staging URL detection - not needed for production testing

          // Check layout issues
          if (config.spacingValidation) {
            // Check for horizontal scroll
            if (document.documentElement.scrollWidth > window.innerWidth) {
              analysis.layoutIssues.push({
                type: 'horizontal_scroll',
                message: 'Page has horizontal scrollbar'
              });
            }

            // Check for overlapping elements
            const elements = document.querySelectorAll('div, section, article, aside, nav, header, footer');
            const rects = [];
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                rects.push({ el, rect });
              }
            });

            for (let i = 0; i < Math.min(rects.length, 50); i++) {
              for (let j = i + 1; j < Math.min(rects.length, 50); j++) {
                const r1 = rects[i].rect;
                const r2 = rects[j].rect;
                if (r1.left < r2.right && r1.right > r2.left &&
                    r1.top < r2.bottom && r1.bottom > r2.top) {
                  analysis.layoutIssues.push({
                    type: 'overlapping_elements',
                    elements: [
                      rects[i].el.tagName + '.' + rects[i].el.className,
                      rects[j].el.tagName + '.' + rects[j].el.className
                    ]
                  });
                  break;
                }
              }
            }
          }

          // Check accessibility
          if (config.accessibility) {
            // Check images without alt text
            const images = document.querySelectorAll('img');
            images.forEach(img => {
              if (!img.alt && !img.getAttribute('aria-label')) {
                analysis.accessibilityIssues.push({
                  type: 'missing_alt_text',
                  element: 'img',
                  src: img.src?.substring(0, 100)
                });
              }
            });

            // Check form inputs without labels
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
              const id = input.id;
              const label = id ? document.querySelector(`label[for="${id}"]`) : null;
              if (!label && !input.getAttribute('aria-label') && input.type !== 'hidden') {
                analysis.accessibilityIssues.push({
                  type: 'missing_label',
                  element: input.tagName.toLowerCase(),
                  inputType: input.type,
                  name: input.name
                });
              }
            });

            // Check heading hierarchy
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            let lastLevel = 0;
            let h1Count = 0;
            headings.forEach(h => {
              const level = parseInt(h.tagName[1]);
              if (level === 1) h1Count++;
              if (level > lastLevel + 1) {
                analysis.accessibilityIssues.push({
                  type: 'heading_hierarchy',
                  message: `Skipped heading level: ${h.tagName} after H${lastLevel}`
                });
              }
              lastLevel = level;
            });
            if (h1Count === 0) {
              analysis.accessibilityIssues.push({
                type: 'missing_h1',
                message: 'Page is missing H1 heading'
              });
            }
          }

          // Enhanced SEO data collection
          if (config.seoCheck) {
            // Collect all headers
            const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headers.forEach(header => {
              analysis.seoData.headers.push({
                tag: header.tagName.toLowerCase(),
                text: header.textContent.trim(),
                level: parseInt(header.tagName[1])
              });
            });

            // Collect meta tags
            const metaTags = document.querySelectorAll('meta');
            metaTags.forEach(meta => {
              const name = meta.getAttribute('name') || meta.getAttribute('property');
              const content = meta.getAttribute('content');
              if (name && content) {
                analysis.seoData.metaTags[name] = content;
              }
            });

            // Collect canonical URL
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) {
              analysis.seoData.canonical = canonical.href;
            }

            // Collect structured data (JSON-LD)
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLdScripts.forEach(script => {
              try {
                const data = JSON.parse(script.textContent);
                analysis.seoData.structuredData.push(data);
              } catch (e) {
                // Invalid JSON-LD
              }
            });

            // Collect all links
            const links = document.querySelectorAll('a[href]');
            const currentHost = window.location.hostname;
            links.forEach(link => {
              const href = link.href;
              const text = link.textContent.trim();
              try {
                const url = new URL(href);
                if (url.hostname === currentHost) {
                  analysis.seoData.links.internal.push({ href, text });
                } else {
                  analysis.seoData.links.external.push({ href, text });
                }
              } catch (e) {
                // Invalid URL
              }
            });

            // Check basic SEO issues
            const metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
              analysis.seoIssues.push({
                type: 'missing_meta_description',
                message: 'Page is missing meta description'
              });
            } else if (metaDesc.content.length < 50) {
              analysis.seoIssues.push({
                type: 'short_meta_description',
                message: 'Meta description is too short',
                length: metaDesc.content.length,
                content: metaDesc.content
              });
            } else if (metaDesc.content.length > 160) {
              analysis.seoIssues.push({
                type: 'long_meta_description',
                message: 'Meta description is too long',
                length: metaDesc.content.length,
                content: metaDesc.content
              });
            }

            // Check title
            const title = document.title;
            if (!title) {
              analysis.seoIssues.push({
                type: 'missing_title',
                message: 'Page is missing title tag'
              });
            } else if (title.length < 30) {
              analysis.seoIssues.push({
                type: 'short_title',
                message: 'Title tag is too short',
                length: title.length,
                content: title
              });
            } else if (title.length > 60) {
              analysis.seoIssues.push({
                type: 'long_title',
                message: 'Title tag is too long',
                length: title.length,
                content: title
              });
            }

            // Check Open Graph tags
            const ogTitle = document.querySelector('meta[property="og:title"]');
            const ogDescription = document.querySelector('meta[property="og:description"]');
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (!ogTitle || !ogDescription || !ogImage) {
              analysis.seoIssues.push({
                type: 'missing_og_tags',
                message: 'Missing Open Graph tags',
                missing: [
                  !ogTitle && 'og:title',
                  !ogDescription && 'og:description', 
                  !ogImage && 'og:image'
                ].filter(Boolean)
              });
            }

            // Check for multiple H1 tags
            const h1Tags = document.querySelectorAll('h1');
            if (h1Tags.length === 0) {
              analysis.seoIssues.push({
                type: 'missing_h1',
                message: 'Page is missing H1 tag'
              });
            } else if (h1Tags.length > 1) {
              analysis.seoIssues.push({
                type: 'multiple_h1',
                message: `Page has ${h1Tags.length} H1 tags (should have only 1)`,
                count: h1Tags.length
              });
            }
          }

          // Basic performance metrics
          if (config.lighthouse && window.performance) {
            const perfData = window.performance.timing;
            analysis.performance = {
              domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
              loadComplete: perfData.loadEventEnd - perfData.navigationStart,
              firstByte: perfData.responseStart - perfData.navigationStart
            };
          }

          return analysis;
        },
        args: [this.config]
      });

      const analysis = result.result;

      // Process broken links
      if (analysis.brokenLinks?.length > 0) {
        urlResult.tests.brokenLinks = { found: analysis.brokenLinks };
        urlResult.issues.push(...analysis.brokenLinks.map(link => ({
          type: 'broken_link',
          severity: 'high',
          details: link
        })));
      }

      // Store SEO data for technical analysis
      if (analysis.seoData) {
        urlResult.seoData = analysis.seoData;
        this.results.seoData.push({
          url: url,
          data: analysis.seoData
        });
      }

      // Process layout issues
      if (analysis.layoutIssues?.length > 0) {
        urlResult.tests.layout = { issues: analysis.layoutIssues };
        urlResult.issues.push(...analysis.layoutIssues.map(issue => ({
          type: 'layout',
          severity: 'low',
          details: issue
        })));
      }

      // Process accessibility issues
      if (analysis.accessibilityIssues?.length > 0) {
        urlResult.tests.accessibility = { issues: analysis.accessibilityIssues };
        urlResult.issues.push(...analysis.accessibilityIssues.map(issue => ({
          type: 'accessibility',
          severity: 'high',
          details: issue
        })));
      }

      // Process SEO issues
      if (analysis.seoIssues?.length > 0) {
        urlResult.tests.seo = { issues: analysis.seoIssues };
        urlResult.issues.push(...analysis.seoIssues.map(issue => ({
          type: 'seo',
          severity: 'medium',
          details: issue
        })));
      }

      // Store performance metrics
      if (analysis.performance) {
        urlResult.metrics = analysis.performance;
        urlResult.tests.performance = { metrics: analysis.performance };
      }

    } catch (error) {
      console.error('Page analysis error:', error);
      urlResult.tests.analysis = { error: error.message };
    }
  }

  async testResponsive(tabId) {
    const devices = [
      { name: 'Mobile', width: 375, height: 667, mobile: true },
      { name: 'Tablet', width: 768, height: 1024, mobile: false }
    ];
    
    const results = {
      devices: [],
      issues: []
    };
    
    for (const device of devices) {
      try {
        // Attach debugger for viewport emulation
        await chrome.debugger.attach({ tabId }, "1.3");
        
        // Set device metrics
        await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
          width: device.width,
          height: device.height,
          deviceScaleFactor: 2,
          mobile: device.mobile
        });
        
        // Wait for reflow
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for responsive issues
        const [result] = await chrome.scripting.executeScript({
          target: { tabId },
          func: (deviceInfo) => {
            const issues = [];
            
            // Check for horizontal scroll
            if (document.documentElement.scrollWidth > window.innerWidth) {
              issues.push({
                type: 'horizontal_scroll',
                device: deviceInfo.name,
                message: 'Page has horizontal scrollbar'
              });
            }
            
            // Check for elements extending beyond viewport
            const elements = document.querySelectorAll('*');
            const overflowingElements = [];
            
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.right > window.innerWidth && rect.width > 50) {
                overflowingElements.push({
                  tag: el.tagName,
                  class: el.className,
                  width: rect.width,
                  overflow: rect.right - window.innerWidth
                });
              }
            });
            
            if (overflowingElements.length > 0) {
              issues.push({
                type: 'element_overflow',
                device: deviceInfo.name,
                elements: overflowingElements.slice(0, 5)
              });
            }
            
            return {
              device: deviceInfo.name,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight
              },
              issues: issues
            };
          },
          args: [device]
        });
        
        results.devices.push(result.result);
        results.issues.push(...(result.result.issues || []));
        
        // Detach debugger
        await chrome.debugger.detach({ tabId });
        
      } catch (error) {
        console.error(`Responsive test error for ${device.name}:`, error);
        
        // Try to detach debugger
        try {
          await chrome.debugger.detach({ tabId });
        } catch (e) {
          // Ignore detach errors
        }
        
        results.issues.push({
          type: 'test_error',
          device: device.name,
          message: error.message
        });
      }
    }
    
    return results;
  }

  async waitForPageLoad(tabId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkStatus = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Page load timeout'));
          return;
        }
        
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (tab.status === 'complete') {
            // Additional wait for JavaScript
            setTimeout(resolve, 2000);
          } else {
            setTimeout(checkStatus, 500);
          }
        });
      };
      
      checkStatus();
    });
  }

  async generateVisualAIReportForUrl(url, urlScreenshots) {
    this.updateStatus(`Generating visual AI analysis for ${url}...`);
    
    console.log('Starting visual AI report generation for URL:', url);
    console.log('Number of screenshots available:', urlScreenshots.length);
    console.log('Screenshot details:', urlScreenshots.map(s => ({
      type: s.type,
      hasData: !!s.data,
      dataLength: s.data ? s.data.length : 0,
      hasFullPageDataUrl: !!s.fullPageDataUrl,
      hasSegments: !!s.segments,
      segmentCount: s.segments ? s.segments.length : 0,
      isStitched: s.stitched
    })));
    
    try {
      // Get API key and model from storage
      const data = await chrome.storage.local.get(['openrouterApiKey', 'openrouterModel']);
      const apiKey = data.openrouterApiKey;
      const modelName = data.openrouterModel || 'google/gemini-2.0-flash-exp:free';
      
      if (!apiKey) {
        throw new Error('OpenRouter API key not found');
      }
      
      // Create multimodal content array for visual analysis
      const content = [];
      
      // Add visual analysis prompt
      content.push({
        type: 'text',
        text: `You are a senior UI/UX designer reviewing these webpage screenshots. Analyze them thoroughly and provide feedback in the following checkbox format. Each issue should be a specific, actionable checkbox item with measurements where applicable.

## Visual & UI/UX Analysis Report

### 🔴 Critical Issues (Must Fix Immediately)
*Issues that severely impact usability, accessibility, or brand perception*

- [ ] [Issue description with specific location and fix, e.g., "Hero CTA button has 1.8:1 contrast ratio - increase to minimum 4.5:1 for WCAG AA compliance"]
- [ ] [Add more critical issues as checkboxes...]

### 🟠 High Priority Issues (Fix Soon)
*Important improvements that significantly enhance user experience*

- [ ] [Issue description with measurements, e.g., "Navigation menu items have only 8px padding - increase to 16px for better touch targets"]
- [ ] [Add more high priority issues as checkboxes...]

### 🟡 Medium Priority Issues (Should Fix)
*Noticeable problems that affect polish and professionalism*

- [ ] [Issue description, e.g., "Footer links are using 3 different font sizes (12px, 14px, 16px) - standardize to 14px"]
- [ ] [Add more medium priority issues as checkboxes...]

### 🟢 Low Priority Enhancements (Nice to Have)
*Minor improvements and optimizations*

- [ ] [Enhancement suggestion, e.g., "Add subtle hover animation (0.2s ease) to card elements for better interactivity"]
- [ ] [Add more enhancements as checkboxes...]

## Detailed Analysis

### Layout & Spacing
[Provide specific observations about spacing consistency, alignment, and layout structure]

### Visual Hierarchy
[Analyze the flow of information and prominence of key elements]

### Color & Contrast
[Detail any contrast issues with specific ratios and WCAG compliance notes]

### Typography
[Comment on font choices, sizes, line heights with specific measurements]

### Mobile/Responsive Considerations
[Note potential issues when viewed on smaller screens based on current design]

### Accessibility Concerns
[List specific WCAG violations or accessibility improvements needed]

## Quick Wins (Can implement in < 1 hour)
1. [Specific quick fix with exact CSS values or changes needed]
2. [Another quick improvement]
3. [Continue as needed...]

Remember to be specific with measurements (px, rem, %, contrast ratios) and provide CSS values where applicable.`
      });
      
      // Add screenshots - include both desktop and mobile versions for this URL
      const desktopScreenshots = urlScreenshots.filter(s => s.type === 'desktop').slice(0, 3);
      const mobileScreenshots = urlScreenshots.filter(s => s.type === 'mobile').slice(0, 2);
      const screenshotsToSend = [...desktopScreenshots, ...mobileScreenshots];
      
      console.log(`Sending ${screenshotsToSend.length} screenshots to AI for ${url} (${desktopScreenshots.length} desktop, ${mobileScreenshots.length} mobile)`);
      
      // Check if we have any valid screenshots
      let validScreenshotCount = 0;
      
      screenshotsToSend.forEach((screenshot, index) => {
        if (screenshot.data) {
          validScreenshotCount++;
          // Properly format the image for OpenRouter - ensure base64 format is correct
          let imageData = screenshot.data;
          
          // Ensure the data URL has the correct format
          if (!imageData.startsWith('data:image/')) {
            console.warn('Screenshot data does not start with data:image/, adding prefix');
            imageData = `data:image/png;base64,${imageData}`;
          }
          
          content.push({
            type: 'image_url',
            image_url: {
              url: imageData
            }
          });
          content.push({
            type: 'text',
            text: `${screenshot.type === 'mobile' ? 'Mobile' : 'Desktop'} screenshot ${index + 1} from: ${screenshot.url}`
          });
        } else {
          console.warn(`Screenshot ${index} has no data:`, screenshot);
        }
      });
      
      // If no valid screenshots, return early
      if (validScreenshotCount === 0) {
        console.error('No valid screenshots found for AI analysis');
        return {
          error: 'No screenshots available for visual analysis',
          timestamp: Date.now(),
          url: url
        };
      }
      
      console.log(`Found ${validScreenshotCount} valid screenshots for AI analysis`);

      // Make API call to OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'QA Testing Suite - Visual Analysis'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(`API error ${response.status}: ${errorMessage}`);
      }

      const result = await response.json();
      
      if (result.choices && result.choices[0] && result.choices[0].message) {
        return {
          content: result.choices[0].message.content,
          timestamp: Date.now(),
          model: modelName,
          url: url
        };
      } else {
        throw new Error('Invalid API response');
      }
      
    } catch (error) {
      console.error('Visual AI report generation error:', error);
      return {
        error: error.message,
        timestamp: Date.now(),
        url: url
      };
    }
  }

  async generateTechnicalAIReportForUrl(url, urlResult, urlSeoData) {
    this.updateStatus(`Generating technical AI analysis for ${url}...`);
    
    try {
      // Get API key and model from storage
      const data = await chrome.storage.local.get(['openrouterApiKey', 'openrouterModel']);
      const apiKey = data.openrouterApiKey;
      const modelName = data.openrouterModel || 'google/gemini-2.0-flash-exp:free';
      
      if (!apiKey) {
        throw new Error('OpenRouter API key not found');
      }
      
      // Prepare technical analysis data for this specific URL
      const technicalData = {
        url: url,
        seoData: urlSeoData ? urlSeoData.data : {},
        issues: urlResult.issues.filter(issue => 
          issue.type === 'seo' || 
          issue.type === 'broken_link' || 
          issue.type === 'missing_h1' ||
          issue.type === 'multiple_h1' ||
          issue.type.includes('meta') ||
          issue.type.includes('title')
        ),
        performance: urlResult.metrics || {},
        accessibility: urlResult.issues.filter(issue => issue.type === 'accessibility')
      };

      // Create content for technical analysis
      const content = [];
      
      // Add technical analysis prompt
      content.push({
        type: 'text',
        text: `You are an SEO expert analyzing the technical SEO data for this webpage. Review the data and provide actionable recommendations in checkbox format.

## URL: ${technicalData.url}

## SEO Data Collected:

**Headers Structure:**
${technicalData.seoData.headers ? technicalData.seoData.headers.map(h => `- ${h.tag}: "${h.text}"`).join('\n') : 'No headers found'}

**Meta Tags:**
${technicalData.seoData.metaTags ? Object.entries(technicalData.seoData.metaTags).map(([key, value]) => `- ${key}: "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}"`).join('\n') : 'No meta tags found'}

**Canonical URL:** ${technicalData.seoData.canonical || 'Not set'}

**Links:**
- Internal links: ${technicalData.seoData.links?.internal?.length || 0}
- External links: ${technicalData.seoData.links?.external?.length || 0}

**Structured Data:** ${technicalData.seoData.structuredData?.length > 0 ? 'Present' : 'Not found'}

## Current Issues:
${technicalData.issues.map(issue => `- [${issue.severity}] ${issue.type}: ${issue.details?.message || JSON.stringify(issue.details).substring(0, 100)}`).join('\n')}

## Broken Links:
${urlResult.issues.filter(i => i.type === 'broken_link').map(link => `- ${link.details?.href || 'Unknown URL'}: "${link.details?.text || 'No text'}"`).join('\n')}

---

## Technical SEO Analysis Report

### 🔴 Critical SEO Issues (Fix Immediately)
*Issues that prevent search engines from properly crawling/indexing your site*

- [ ] [Specific issue, e.g., "Missing H1 tag - add descriptive H1 with primary keyword 'product name'"]
- [ ] [Another critical issue, e.g., "Title tag is 85 characters (exceeds 60) - shorten to: 'Your New Title Here | Brand'"]
- [ ] [Add more critical issues as needed...]

### 🟠 High Priority SEO Issues (Fix This Week)
*Important optimizations that significantly impact search rankings*

- [ ] [Issue with solution, e.g., "Meta description missing - add 150-160 character description with CTA"]
- [ ] [Another issue, e.g., "No canonical URL set - add <link rel='canonical' href='${technicalData.url}'>"]
- [ ] [Continue with high priority items...]

### 🟡 Medium Priority Optimizations (Fix This Month)
*Improvements that enhance SEO performance*

- [ ] [Optimization task, e.g., "Add schema.org Product markup for better rich snippets"]
- [ ] [Another task, e.g., "Optimize image alt texts - 5 images missing descriptive alt attributes"]
- [ ] [Add more medium priority items...]

### 🟢 Low Priority Enhancements (Nice to Have)
*Minor optimizations for competitive edge*

- [ ] [Enhancement, e.g., "Add breadcrumb schema markup for better SERP appearance"]
- [ ] [Another enhancement, e.g., "Implement FAQ schema for potential featured snippets"]
- [ ] [Continue with enhancements...]

## Detailed Technical Analysis

### On-Page SEO Score: [X/100]
**Title Tag:** [Current length] characters - [Assessment]
**Meta Description:** [Current length] characters - [Assessment]
**H1 Usage:** [Number of H1s] - [Assessment]
**Header Hierarchy:** [Assessment of H1-H6 structure]

### Content Quality Metrics
**Word Count:** [Approximate based on headers]
**Internal Links:** ${technicalData.seoData.links?.internal?.length || 0} links
**External Links:** ${technicalData.seoData.links?.external?.length || 0} links
**Link Quality:** [Assessment]

### Technical Health
**Broken Links:** [Number found]
**Canonical Status:** ${technicalData.seoData.canonical ? 'Set' : 'Missing'}
**Structured Data:** ${technicalData.seoData.structuredData?.length > 0 ? 'Present' : 'Missing'}
**Open Graph Tags:** [Assessment]

## Quick SEO Wins (Implement Today)
1. [Specific quick fix with exact implementation]
2. [Another quick win with code snippet if applicable]
3. [Continue with actionable quick wins...]

## Expected Impact
- **Immediate (1-2 weeks):** [Expected improvements]
- **Short-term (1-3 months):** [Expected ranking improvements]
- **Long-term (3-6 months):** [Expected traffic increase]

Remember to be specific with character counts, provide exact meta tag content, and include code snippets where helpful.`
      });

      // Make API call to OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'QA Testing Suite - Technical Analysis'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(`API error ${response.status}: ${errorMessage}`);
      }

      const result = await response.json();
      
      if (result.choices && result.choices[0] && result.choices[0].message) {
        return {
          content: result.choices[0].message.content,
          timestamp: Date.now(),
          model: modelName,
          url: url
        };
      } else {
        throw new Error('Invalid API response');
      }
      
    } catch (error) {
      console.error('Technical AI report generation error:', error);
      return {
        error: error.message,
        timestamp: Date.now(),
        url: url
      };
    }
  }

  updateStatus(status) {
    this.progress.status = status;
  }

  getProgress() {
    return { ...this.progress };
  }

  getResults() {
    return { ...this.results };
  }

  async stop() {
    this.stopped = true;
    this.updateStatus('Stopped by user');
  }
}

// Initialize background service
new QATestingBackground();