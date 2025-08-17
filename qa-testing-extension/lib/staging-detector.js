// Staging URL detector module
export class StagingDetector {
  constructor() {
    this.stagingPatterns = [
      /staging\./i,
      /dev\./i,
      /test\./i,
      /localhost/i,
      /127\.0\.0\.1/,
      /192\.168\./,
      /10\.0\./,
      /172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /\.local/i,
      /development/i,
      /\.dev\./i,
      /demo\./i,
      /sandbox\./i,
      /preview\./i,
      /preprod\./i,
      /uat\./i,
      /\.stage\./i,
      /\.staging/i,
      /:3000/,
      /:8080/,
      /:8000/,
      /:4200/,
      /ngrok\.io/i,
      /herokuapp\.com/i,
      /\.netlify\.app/i,
      /\.vercel\.app/i,
      /\.github\.io/i
    ];
  }

  async detect(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (patterns) => {
          const found = [];
          const checked = new Set();
          
          // Helper function to check URL against patterns
          const checkUrl = (url, type, context) => {
            if (!url || checked.has(url)) return;
            checked.add(url);
            
            const patternsArray = patterns.map(p => new RegExp(p.source, p.flags));
            
            for (const pattern of patternsArray) {
              if (pattern.test(url)) {
                found.push({
                  type: type,
                  url: url,
                  pattern: pattern.source,
                  context: context
                });
                break;
              }
            }
          };
          
          // Check all links
          document.querySelectorAll('a[href]').forEach(link => {
            checkUrl(link.href, 'link', {
              text: link.textContent.trim().substring(0, 50),
              element: {
                tag: 'a',
                id: link.id,
                class: link.className
              }
            });
          });
          
          // Check all images
          document.querySelectorAll('img[src]').forEach(img => {
            checkUrl(img.src, 'image', {
              alt: img.alt,
              element: {
                tag: 'img',
                id: img.id,
                class: img.className
              }
            });
          });
          
          // Check all scripts
          document.querySelectorAll('script[src]').forEach(script => {
            checkUrl(script.src, 'script', {
              type: script.type || 'text/javascript',
              element: {
                tag: 'script'
              }
            });
          });
          
          // Check all stylesheets
          document.querySelectorAll('link[href]').forEach(link => {
            if (link.rel === 'stylesheet') {
              checkUrl(link.href, 'stylesheet', {
                media: link.media,
                element: {
                  tag: 'link',
                  rel: link.rel
                }
              });
            }
          });
          
          // Check iframes
          document.querySelectorAll('iframe[src]').forEach(iframe => {
            checkUrl(iframe.src, 'iframe', {
              title: iframe.title,
              element: {
                tag: 'iframe',
                id: iframe.id,
                class: iframe.className
              }
            });
          });
          
          // Check video and audio sources
          document.querySelectorAll('video[src], audio[src], source[src]').forEach(media => {
            checkUrl(media.src, 'media', {
              type: media.type,
              element: {
                tag: media.tagName.toLowerCase()
              }
            });
          });
          
          // Check CSS background images and imports
          const styles = document.querySelectorAll('style');
          styles.forEach(style => {
            const cssText = style.textContent;
            const urlMatches = cssText.match(/url\(['"]?(.*?)['"]?\)/g) || [];
            
            urlMatches.forEach(match => {
              const url = match.replace(/url\(['"]?|['"]?\)/g, '');
              if (url.startsWith('http')) {
                checkUrl(url, 'css-url', {
                  context: 'Inline CSS'
                });
              }
            });
          });
          
          // Check inline onclick and other event handlers
          const elementsWithHandlers = document.querySelectorAll('[onclick], [onload], [onerror]');
          elementsWithHandlers.forEach(el => {
            const handlers = ['onclick', 'onload', 'onerror'];
            handlers.forEach(handler => {
              const code = el.getAttribute(handler);
              if (code) {
                const urlMatches = code.match(/https?:\/\/[^\s"'<>]+/g) || [];
                urlMatches.forEach(url => {
                  checkUrl(url, 'inline-handler', {
                    handler: handler,
                    element: {
                      tag: el.tagName.toLowerCase(),
                      id: el.id,
                      class: el.className
                    }
                  });
                });
              }
            });
          });
          
          // Check data attributes that might contain URLs
          const elementsWithData = document.querySelectorAll('[data-src], [data-url], [data-href], [data-background]');
          elementsWithData.forEach(el => {
            ['data-src', 'data-url', 'data-href', 'data-background'].forEach(attr => {
              const value = el.getAttribute(attr);
              if (value && value.startsWith('http')) {
                checkUrl(value, 'data-attribute', {
                  attribute: attr,
                  element: {
                    tag: el.tagName.toLowerCase(),
                    id: el.id,
                    class: el.className
                  }
                });
              }
            });
          });
          
          // Check meta tags
          document.querySelectorAll('meta[content]').forEach(meta => {
            const content = meta.getAttribute('content');
            if (content && content.startsWith('http')) {
              checkUrl(content, 'meta-tag', {
                name: meta.name || meta.getAttribute('property'),
                element: {
                  tag: 'meta'
                }
              });
            }
          });
          
          return {
            found: found,
            total: found.length,
            currentUrl: window.location.href,
            isStaging: patternsArray.some(p => p.test(window.location.href))
          };
        },
        args: [this.stagingPatterns.map(p => ({ source: p.source, flags: p.flags }))]
      });
      
      return result.result;
      
    } catch (error) {
      console.error('Staging detector error:', error);
      return {
        error: error.message,
        found: [],
        total: 0
      };
    }
  }

  async checkEnvironmentLeaks(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const leaks = [];
          
          // Check for exposed environment variables in window object
          const suspiciousKeys = [
            'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PRIVATE',
            'DATABASE', 'DB_', 'AWS_', 'FIREBASE_', 'STRIPE_',
            'NODE_ENV', 'DEBUG', 'ENV'
          ];
          
          for (const key in window) {
            if (suspiciousKeys.some(pattern => key.toUpperCase().includes(pattern))) {
              leaks.push({
                type: 'window_variable',
                key: key,
                value: typeof window[key] === 'string' ? '[REDACTED]' : typeof window[key]
              });
            }
          }
          
          // Check for console logs that might expose sensitive data
          const originalLog = console.log;
          let consoleWarning = false;
          
          // Check if console methods have been overridden (common in dev)
          if (console.log.toString() !== 'function log() { [native code] }') {
            consoleWarning = true;
          }
          
          if (consoleWarning) {
            leaks.push({
              type: 'console_override',
              message: 'Console methods have been overridden - possible debug code in production'
            });
          }
          
          // Check for source maps (shouldn't be in production)
          const scripts = document.querySelectorAll('script[src]');
          scripts.forEach(script => {
            if (script.src.includes('.map') || script.src.includes('source-map')) {
              leaks.push({
                type: 'source_map',
                url: script.src,
                message: 'Source map detected - exposes source code'
              });
            }
          });
          
          // Check comments in HTML for sensitive info
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_COMMENT,
            null,
            false
          );
          
          let comment;
          while (comment = walker.nextNode()) {
            const text = comment.textContent.toLowerCase();
            if (text.includes('todo') || text.includes('fixme') || 
                text.includes('hack') || text.includes('debug')) {
              leaks.push({
                type: 'html_comment',
                content: comment.textContent.substring(0, 100),
                message: 'Development comment found in HTML'
              });
            }
          }
          
          return leaks;
        }
      });
      
      return {
        leaks: result.result,
        hasLeaks: result.result.length > 0
      };
      
    } catch (error) {
      console.error('Environment leak check error:', error);
      return {
        error: error.message,
        leaks: [],
        hasLeaks: false
      };
    }
  }
}