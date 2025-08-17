// Layout validation module
export class LayoutValidator {
  constructor() {
    this.viewportSizes = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1920, height: 1080 }
    };
  }

  async validate(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const issues = [];
          const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
          };
          
          // Check for horizontal scroll
          if (document.documentElement.scrollWidth > window.innerWidth) {
            issues.push({
              type: 'horizontal_scroll',
              severity: 'high',
              scrollWidth: document.documentElement.scrollWidth,
              viewportWidth: window.innerWidth,
              overflow: document.documentElement.scrollWidth - window.innerWidth,
              message: 'Page has horizontal scrollbar'
            });
          }
          
          // Get all visible elements
          const elements = Array.from(document.querySelectorAll('*')).filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            
            return rect.width > 0 && 
                   rect.height > 0 && 
                   style.display !== 'none' && 
                   style.visibility !== 'hidden' &&
                   style.opacity !== '0';
          });
          
          // Check for elements extending beyond viewport
          const overflowingElements = [];
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            
            if (rect.right > window.innerWidth && rect.width > 50) {
              overflowingElements.push({
                tag: el.tagName.toLowerCase(),
                class: el.className,
                id: el.id,
                width: Math.round(rect.width),
                overflow: Math.round(rect.right - window.innerWidth),
                text: el.textContent.trim().substring(0, 30)
              });
            }
          });
          
          if (overflowingElements.length > 0) {
            issues.push({
              type: 'element_overflow',
              severity: 'medium',
              count: overflowingElements.length,
              elements: overflowingElements.slice(0, 5),
              message: `${overflowingElements.length} elements extend beyond viewport`
            });
          }
          
          // Check for overlapping elements
          const overlaps = [];
          const checkedPairs = new Set();
          
          for (let i = 0; i < Math.min(elements.length, 200); i++) {
            const el1 = elements[i];
            const rect1 = el1.getBoundingClientRect();
            
            // Skip very small elements
            if (rect1.width < 10 || rect1.height < 10) continue;
            
            for (let j = i + 1; j < Math.min(elements.length, 200); j++) {
              const el2 = elements[j];
              
              // Skip if parent-child relationship
              if (el1.contains(el2) || el2.contains(el1)) continue;
              
              const rect2 = el2.getBoundingClientRect();
              
              // Skip very small elements
              if (rect2.width < 10 || rect2.height < 10) continue;
              
              // Check for overlap
              if (!(rect1.right < rect2.left || 
                    rect1.left > rect2.right || 
                    rect1.bottom < rect2.top || 
                    rect1.top > rect2.bottom)) {
                
                const pairKey = `${i}-${j}`;
                if (!checkedPairs.has(pairKey)) {
                  checkedPairs.add(pairKey);
                  
                  // Check if this is intentional overlap (like absolute positioning)
                  const style1 = window.getComputedStyle(el1);
                  const style2 = window.getComputedStyle(el2);
                  
                  if (style1.position === 'static' && style2.position === 'static') {
                    overlaps.push({
                      element1: {
                        tag: el1.tagName.toLowerCase(),
                        class: el1.className,
                        text: el1.textContent.trim().substring(0, 20)
                      },
                      element2: {
                        tag: el2.tagName.toLowerCase(),
                        class: el2.className,
                        text: el2.textContent.trim().substring(0, 20)
                      }
                    });
                  }
                }
                
                if (overlaps.length >= 10) break;
              }
            }
            
            if (overlaps.length >= 10) break;
          }
          
          if (overlaps.length > 0) {
            issues.push({
              type: 'element_overlap',
              severity: 'low',
              count: overlaps.length,
              examples: overlaps.slice(0, 3),
              message: `${overlaps.length} overlapping elements detected`
            });
          }
          
          // Check for broken layout patterns
          const layoutProblems = [];
          
          // Check for zero-height containers with content
          document.querySelectorAll('div, section, article, main, aside').forEach(container => {
            const rect = container.getBoundingClientRect();
            const children = container.children;
            
            if (rect.height === 0 && children.length > 0) {
              let hasVisibleChildren = false;
              for (let child of children) {
                const childRect = child.getBoundingClientRect();
                if (childRect.height > 0) {
                  hasVisibleChildren = true;
                  break;
                }
              }
              
              if (hasVisibleChildren) {
                layoutProblems.push({
                  type: 'zero_height_container',
                  tag: container.tagName.toLowerCase(),
                  class: container.className,
                  id: container.id,
                  childCount: children.length
                });
              }
            }
          });
          
          // Check for text overflow
          document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, a, button').forEach(el => {
            if (el.scrollWidth > el.clientWidth) {
              const style = window.getComputedStyle(el);
              if (style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis') {
                layoutProblems.push({
                  type: 'text_overflow',
                  tag: el.tagName.toLowerCase(),
                  class: el.className,
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth,
                  text: el.textContent.trim().substring(0, 30)
                });
              }
            }
          });
          
          if (layoutProblems.length > 0) {
            issues.push({
              type: 'layout_problems',
              severity: 'medium',
              count: layoutProblems.length,
              examples: layoutProblems.slice(0, 5),
              message: `${layoutProblems.length} layout problems detected`
            });
          }
          
          // Check spacing consistency
          const spacingIssues = [];
          const containers = document.querySelectorAll('.container, .wrapper, .content, main, article, section');
          
          containers.forEach(container => {
            const style = window.getComputedStyle(container);
            const children = Array.from(container.children).filter(child => {
              const childStyle = window.getComputedStyle(child);
              return childStyle.display !== 'none';
            });
            
            if (children.length > 2) {
              const gaps = [];
              
              for (let i = 0; i < children.length - 1; i++) {
                const rect1 = children[i].getBoundingClientRect();
                const rect2 = children[i + 1].getBoundingClientRect();
                const gap = rect2.top - rect1.bottom;
                
                if (gap >= 0) {
                  gaps.push(gap);
                }
              }
              
              // Check for inconsistent spacing
              if (gaps.length > 1) {
                const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
                const variance = gaps.map(g => Math.abs(g - avgGap));
                const maxVariance = Math.max(...variance);
                
                if (maxVariance > avgGap * 0.5 && maxVariance > 10) {
                  spacingIssues.push({
                    container: {
                      tag: container.tagName.toLowerCase(),
                      class: container.className
                    },
                    avgGap: Math.round(avgGap),
                    maxVariance: Math.round(maxVariance),
                    gaps: gaps.map(g => Math.round(g))
                  });
                }
              }
            }
          });
          
          if (spacingIssues.length > 0) {
            issues.push({
              type: 'inconsistent_spacing',
              severity: 'low',
              count: spacingIssues.length,
              examples: spacingIssues.slice(0, 3),
              message: 'Inconsistent spacing between elements'
            });
          }
          
          // Check z-index issues
          const zIndexElements = elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.zIndex !== 'auto' && parseInt(style.zIndex) !== 0;
          });
          
          const highZIndexElements = zIndexElements.filter(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            return zIndex > 9999;
          });
          
          if (highZIndexElements.length > 0) {
            issues.push({
              type: 'high_z_index',
              severity: 'low',
              count: highZIndexElements.length,
              examples: highZIndexElements.slice(0, 3).map(el => ({
                tag: el.tagName.toLowerCase(),
                class: el.className,
                zIndex: window.getComputedStyle(el).zIndex
              })),
              message: 'Extremely high z-index values detected'
            });
          }
          
          return {
            viewport: viewport,
            totalIssues: issues.length,
            issues: issues
          };
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('Layout validation error:', error);
      return {
        error: error.message,
        issues: []
      };
    }
  }

  async checkResponsive(tabId, width, height) {
    try {
      // Use debugger API to set viewport size
      await chrome.debugger.attach({ tabId }, "1.3");
      
      await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
        width: width,
        height: height,
        deviceScaleFactor: 1,
        mobile: width < 768
      });
      
      // Wait for reflow
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run layout validation at this viewport size
      const validation = await this.validate(tabId);
      
      // Detach debugger
      await chrome.debugger.detach({ tabId });
      
      return {
        viewport: { width, height },
        ...validation
      };
      
    } catch (error) {
      console.error('Responsive check error:', error);
      
      // Try to detach debugger if error occurred
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {
        // Ignore detach errors
      }
      
      return {
        error: error.message,
        viewport: { width, height },
        issues: []
      };
    }
  }
}