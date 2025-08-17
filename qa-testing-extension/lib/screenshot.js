// Screenshot capture module
export class ScreenshotCapture {
  constructor() {
    this.maxRetries = 3;
  }

  async capture(tabId) {
    try {
      // Get page dimensions from content script
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
            devicePixelRatio: window.devicePixelRatio || 1
          };
        }
      });

      const dimensions = dimensionResult.result;
      const viewportHeight = dimensions.viewport.height;
      const totalHeight = dimensions.document.height;
      
      // If page fits in viewport, capture once
      if (totalHeight <= viewportHeight) {
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
          format: 'png',
          quality: 90
        });
        return {
          success: true,
          data: screenshot,
          fullPageScreenshot: screenshot,
          dimensions: dimensions,
          captureCount: 1,
          timestamp: Date.now()
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
      
      // Capture screenshots by scrolling
      for (let i = 0; i < capturePositions.length; i++) {
        const pos = capturePositions[i];
        
        // Scroll to position
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (x, y) => window.scrollTo(x, y),
          args: [pos.x, pos.y]
        });
        
        // Wait for rendering (600ms to avoid rate limiting)
        await this.wait(600);
        
        // Capture visible area
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: 'png',
          quality: 90
        });
        
        screenshots.push({
          dataUrl: dataUrl,
          x: pos.x,
          y: pos.y,
          height: pos.height,
          viewportHeight: viewportHeight,
          index: i
        });
      }
      
      // Restore original scroll position
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (pos) => window.scrollTo(pos.x, pos.y),
        args: [dimensions.scrollPosition]
      });
      
      // Stitch screenshots together
      let fullPageScreenshot = null;
      try {
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
        
        if (stitchedResult.result && stitchedResult.result.success) {
          fullPageScreenshot = stitchedResult.result.dataUrl;
        }
      } catch (stitchError) {
        console.error('Failed to stitch screenshots:', stitchError);
      }
      
      return {
        success: true,
        data: screenshots,
        fullPageScreenshot: fullPageScreenshot || (screenshots.length > 0 ? screenshots[0].dataUrl : null),
        dimensions: dimensions,
        captureCount: screenshots.length,
        timestamp: Date.now(),
        stitched: fullPageScreenshot !== null
      };
      
    } catch (error) {
      console.error('Screenshot capture error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


  async captureFullPage(tabId) {
    try {
      // Alternative method using offscreen API if available
      const hasOffscreen = chrome.offscreen !== undefined;
      
      if (hasOffscreen) {
        return await this.captureWithOffscreen(tabId);
      } else {
        return await this.capture(tabId);
      }
    } catch (error) {
      console.error('Full page capture error:', error);
      return await this.capture(tabId); // Fallback to regular capture
    }
  }

  async captureWithOffscreen(tabId) {
    try {
      // Create offscreen document for capturing
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Capturing full page screenshot'
      });

      // Get tab info
      const tab = await chrome.tabs.get(tabId);
      
      // Send message to offscreen document
      const response = await chrome.runtime.sendMessage({
        action: 'captureFullPage',
        url: tab.url
      });

      // Close offscreen document
      await chrome.offscreen.closeDocument();

      return response;
    } catch (error) {
      console.error('Offscreen capture error:', error);
      return await this.capture(tabId);
    }
  }

  async captureElement(tabId, selector) {
    try {
      // Get element bounds
      const [boundsResult] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => {
          const element = document.querySelector(sel);
          if (!element) return null;
          
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height
          };
        },
        args: [selector]
      });

      if (!boundsResult.result) {
        throw new Error('Element not found');
      }

      const bounds = boundsResult.result;

      // Scroll element into view
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => {
          document.querySelector(sel)?.scrollIntoView({ 
            behavior: 'instant', 
            block: 'center' 
          });
        },
        args: [selector]
      });

      await this.wait(500);

      // Capture screenshot
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 90
      });

      return {
        success: true,
        dataUrl: dataUrl,
        bounds: bounds,
        selector: selector
      };

    } catch (error) {
      console.error('Element capture error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}