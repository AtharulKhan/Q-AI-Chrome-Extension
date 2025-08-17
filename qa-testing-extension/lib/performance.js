// Performance analyzer module
export class PerformanceAnalyzer {
  constructor() {
    this.thresholds = {
      fcp: { good: 1800, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      ttfb: { good: 800, needsImprovement: 1800 }
    };
  }

  async analyze(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const metrics = {
            timing: {},
            paint: {},
            resources: {},
            memory: {},
            webVitals: {},
            networkInfo: {}
          };
          
          const issues = [];
          let performanceScore = 100;
          
          // Navigation Timing API
          if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const navigationStart = timing.navigationStart;
            
            metrics.timing = {
              // Page load times
              domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
              loadComplete: timing.loadEventEnd - navigationStart,
              
              // Network timings
              dns: timing.domainLookupEnd - timing.domainLookupStart,
              tcp: timing.connectEnd - timing.connectStart,
              ttfb: timing.responseStart - navigationStart,
              
              // Processing times
              domProcessing: timing.domComplete - timing.domLoading,
              domInteractive: timing.domInteractive - navigationStart,
              
              // Resource timings
              responseTime: timing.responseEnd - timing.responseStart,
              requestTime: timing.responseStart - timing.requestStart,
              
              // Detailed breakdown
              redirect: timing.redirectEnd - timing.redirectStart,
              appCache: timing.domainLookupStart - timing.fetchStart,
              unloadEvent: timing.unloadEventEnd - timing.unloadEventStart,
              domReadyTime: timing.domContentLoadedEventEnd - navigationStart
            };
            
            // Check for slow metrics
            if (metrics.timing.ttfb > 1800) {
              issues.push({
                type: 'slow_ttfb',
                severity: 'high',
                value: metrics.timing.ttfb,
                threshold: 1800,
                message: `Time to First Byte is slow (${metrics.timing.ttfb}ms)`,
                impact: -10
              });
              performanceScore -= 10;
            }
            
            if (metrics.timing.domContentLoaded > 3000) {
              issues.push({
                type: 'slow_dom_content_loaded',
                severity: 'medium',
                value: metrics.timing.domContentLoaded,
                threshold: 3000,
                message: `DOM Content Loaded is slow (${metrics.timing.domContentLoaded}ms)`,
                impact: -8
              });
              performanceScore -= 8;
            }
            
            if (metrics.timing.loadComplete > 5000) {
              issues.push({
                type: 'slow_page_load',
                severity: 'high',
                value: metrics.timing.loadComplete,
                threshold: 5000,
                message: `Page load time is slow (${metrics.timing.loadComplete}ms)`,
                impact: -10
              });
              performanceScore -= 10;
            }
          }
          
          // Paint Timing API
          if (window.performance && window.performance.getEntriesByType) {
            const paintEntries = window.performance.getEntriesByType('paint');
            paintEntries.forEach(entry => {
              metrics.paint[entry.name] = Math.round(entry.startTime);
            });
            
            // First Contentful Paint
            const fcp = metrics.paint['first-contentful-paint'];
            if (fcp) {
              if (fcp > 3000) {
                issues.push({
                  type: 'slow_fcp',
                  severity: 'high',
                  value: fcp,
                  threshold: 3000,
                  message: `First Contentful Paint is slow (${fcp}ms)`,
                  impact: -10
                });
                performanceScore -= 10;
              } else if (fcp > 1800) {
                issues.push({
                  type: 'moderate_fcp',
                  severity: 'medium',
                  value: fcp,
                  threshold: 1800,
                  message: `First Contentful Paint needs improvement (${fcp}ms)`,
                  impact: -5
                });
                performanceScore -= 5;
              }
            }
          }
          
          // Largest Contentful Paint (if available)
          try {
            const lcpEntries = window.performance.getEntriesByType('largest-contentful-paint');
            if (lcpEntries && lcpEntries.length > 0) {
              const lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
              metrics.webVitals.lcp = lcp;
              
              if (lcp > 4000) {
                issues.push({
                  type: 'slow_lcp',
                  severity: 'high',
                  value: lcp,
                  threshold: 4000,
                  message: `Largest Contentful Paint is slow (${lcp}ms)`,
                  impact: -10
                });
                performanceScore -= 10;
              } else if (lcp > 2500) {
                issues.push({
                  type: 'moderate_lcp',
                  severity: 'medium',
                  value: lcp,
                  threshold: 2500,
                  message: `Largest Contentful Paint needs improvement (${lcp}ms)`,
                  impact: -5
                });
                performanceScore -= 5;
              }
            }
          } catch (e) {
            // LCP not supported
          }
          
          // Resource Timing
          if (window.performance && window.performance.getEntriesByType) {
            const resources = window.performance.getEntriesByType('resource');
            
            metrics.resources = {
              total: resources.length,
              byType: {},
              slowResources: [],
              largeResources: [],
              totalSize: 0,
              totalDuration: 0
            };
            
            const typeCount = {};
            const typeSizes = {};
            const typeDurations = {};
            
            resources.forEach(resource => {
              const type = resource.initiatorType;
              typeCount[type] = (typeCount[type] || 0) + 1;
              typeSizes[type] = (typeSizes[type] || 0) + (resource.transferSize || 0);
              typeDurations[type] = (typeDurations[type] || 0) + resource.duration;
              
              metrics.resources.totalSize += resource.transferSize || 0;
              metrics.resources.totalDuration += resource.duration;
              
              // Check for slow resources
              if (resource.duration > 1000) {
                metrics.resources.slowResources.push({
                  name: resource.name.split('/').pop().substring(0, 50),
                  duration: Math.round(resource.duration),
                  type: type
                });
              }
              
              // Check for large resources
              if (resource.transferSize > 500000) { // 500KB
                metrics.resources.largeResources.push({
                  name: resource.name.split('/').pop().substring(0, 50),
                  size: Math.round(resource.transferSize / 1024), // Convert to KB
                  type: type
                });
              }
            });
            
            metrics.resources.byType = Object.keys(typeCount).map(type => ({
              type: type,
              count: typeCount[type],
              totalSize: Math.round(typeSizes[type] / 1024), // KB
              totalDuration: Math.round(typeDurations[type])
            }));
            
            // Check for too many resources
            if (resources.length > 100) {
              issues.push({
                type: 'too_many_resources',
                severity: 'medium',
                value: resources.length,
                threshold: 100,
                message: `Too many resources loaded (${resources.length})`,
                impact: -5
              });
              performanceScore -= 5;
            }
            
            // Check for large page size
            const totalSizeMB = metrics.resources.totalSize / (1024 * 1024);
            if (totalSizeMB > 5) {
              issues.push({
                type: 'large_page_size',
                severity: 'high',
                value: totalSizeMB.toFixed(2),
                threshold: 5,
                message: `Page size is too large (${totalSizeMB.toFixed(2)} MB)`,
                impact: -10
              });
              performanceScore -= 10;
            } else if (totalSizeMB > 3) {
              issues.push({
                type: 'moderate_page_size',
                severity: 'medium',
                value: totalSizeMB.toFixed(2),
                threshold: 3,
                message: `Page size needs optimization (${totalSizeMB.toFixed(2)} MB)`,
                impact: -5
              });
              performanceScore -= 5;
            }
            
            // Check for slow resources
            if (metrics.resources.slowResources.length > 5) {
              issues.push({
                type: 'many_slow_resources',
                severity: 'medium',
                count: metrics.resources.slowResources.length,
                examples: metrics.resources.slowResources.slice(0, 3),
                message: `${metrics.resources.slowResources.length} slow-loading resources detected`,
                impact: -5
              });
              performanceScore -= 5;
            }
            
            // Check for large resources
            if (metrics.resources.largeResources.length > 0) {
              issues.push({
                type: 'large_resources',
                severity: 'medium',
                count: metrics.resources.largeResources.length,
                examples: metrics.resources.largeResources.slice(0, 3),
                message: `${metrics.resources.largeResources.length} large resources detected`,
                impact: -5
              });
              performanceScore -= 5;
            }
          }
          
          // Memory usage (if available)
          if (window.performance.memory) {
            metrics.memory = {
              usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1048576),
              totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1048576),
              jsHeapSizeLimit: Math.round(window.performance.memory.jsHeapSizeLimit / 1048576),
              usage: Math.round((window.performance.memory.usedJSHeapSize / 
                               window.performance.memory.jsHeapSizeLimit) * 100)
            };
            
            if (metrics.memory.usedJSHeapSize > 50) {
              issues.push({
                type: 'high_memory_usage',
                severity: 'medium',
                value: metrics.memory.usedJSHeapSize,
                threshold: 50,
                message: `High JavaScript memory usage (${metrics.memory.usedJSHeapSize} MB)`,
                impact: -5
              });
              performanceScore -= 5;
            }
          }
          
          // Connection info (if available)
          if (navigator.connection) {
            metrics.networkInfo = {
              effectiveType: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              rtt: navigator.connection.rtt,
              saveData: navigator.connection.saveData
            };
            
            // Warn if on slow connection
            if (navigator.connection.effectiveType === '2g' || 
                navigator.connection.effectiveType === 'slow-2g') {
              issues.push({
                type: 'slow_connection',
                severity: 'info',
                connection: navigator.connection.effectiveType,
                message: 'User is on a slow connection',
                impact: 0
              });
            }
          }
          
          // Check for render-blocking resources
          const scripts = Array.from(document.querySelectorAll('script[src]'));
          const renderBlockingScripts = scripts.filter(s => 
            !s.async && !s.defer && s.src && 
            document.head.contains(s)
          );
          
          if (renderBlockingScripts.length > 0) {
            issues.push({
              type: 'render_blocking_scripts',
              severity: 'high',
              count: renderBlockingScripts.length,
              message: `${renderBlockingScripts.length} render-blocking scripts in head`,
              impact: -8
            });
            performanceScore -= 8;
          }
          
          // Check for render-blocking stylesheets
          const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
          const renderBlockingStyles = stylesheets.filter(link => 
            !link.media || link.media === 'all' || link.media === 'screen'
          );
          
          if (renderBlockingStyles.length > 5) {
            issues.push({
              type: 'many_stylesheets',
              severity: 'medium',
              count: renderBlockingStyles.length,
              message: `${renderBlockingStyles.length} render-blocking stylesheets`,
              impact: -5
            });
            performanceScore -= 5;
          }
          
          // Check for inline styles
          const inlineStyles = document.querySelectorAll('style');
          const elementsWithInlineStyle = document.querySelectorAll('[style]');
          
          if (inlineStyles.length > 10) {
            issues.push({
              type: 'many_inline_styles',
              severity: 'low',
              count: inlineStyles.length,
              message: `${inlineStyles.length} inline style blocks detected`,
              impact: -3
            });
            performanceScore -= 3;
          }
          
          if (elementsWithInlineStyle.length > 50) {
            issues.push({
              type: 'many_inline_style_attributes',
              severity: 'low',
              count: elementsWithInlineStyle.length,
              message: `${elementsWithInlineStyle.length} elements with inline styles`,
              impact: -3
            });
            performanceScore -= 3;
          }
          
          // Check for unused CSS (simplified check)
          const allStyleRules = [];
          try {
            Array.from(document.styleSheets).forEach(sheet => {
              try {
                if (sheet.cssRules) {
                  Array.from(sheet.cssRules).forEach(rule => {
                    if (rule.selectorText) {
                      allStyleRules.push(rule.selectorText);
                    }
                  });
                }
              } catch (e) {
                // Cross-origin stylesheet
              }
            });
            
            let unusedSelectors = 0;
            allStyleRules.forEach(selector => {
              try {
                if (!document.querySelector(selector)) {
                  unusedSelectors++;
                }
              } catch (e) {
                // Invalid selector
              }
            });
            
            if (unusedSelectors > 100) {
              issues.push({
                type: 'unused_css',
                severity: 'medium',
                count: unusedSelectors,
                total: allStyleRules.length,
                message: `Potentially ${unusedSelectors} unused CSS rules`,
                impact: -5
              });
              performanceScore -= 5;
            }
          } catch (e) {
            // Error checking stylesheets
          }
          
          // Check for lazy loading
          const images = document.querySelectorAll('img');
          const lazyLoadedImages = Array.from(images).filter(img => img.loading === 'lazy');
          
          if (images.length > 10 && lazyLoadedImages.length < images.length / 2) {
            issues.push({
              type: 'missing_lazy_loading',
              severity: 'medium',
              total: images.length,
              lazyLoaded: lazyLoadedImages.length,
              message: 'Most images are not lazy loaded',
              impact: -5
            });
            performanceScore -= 5;
          }
          
          // Check for browser caching headers (simplified)
          const cacheableResources = resources?.filter(r => 
            r.name.match(/\.(js|css|jpg|jpeg|png|gif|svg|woff|woff2|ttf)$/i)
          ) || [];
          
          // Note: We can't check actual cache headers from the client side,
          // but we can flag if there are many cacheable resources
          if (cacheableResources.length > 20) {
            issues.push({
              type: 'many_cacheable_resources',
              severity: 'info',
              count: cacheableResources.length,
              message: 'Ensure proper browser caching is configured',
              impact: 0
            });
          }
          
          // Calculate Core Web Vitals score
          let webVitalsScore = 'Good';
          if (metrics.webVitals.lcp > 4000 || metrics.paint['first-contentful-paint'] > 3000) {
            webVitalsScore = 'Poor';
          } else if (metrics.webVitals.lcp > 2500 || metrics.paint['first-contentful-paint'] > 1800) {
            webVitalsScore = 'Needs Improvement';
          }
          
          return {
            score: Math.max(0, performanceScore),
            metrics: metrics,
            issues: issues,
            webVitalsScore: webVitalsScore,
            summary: {
              high: issues.filter(i => i.severity === 'high').length,
              medium: issues.filter(i => i.severity === 'medium').length,
              low: issues.filter(i => i.severity === 'low').length,
              info: issues.filter(i => i.severity === 'info').length
            }
          };
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('Performance analysis error:', error);
      return {
        error: error.message,
        score: 0,
        metrics: {},
        issues: []
      };
    }
  }

  async measureCLS(tabId) {
    // Cumulative Layout Shift measurement
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          let clsValue = 0;
          let clsEntries = [];
          
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                  clsEntries.push({
                    value: entry.value,
                    time: entry.startTime
                  });
                }
              }
            });
            
            observer.observe({ type: 'layout-shift', buffered: true });
            
            // Get buffered entries
            const entries = performance.getEntriesByType('layout-shift');
            entries.forEach(entry => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                clsEntries.push({
                  value: entry.value,
                  time: entry.startTime
                });
              }
            });
            
            observer.disconnect();
          } catch (e) {
            // CLS not supported
          }
          
          return {
            value: clsValue,
            entries: clsEntries,
            rating: clsValue <= 0.1 ? 'Good' : clsValue <= 0.25 ? 'Needs Improvement' : 'Poor'
          };
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('CLS measurement error:', error);
      return { value: 0, entries: [], error: error.message };
    }
  }
}