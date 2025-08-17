// Content script for page analysis
class QAContentAnalyzer {
  constructor() {
    this.init();
  }

  init() {
    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getPageData':
          const pageData = this.getPageData();
          sendResponse({ success: true, data: pageData });
          break;

        case 'checkAccessibility':
          const a11yData = this.checkAccessibility();
          sendResponse({ success: true, data: a11yData });
          break;

        case 'analyzeLayout':
          const layoutData = this.analyzeLayout();
          sendResponse({ success: true, data: layoutData });
          break;

        case 'checkLinks':
          const linksData = this.checkLinks();
          sendResponse({ success: true, data: linksData });
          break;

        case 'detectStagingUrls':
          const stagingData = this.detectStagingUrls();
          sendResponse({ success: true, data: stagingData });
          break;

        case 'analyzeSEO':
          const seoData = this.analyzeSEO();
          sendResponse({ success: true, data: seoData });
          break;

        case 'getPerformanceMetrics':
          const perfData = this.getPerformanceMetrics();
          sendResponse({ success: true, data: perfData });
          break;

        case 'capturePageDimensions':
          const dimensions = this.getPageDimensions();
          sendResponse({ success: true, data: dimensions });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  getPageData() {
    return {
      url: window.location.href,
      title: document.title,
      meta: this.getMetaTags(),
      headings: this.getHeadings(),
      links: this.getLinks(),
      images: this.getImages(),
      forms: this.getForms(),
      scripts: this.getScripts(),
      styles: this.getStyles()
    };
  }

  getMetaTags() {
    const meta = {};
    document.querySelectorAll('meta').forEach(tag => {
      const name = tag.getAttribute('name') || 
                   tag.getAttribute('property') || 
                   tag.getAttribute('http-equiv');
      const content = tag.getAttribute('content');
      if (name && content) {
        meta[name] = content;
      }
    });
    return meta;
  }

  getHeadings() {
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading, index) => {
      headings.push({
        tag: heading.tagName.toLowerCase(),
        text: heading.textContent.trim(),
        level: parseInt(heading.tagName.substring(1)),
        id: heading.id,
        className: heading.className,
        index: index
      });
    });
    return headings;
  }

  getLinks() {
    const links = [];
    const baseUrl = window.location.origin;
    
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.href;
      const isInternal = href.startsWith(baseUrl) || 
                        href.startsWith('/') || 
                        href.startsWith('#');
      
      links.push({
        href: href,
        text: link.textContent.trim(),
        title: link.title,
        target: link.target,
        rel: link.rel,
        isInternal: isInternal,
        isAnchor: href.startsWith('#'),
        element: {
          tag: link.tagName,
          id: link.id,
          className: link.className
        }
      });
    });
    
    return links;
  }

  getImages() {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      const rect = img.getBoundingClientRect();
      images.push({
        src: img.src,
        alt: img.alt,
        title: img.title,
        width: img.naturalWidth,
        height: img.naturalHeight,
        displayWidth: rect.width,
        displayHeight: rect.height,
        loading: img.loading,
        hasAlt: !!img.alt,
        isVisible: rect.width > 0 && rect.height > 0
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
          type: input.type || input.tagName.toLowerCase(),
          name: input.name,
          id: input.id,
          required: input.required,
          placeholder: input.placeholder,
          hasLabel: this.hasLabel(input),
          ariaLabel: input.getAttribute('aria-label'),
          ariaDescribedBy: input.getAttribute('aria-describedby')
        });
      });
      
      forms.push({
        action: form.action,
        method: form.method,
        id: form.id,
        name: form.name,
        inputs: inputs,
        hasSubmitButton: !!form.querySelector('[type="submit"], button')
      });
    });
    return forms;
  }

  hasLabel(input) {
    // Check for associated label
    if (input.id && document.querySelector(`label[for="${input.id}"]`)) {
      return true;
    }
    
    // Check for parent label
    if (input.closest('label')) {
      return true;
    }
    
    // Check for aria-label or aria-labelledby
    if (input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')) {
      return true;
    }
    
    return false;
  }

  getScripts() {
    const scripts = [];
    document.querySelectorAll('script').forEach(script => {
      if (script.src) {
        scripts.push({
          src: script.src,
          async: script.async,
          defer: script.defer,
          type: script.type || 'text/javascript',
          isExternal: !script.src.startsWith(window.location.origin)
        });
      }
    });
    return scripts;
  }

  getStyles() {
    const styles = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      styles.push({
        href: link.href,
        media: link.media || 'all',
        isExternal: !link.href.startsWith(window.location.origin)
      });
    });
    return styles;
  }

  checkAccessibility() {
    const issues = [];
    let score = 100;
    
    // Check for missing alt text on images
    document.querySelectorAll('img:not([alt])').forEach(img => {
      if (img.src && img.naturalWidth > 1 && img.naturalHeight > 1) {
        issues.push({
          type: 'missing_alt_text',
          severity: 'high',
          element: 'img',
          src: img.src,
          message: 'Image missing alt text'
        });
        score -= 5;
      }
    });
    
    // Check for missing form labels
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (!this.hasLabel(input) && input.type !== 'hidden' && input.type !== 'submit') {
        issues.push({
          type: 'missing_label',
          severity: 'high',
          element: input.tagName.toLowerCase(),
          inputType: input.type,
          name: input.name,
          id: input.id,
          message: 'Form input missing label'
        });
        score -= 5;
      }
    });
    
    // Check heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    let h1Count = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1));
      
      if (level === 1) {
        h1Count++;
      }
      
      if (level > lastLevel + 1 && lastLevel !== 0) {
        issues.push({
          type: 'heading_hierarchy',
          severity: 'medium',
          element: heading.tagName.toLowerCase(),
          text: heading.textContent.trim().substring(0, 50),
          message: `Heading jumps from h${lastLevel} to h${level}`
        });
        score -= 3;
      }
      lastLevel = level;
    });
    
    // Check for multiple H1s
    if (h1Count > 1) {
      issues.push({
        type: 'multiple_h1',
        severity: 'medium',
        count: h1Count,
        message: `Page has ${h1Count} H1 tags (should have only 1)`
      });
      score -= 3;
    }
    
    // Check for missing H1
    if (h1Count === 0) {
      issues.push({
        type: 'missing_h1',
        severity: 'high',
        message: 'Page has no H1 tag'
      });
      score -= 5;
    }
    
    // Check for keyboard-accessible interactive elements
    document.querySelectorAll('[onclick]').forEach(element => {
      const tagName = element.tagName.toLowerCase();
      const isNativelyFocusable = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName);
      
      if (!isNativelyFocusable && !element.hasAttribute('tabindex')) {
        issues.push({
          type: 'keyboard_accessibility',
          severity: 'high',
          element: tagName,
          text: element.textContent.trim().substring(0, 50),
          message: 'Clickable element not keyboard accessible'
        });
        score -= 5;
      }
    });
    
    // Check for empty links
    document.querySelectorAll('a[href]').forEach(link => {
      if (!link.textContent.trim() && !link.querySelector('img') && !link.getAttribute('aria-label')) {
        issues.push({
          type: 'empty_link',
          severity: 'high',
          href: link.href,
          message: 'Link has no accessible text'
        });
        score -= 3;
      }
    });
    
    // Check for color contrast (basic check)
    const textElements = document.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6, li, td, th');
    const contrastIssues = [];
    
    textElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const backgroundColor = this.getBackgroundColor(el);
      
      if (color && backgroundColor && this.hasLowContrast(color, backgroundColor)) {
        contrastIssues.push({
          element: el.tagName.toLowerCase(),
          text: el.textContent.trim().substring(0, 30)
        });
      }
    });
    
    if (contrastIssues.length > 0) {
      issues.push({
        type: 'low_contrast',
        severity: 'medium',
        count: contrastIssues.length,
        examples: contrastIssues.slice(0, 3),
        message: `${contrastIssues.length} elements may have low color contrast`
      });
      score -= Math.min(15, contrastIssues.length);
    }
    
    return {
      score: Math.max(0, score),
      totalIssues: issues.length,
      issues: issues
    };
  }

  getBackgroundColor(element) {
    let el = element;
    let backgroundColor = null;
    
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        backgroundColor = bg;
        break;
      }
      el = el.parentElement;
    }
    
    return backgroundColor || window.getComputedStyle(document.body).backgroundColor;
  }

  hasLowContrast(color1, color2) {
    // Simple contrast check - this is a basic implementation
    // In production, you'd want to use a proper WCAG contrast calculation
    const getLuminance = (color) => {
      const rgb = color.match(/\d+/g);
      if (!rgb || rgb.length < 3) return 0;
      
      const [r, g, b] = rgb.map(c => {
        const val = parseInt(c) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    
    return contrast < 4.5; // WCAG AA standard for normal text
  }

  analyzeLayout() {
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
    
    // Check for elements extending beyond viewport
    const allElements = document.querySelectorAll('*');
    const overflowingElements = [];
    
    allElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Skip hidden elements
      if (style.display === 'none' || style.visibility === 'hidden') {
        return;
      }
      
      if (rect.right > window.innerWidth && rect.width > 50) {
        overflowingElements.push({
          tag: el.tagName.toLowerCase(),
          class: el.className,
          id: el.id,
          width: rect.width,
          overflow: rect.right - window.innerWidth,
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
    const visibleElements = Array.from(allElements).filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && 
             rect.height > 0 && 
             style.display !== 'none' && 
             style.visibility !== 'hidden';
    });
    
    const overlaps = [];
    for (let i = 0; i < Math.min(visibleElements.length, 100); i++) {
      const rect1 = visibleElements[i].getBoundingClientRect();
      
      for (let j = i + 1; j < Math.min(visibleElements.length, 100); j++) {
        const rect2 = visibleElements[j].getBoundingClientRect();
        
        // Check if elements overlap and are not parent-child
        if (this.rectsOverlap(rect1, rect2) && 
            !visibleElements[i].contains(visibleElements[j]) &&
            !visibleElements[j].contains(visibleElements[i])) {
          
          overlaps.push({
            element1: {
              tag: visibleElements[i].tagName.toLowerCase(),
              class: visibleElements[i].className
            },
            element2: {
              tag: visibleElements[j].tagName.toLowerCase(),
              class: visibleElements[j].className
            }
          });
          
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
    const containers = document.querySelectorAll('div, section, article, main, aside');
    const layoutIssues = [];
    
    containers.forEach(container => {
      const style = window.getComputedStyle(container);
      const rect = container.getBoundingClientRect();
      
      // Check for zero-height containers with content
      if (rect.height === 0 && container.children.length > 0) {
        layoutIssues.push({
          type: 'zero_height_container',
          tag: container.tagName.toLowerCase(),
          class: container.className,
          childCount: container.children.length
        });
      }
      
      // Check for improper use of position absolute/fixed
      if ((style.position === 'absolute' || style.position === 'fixed') && 
          !style.top && !style.bottom && !style.left && !style.right) {
        layoutIssues.push({
          type: 'unpositioned_absolute',
          tag: container.tagName.toLowerCase(),
          class: container.className
        });
      }
    });
    
    if (layoutIssues.length > 0) {
      issues.push({
        type: 'layout_issues',
        severity: 'medium',
        count: layoutIssues.length,
        examples: layoutIssues.slice(0, 3),
        message: `${layoutIssues.length} layout issues detected`
      });
    }
    
    return {
      viewport: viewport,
      totalIssues: issues.length,
      issues: issues
    };
  }

  rectsOverlap(rect1, rect2) {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right || 
             rect1.bottom < rect2.top || 
             rect1.top > rect2.bottom);
  }

  checkLinks() {
    const links = this.getLinks();
    const linkData = {
      total: links.length,
      internal: links.filter(l => l.isInternal).length,
      external: links.filter(l => !l.isInternal).length,
      anchors: links.filter(l => l.isAnchor).length,
      links: links
    };
    
    return linkData;
  }

  detectStagingUrls() {
    const stagingPatterns = [
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
      /uat\./i
    ];
    
    const found = [];
    
    // Check all links
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.href;
      if (stagingPatterns.some(pattern => pattern.test(href))) {
        found.push({
          type: 'link',
          url: href,
          text: link.textContent.trim(),
          element: {
            tag: 'a',
            id: link.id,
            class: link.className
          }
        });
      }
    });
    
    // Check all images
    document.querySelectorAll('img[src]').forEach(img => {
      const src = img.src;
      if (stagingPatterns.some(pattern => pattern.test(src))) {
        found.push({
          type: 'image',
          url: src,
          alt: img.alt,
          element: {
            tag: 'img',
            id: img.id,
            class: img.className
          }
        });
      }
    });
    
    // Check all scripts
    document.querySelectorAll('script[src]').forEach(script => {
      const src = script.src;
      if (stagingPatterns.some(pattern => pattern.test(src))) {
        found.push({
          type: 'script',
          url: src,
          element: {
            tag: 'script',
            type: script.type
          }
        });
      }
    });
    
    // Check all stylesheets
    document.querySelectorAll('link[href]').forEach(link => {
      const href = link.href;
      if (stagingPatterns.some(pattern => pattern.test(href))) {
        found.push({
          type: 'stylesheet',
          url: href,
          element: {
            tag: 'link',
            rel: link.rel
          }
        });
      }
    });
    
    // Check inline styles and scripts for staging URLs
    const inlineContent = document.documentElement.innerHTML;
    const urlMatches = inlineContent.match(/https?:\/\/[^\s"'<>]+/g) || [];
    
    urlMatches.forEach(url => {
      if (stagingPatterns.some(pattern => pattern.test(url))) {
        // Check if we haven't already found this URL
        if (!found.some(f => f.url === url)) {
          found.push({
            type: 'inline',
            url: url,
            context: 'Found in page source'
          });
        }
      }
    });
    
    return {
      found: found,
      total: found.length
    };
  }

  analyzeSEO() {
    const issues = [];
    const data = {
      title: document.title,
      meta: {},
      headings: {},
      images: {},
      links: {},
      structuredData: []
    };
    
    // Check title
    data.title = document.title;
    if (!data.title) {
      issues.push({
        type: 'missing_title',
        severity: 'high',
        message: 'Page title is missing'
      });
    } else if (data.title.length < 30) {
      issues.push({
        type: 'short_title',
        severity: 'medium',
        length: data.title.length,
        message: 'Page title is too short (< 30 characters)'
      });
    } else if (data.title.length > 60) {
      issues.push({
        type: 'long_title',
        severity: 'low',
        length: data.title.length,
        message: 'Page title is too long (> 60 characters)'
      });
    }
    
    // Check meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    data.meta.description = metaDescription?.content || '';
    
    if (!data.meta.description) {
      issues.push({
        type: 'missing_meta_description',
        severity: 'high',
        message: 'Meta description is missing'
      });
    } else if (data.meta.description.length < 120) {
      issues.push({
        type: 'short_meta_description',
        severity: 'medium',
        length: data.meta.description.length,
        message: 'Meta description is too short (< 120 characters)'
      });
    } else if (data.meta.description.length > 160) {
      issues.push({
        type: 'long_meta_description',
        severity: 'low',
        length: data.meta.description.length,
        message: 'Meta description is too long (> 160 characters)'
      });
    }
    
    // Check other important meta tags
    data.meta.keywords = document.querySelector('meta[name="keywords"]')?.content || '';
    data.meta.author = document.querySelector('meta[name="author"]')?.content || '';
    data.meta.robots = document.querySelector('meta[name="robots"]')?.content || '';
    data.meta.viewport = document.querySelector('meta[name="viewport"]')?.content || '';
    
    if (!data.meta.viewport) {
      issues.push({
        type: 'missing_viewport',
        severity: 'high',
        message: 'Viewport meta tag is missing (mobile optimization)'
      });
    }
    
    // Check Open Graph tags
    data.meta.ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
    data.meta.ogDescription = document.querySelector('meta[property="og:description"]')?.content || '';
    data.meta.ogImage = document.querySelector('meta[property="og:image"]')?.content || '';
    data.meta.ogUrl = document.querySelector('meta[property="og:url"]')?.content || '';
    
    if (!data.meta.ogTitle && !data.meta.ogDescription && !data.meta.ogImage) {
      issues.push({
        type: 'missing_open_graph',
        severity: 'medium',
        message: 'Open Graph tags are missing (social media sharing)'
      });
    }
    
    // Check Twitter Card tags
    data.meta.twitterCard = document.querySelector('meta[name="twitter:card"]')?.content || '';
    data.meta.twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content || '';
    data.meta.twitterDescription = document.querySelector('meta[name="twitter:description"]')?.content || '';
    
    // Check canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    data.meta.canonical = canonical?.href || '';
    
    if (!data.meta.canonical) {
      issues.push({
        type: 'missing_canonical',
        severity: 'medium',
        message: 'Canonical URL is missing'
      });
    }
    
    // Check headings
    const h1s = document.querySelectorAll('h1');
    const h2s = document.querySelectorAll('h2');
    const h3s = document.querySelectorAll('h3');
    
    data.headings = {
      h1: h1s.length,
      h2: h2s.length,
      h3: h3s.length,
      h1Text: Array.from(h1s).map(h => h.textContent.trim())
    };
    
    if (h1s.length === 0) {
      issues.push({
        type: 'missing_h1',
        severity: 'high',
        message: 'No H1 tag found on the page'
      });
    } else if (h1s.length > 1) {
      issues.push({
        type: 'multiple_h1',
        severity: 'medium',
        count: h1s.length,
        message: `Multiple H1 tags found (${h1s.length})`
      });
    }
    
    // Check images without alt text
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    data.images.total = document.querySelectorAll('img').length;
    data.images.withoutAlt = imagesWithoutAlt.length;
    
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'images_without_alt',
        severity: 'high',
        count: imagesWithoutAlt.length,
        message: `${imagesWithoutAlt.length} images without alt text`
      });
    }
    
    // Check for structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const jsonData = JSON.parse(script.textContent);
        data.structuredData.push(jsonData);
      } catch (e) {
        issues.push({
          type: 'invalid_structured_data',
          severity: 'medium',
          message: 'Invalid JSON-LD structured data found'
        });
      }
    });
    
    if (data.structuredData.length === 0) {
      issues.push({
        type: 'missing_structured_data',
        severity: 'low',
        message: 'No structured data (JSON-LD) found'
      });
    }
    
    // Check internal/external links
    const links = document.querySelectorAll('a[href]');
    const internalLinks = Array.from(links).filter(l => 
      l.href.startsWith(window.location.origin) || 
      l.href.startsWith('/') || 
      l.href.startsWith('#')
    );
    
    data.links = {
      total: links.length,
      internal: internalLinks.length,
      external: links.length - internalLinks.length
    };
    
    return {
      data: data,
      issues: issues,
      score: Math.max(0, 100 - (issues.length * 5))
    };
  }

  getPerformanceMetrics() {
    const metrics = {};
    
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const navigation = window.performance.getEntriesByType('navigation')[0] || {};
      
      metrics.timing = {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        pageLoadTime: timing.loadEventEnd - timing.navigationStart,
        responseTime: timing.responseEnd - timing.requestStart,
        renderTime: timing.domComplete - timing.domLoading
      };
      
      // Get paint metrics
      const paintMetrics = window.performance.getEntriesByType('paint');
      paintMetrics.forEach(metric => {
        metrics[metric.name] = Math.round(metric.startTime);
      });
      
      // Get resource timing
      const resources = window.performance.getEntriesByType('resource');
      metrics.resources = {
        total: resources.length,
        images: resources.filter(r => r.initiatorType === 'img').length,
        scripts: resources.filter(r => r.initiatorType === 'script').length,
        stylesheets: resources.filter(r => r.initiatorType === 'link' || r.initiatorType === 'css').length,
        totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        totalDuration: resources.reduce((sum, r) => sum + r.duration, 0)
      };
      
      // Get largest contentful paint if available
      if (window.PerformanceObserver) {
        try {
          const observer = new PerformanceObserver(() => {});
          if (observer.supportedEntryTypes && observer.supportedEntryTypes.includes('largest-contentful-paint')) {
            const lcpEntries = window.performance.getEntriesByType('largest-contentful-paint');
            if (lcpEntries.length > 0) {
              metrics['largest-contentful-paint'] = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
            }
          }
        } catch (e) {
          // LCP not supported
        }
      }
    }
    
    // Get memory usage if available
    if (window.performance.memory) {
      metrics.memory = {
        usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1048576), // Convert to MB
        totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(window.performance.memory.jsHeapSizeLimit / 1048576)
      };
    }
    
    return metrics;
  }

  getPageDimensions() {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      document: {
        width: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
          document.documentElement.offsetWidth,
          document.body.offsetWidth,
          document.documentElement.clientWidth,
          document.body.clientWidth
        ),
        height: Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          document.documentElement.offsetHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.body.clientHeight
        )
      },
      scroll: {
        x: window.pageXOffset || document.documentElement.scrollLeft,
        y: window.pageYOffset || document.documentElement.scrollTop
      }
    };
  }
}

// Initialize the content analyzer
new QAContentAnalyzer();