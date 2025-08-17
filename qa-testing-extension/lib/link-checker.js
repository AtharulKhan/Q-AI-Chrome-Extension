// Link checker module
export class LinkChecker {
  constructor() {
    this.timeout = 5000;
    this.maxLinksToCheck = 100;
  }

  async check(tabId) {
    try {
      // Get all links from the page
      const [linksResult] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const links = Array.from(document.querySelectorAll('a[href]'));
          return links.map(link => ({
            href: link.href,
            text: link.textContent.trim(),
            title: link.title,
            target: link.target,
            isInternal: link.href.startsWith(window.location.origin),
            element: {
              tag: link.tagName,
              id: link.id,
              className: link.className
            }
          }));
        }
      });

      const links = linksResult.result;
      const results = {
        total: links.length,
        checked: 0,
        brokenLinks: [],
        redirects: [],
        slowLinks: [],
        errors: []
      };

      // Limit number of links to check
      const linksToCheck = links.slice(0, this.maxLinksToCheck);
      
      // Check each link
      const checkPromises = linksToCheck.map(link => this.checkLink(link));
      const checkResults = await Promise.allSettled(checkPromises);
      
      checkResults.forEach((result, index) => {
        results.checked++;
        
        if (result.status === 'fulfilled') {
          const linkResult = result.value;
          const link = linksToCheck[index];
          
          if (linkResult.error) {
            results.errors.push({
              ...link,
              error: linkResult.error
            });
          } else if (linkResult.status >= 400) {
            results.brokenLinks.push({
              ...link,
              status: linkResult.status,
              statusText: linkResult.statusText
            });
          } else if (linkResult.status >= 300 && linkResult.status < 400) {
            results.redirects.push({
              ...link,
              status: linkResult.status,
              redirectUrl: linkResult.redirectUrl
            });
          }
          
          if (linkResult.responseTime > 3000) {
            results.slowLinks.push({
              ...link,
              responseTime: linkResult.responseTime
            });
          }
        }
      });

      return results;

    } catch (error) {
      console.error('Link checker error:', error);
      return {
        error: error.message,
        total: 0,
        checked: 0,
        brokenLinks: []
      };
    }
  }

  async checkLink(link) {
    const startTime = Date.now();
    
    try {
      // Use fetch with HEAD request for efficiency
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(link.href, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual'
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.status,
        statusText: response.statusText,
        responseTime: responseTime,
        redirectUrl: response.headers.get('location')
      };
      
    } catch (error) {
      // Try GET request if HEAD fails
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(link.href, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'manual'
        });
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        
        return {
          status: response.status,
          statusText: response.statusText,
          responseTime: responseTime,
          redirectUrl: response.headers.get('location')
        };
        
      } catch (fallbackError) {
        return {
          error: fallbackError.message,
          responseTime: Date.now() - startTime
        };
      }
    }
  }

  async checkInternalLinks(tabId) {
    try {
      // Get internal links and check for anchors
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const links = Array.from(document.querySelectorAll('a[href]'));
          const internalLinks = links.filter(link => {
            const href = link.getAttribute('href');
            return href && (href.startsWith('#') || 
                          href.startsWith('/') || 
                          link.href.startsWith(window.location.origin));
          });
          
          const brokenAnchors = [];
          
          internalLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Check anchor links
            if (href && href.startsWith('#') && href.length > 1) {
              const targetId = href.substring(1);
              const targetElement = document.getElementById(targetId) || 
                                  document.querySelector(`[name="${targetId}"]`);
              
              if (!targetElement) {
                brokenAnchors.push({
                  href: href,
                  text: link.textContent.trim(),
                  message: `Anchor target '${targetId}' not found`
                });
              }
            }
          });
          
          return {
            totalInternal: internalLinks.length,
            brokenAnchors: brokenAnchors
          };
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('Internal link check error:', error);
      return {
        error: error.message,
        totalInternal: 0,
        brokenAnchors: []
      };
    }
  }
}