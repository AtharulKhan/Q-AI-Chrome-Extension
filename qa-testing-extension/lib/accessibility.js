// Accessibility checker module (AODA/WCAG compliance)
export class AccessibilityChecker {
  constructor() {
    this.wcagLevels = {
      A: 1,
      AA: 2,
      AAA: 3
    };
  }

  async check(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const issues = [];
          let score = 100;
          const wcagViolations = {
            A: [],
            AA: [],
            AAA: []
          };
          
          // WCAG 1.1.1 - Non-text Content (Level A)
          // Check for images without alt text
          document.querySelectorAll('img').forEach(img => {
            // Skip decorative images (1x1 pixels, spacers, etc.)
            if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
              return;
            }
            
            if (!img.hasAttribute('alt')) {
              issues.push({
                type: 'missing_alt_text',
                wcag: '1.1.1',
                level: 'A',
                severity: 'high',
                element: 'img',
                src: img.src,
                message: 'Image missing alt attribute'
              });
              wcagViolations.A.push('1.1.1');
              score -= 5;
            } else if (img.alt === img.src || img.alt.includes('.jpg') || img.alt.includes('.png')) {
              issues.push({
                type: 'poor_alt_text',
                wcag: '1.1.1',
                level: 'A',
                severity: 'medium',
                element: 'img',
                alt: img.alt,
                message: 'Alt text appears to be a filename'
              });
              wcagViolations.A.push('1.1.1');
              score -= 3;
            }
          });
          
          // Check for background images that might need description
          const elementsWithBgImage = Array.from(document.querySelectorAll('*')).filter(el => {
            const style = window.getComputedStyle(el);
            return style.backgroundImage && style.backgroundImage !== 'none';
          });
          
          elementsWithBgImage.forEach(el => {
            if (!el.getAttribute('role') && !el.getAttribute('aria-label') && 
                !el.textContent.trim() && el.clientHeight > 50 && el.clientWidth > 50) {
              issues.push({
                type: 'background_image_no_text',
                wcag: '1.1.1',
                level: 'A',
                severity: 'medium',
                element: el.tagName.toLowerCase(),
                message: 'Decorative background image may need accessible alternative'
              });
            }
          });
          
          // WCAG 1.3.1 - Info and Relationships (Level A)
          // Check form labels
          document.querySelectorAll('input, textarea, select').forEach(input => {
            if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
              return;
            }
            
            const hasLabel = input.id && document.querySelector(`label[for="${input.id}"]`) ||
                           input.closest('label') ||
                           input.getAttribute('aria-label') ||
                           input.getAttribute('aria-labelledby');
            
            if (!hasLabel) {
              issues.push({
                type: 'missing_label',
                wcag: '1.3.1',
                level: 'A',
                severity: 'high',
                element: input.tagName.toLowerCase(),
                inputType: input.type,
                name: input.name,
                message: 'Form control missing label'
              });
              wcagViolations.A.push('1.3.1');
              score -= 5;
            }
          });
          
          // Check heading structure
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          let lastLevel = 0;
          let h1Count = 0;
          
          headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.substring(1));
            
            if (level === 1) {
              h1Count++;
            }
            
            // Check for skipped heading levels
            if (lastLevel > 0 && level > lastLevel + 1) {
              issues.push({
                type: 'heading_skip',
                wcag: '1.3.1',
                level: 'A',
                severity: 'medium',
                from: `h${lastLevel}`,
                to: `h${level}`,
                text: heading.textContent.trim().substring(0, 50),
                message: `Heading level skipped from h${lastLevel} to h${level}`
              });
              wcagViolations.A.push('1.3.1');
              score -= 3;
            }
            
            // Check for empty headings
            if (!heading.textContent.trim()) {
              issues.push({
                type: 'empty_heading',
                wcag: '1.3.1',
                level: 'A',
                severity: 'medium',
                element: heading.tagName.toLowerCase(),
                message: 'Empty heading tag'
              });
              score -= 2;
            }
            
            lastLevel = level;
          });
          
          // Check for proper page structure
          if (h1Count === 0) {
            issues.push({
              type: 'missing_h1',
              wcag: '1.3.1',
              level: 'A',
              severity: 'high',
              message: 'Page has no H1 tag'
            });
            wcagViolations.A.push('1.3.1');
            score -= 5;
          } else if (h1Count > 1) {
            issues.push({
              type: 'multiple_h1',
              wcag: '1.3.1',
              level: 'A',
              severity: 'medium',
              count: h1Count,
              message: `Page has ${h1Count} H1 tags (should have only 1)`
            });
            score -= 3;
          }
          
          // WCAG 1.4.3 - Contrast (Minimum) (Level AA)
          // Check color contrast
          const textElements = document.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6, td, th, li');
          const contrastIssues = [];
          
          const getContrastRatio = (color1, color2) => {
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
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };
          
          textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return;
            
            const color = style.color;
            const fontSize = parseFloat(style.fontSize);
            const fontWeight = style.fontWeight;
            
            // Find background color
            let bgEl = el;
            let backgroundColor = null;
            while (bgEl && bgEl !== document.body) {
              const bgStyle = window.getComputedStyle(bgEl);
              const bg = bgStyle.backgroundColor;
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                backgroundColor = bg;
                break;
              }
              bgEl = bgEl.parentElement;
            }
            
            if (!backgroundColor) {
              backgroundColor = window.getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
            }
            
            if (color && backgroundColor) {
              const ratio = getContrastRatio(color, backgroundColor);
              const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
              const requiredRatio = isLargeText ? 3 : 4.5; // WCAG AA standards
              
              if (ratio < requiredRatio) {
                contrastIssues.push({
                  element: el.tagName.toLowerCase(),
                  text: el.textContent.trim().substring(0, 30),
                  ratio: ratio.toFixed(2),
                  required: requiredRatio,
                  fontSize: fontSize,
                  color: color,
                  backgroundColor: backgroundColor
                });
              }
            }
          });
          
          if (contrastIssues.length > 0) {
            issues.push({
              type: 'low_contrast',
              wcag: '1.4.3',
              level: 'AA',
              severity: 'high',
              count: contrastIssues.length,
              examples: contrastIssues.slice(0, 5),
              message: `${contrastIssues.length} elements have insufficient color contrast`
            });
            wcagViolations.AA.push('1.4.3');
            score -= Math.min(20, contrastIssues.length * 2);
          }
          
          // WCAG 2.1.1 - Keyboard (Level A)
          // Check for keyboard accessibility
          document.querySelectorAll('[onclick]').forEach(element => {
            const tagName = element.tagName.toLowerCase();
            const isNativelyFocusable = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName);
            
            if (!isNativelyFocusable && !element.hasAttribute('tabindex')) {
              issues.push({
                type: 'not_keyboard_accessible',
                wcag: '2.1.1',
                level: 'A',
                severity: 'high',
                element: tagName,
                text: element.textContent.trim().substring(0, 50),
                message: 'Interactive element not keyboard accessible'
              });
              wcagViolations.A.push('2.1.1');
              score -= 5;
            }
          });
          
          // Check for proper focus indicators
          const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
          focusableElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const focusStyle = window.getComputedStyle(el, ':focus');
            
            // This is a simplified check - in reality, you'd need to trigger focus
            if (style.outline === 'none' && !el.classList.contains('focus-visible')) {
              // Check if there's a custom focus style
              const hasCustomFocus = el.matches(':focus-visible') || 
                                   el.classList.toString().includes('focus');
              
              if (!hasCustomFocus) {
                issues.push({
                  type: 'missing_focus_indicator',
                  wcag: '2.4.7',
                  level: 'AA',
                  severity: 'medium',
                  element: el.tagName.toLowerCase(),
                  message: 'Element may lack visible focus indicator'
                });
              }
            }
          });
          
          // WCAG 2.4.1 - Bypass Blocks (Level A)
          // Check for skip links
          const firstLink = document.querySelector('a[href]');
          const hasSkipLink = firstLink && (
            firstLink.textContent.toLowerCase().includes('skip') ||
            firstLink.getAttribute('href') === '#main' ||
            firstLink.getAttribute('href') === '#content'
          );
          
          if (!hasSkipLink) {
            issues.push({
              type: 'no_skip_link',
              wcag: '2.4.1',
              level: 'A',
              severity: 'medium',
              message: 'No skip navigation link found'
            });
            wcagViolations.A.push('2.4.1');
            score -= 3;
          }
          
          // WCAG 2.4.2 - Page Titled (Level A)
          if (!document.title || document.title.trim().length === 0) {
            issues.push({
              type: 'missing_page_title',
              wcag: '2.4.2',
              level: 'A',
              severity: 'high',
              message: 'Page has no title'
            });
            wcagViolations.A.push('2.4.2');
            score -= 5;
          }
          
          // WCAG 2.4.4 - Link Purpose (Level A)
          // Check for ambiguous link text
          const links = document.querySelectorAll('a[href]');
          const ambiguousTexts = ['click here', 'here', 'read more', 'more', 'link', 'click'];
          
          links.forEach(link => {
            const linkText = link.textContent.trim().toLowerCase();
            
            if (!linkText && !link.querySelector('img') && !link.getAttribute('aria-label')) {
              issues.push({
                type: 'empty_link',
                wcag: '2.4.4',
                level: 'A',
                severity: 'high',
                href: link.href,
                message: 'Link has no accessible text'
              });
              wcagViolations.A.push('2.4.4');
              score -= 3;
            } else if (ambiguousTexts.includes(linkText)) {
              issues.push({
                type: 'ambiguous_link_text',
                wcag: '2.4.4',
                level: 'A',
                severity: 'medium',
                text: linkText,
                href: link.href,
                message: `Ambiguous link text: "${linkText}"`
              });
              score -= 2;
            }
          });
          
          // WCAG 3.1.1 - Language of Page (Level A)
          const htmlLang = document.documentElement.getAttribute('lang');
          if (!htmlLang) {
            issues.push({
              type: 'missing_language',
              wcag: '3.1.1',
              level: 'A',
              severity: 'high',
              message: 'Page language not specified'
            });
            wcagViolations.A.push('3.1.1');
            score -= 5;
          }
          
          // WCAG 4.1.2 - Name, Role, Value (Level A)
          // Check ARIA attributes
          document.querySelectorAll('[role]').forEach(element => {
            const role = element.getAttribute('role');
            
            // Check for required ARIA properties based on role
            if (role === 'button' && !element.hasAttribute('aria-pressed') && 
                !element.hasAttribute('aria-expanded')) {
              // This is OK - not all buttons need these
            }
            
            if (role === 'navigation' && !element.hasAttribute('aria-label')) {
              issues.push({
                type: 'missing_aria_label',
                wcag: '4.1.2',
                level: 'A',
                severity: 'medium',
                role: role,
                message: 'Navigation landmark missing label'
              });
              score -= 2;
            }
          });
          
          // Check for invalid ARIA attributes
          document.querySelectorAll('[aria-hidden="true"]').forEach(element => {
            if (element.contains(document.activeElement)) {
              issues.push({
                type: 'focusable_hidden_element',
                wcag: '4.1.2',
                level: 'A',
                severity: 'high',
                element: element.tagName.toLowerCase(),
                message: 'Element with aria-hidden contains focusable content'
              });
              wcagViolations.A.push('4.1.2');
              score -= 5;
            }
          });
          
          // Additional checks for common issues
          
          // Check for autocomplete on sensitive fields
          document.querySelectorAll('input[type="password"], input[name*="ssn"], input[name*="credit"]').forEach(input => {
            if (!input.hasAttribute('autocomplete') || input.getAttribute('autocomplete') !== 'off') {
              issues.push({
                type: 'sensitive_autocomplete',
                severity: 'medium',
                inputType: input.type,
                name: input.name,
                message: 'Sensitive field may have autocomplete enabled'
              });
              score -= 2;
            }
          });
          
          // Check for proper table structure
          document.querySelectorAll('table').forEach(table => {
            const hasHeaders = table.querySelector('th') || table.querySelector('[scope]');
            const hasCaption = table.querySelector('caption');
            
            if (!hasHeaders && table.querySelectorAll('tr').length > 2) {
              issues.push({
                type: 'table_no_headers',
                wcag: '1.3.1',
                level: 'A',
                severity: 'medium',
                message: 'Data table missing header cells'
              });
              score -= 3;
            }
            
            if (!hasCaption && !table.getAttribute('aria-label')) {
              issues.push({
                type: 'table_no_caption',
                severity: 'low',
                message: 'Table missing caption or label'
              });
              score -= 1;
            }
          });
          
          // Calculate WCAG compliance level
          let complianceLevel = 'AAA';
          if (wcagViolations.A.length > 0) {
            complianceLevel = 'Non-compliant';
          } else if (wcagViolations.AA.length > 0) {
            complianceLevel = 'A';
          }
          
          return {
            score: Math.max(0, score),
            complianceLevel: complianceLevel,
            totalIssues: issues.length,
            wcagViolations: wcagViolations,
            issues: issues,
            summary: {
              critical: issues.filter(i => i.severity === 'high').length,
              major: issues.filter(i => i.severity === 'medium').length,
              minor: issues.filter(i => i.severity === 'low').length
            }
          };
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('Accessibility check error:', error);
      return {
        error: error.message,
        score: 0,
        issues: []
      };
    }
  }

  async checkAriaCompliance(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const issues = [];
          
          // Check for proper ARIA usage
          document.querySelectorAll('[aria-labelledby]').forEach(element => {
            const labelIds = element.getAttribute('aria-labelledby').split(' ');
            labelIds.forEach(id => {
              if (!document.getElementById(id)) {
                issues.push({
                  type: 'invalid_aria_labelledby',
                  element: element.tagName.toLowerCase(),
                  invalidId: id,
                  message: `aria-labelledby references non-existent ID: ${id}`
                });
              }
            });
          });
          
          // Check for proper landmark usage
          const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
          const landmarkCounts = {};
          
          landmarks.forEach(landmark => {
            const role = landmark.getAttribute('role') || landmark.tagName.toLowerCase();
            landmarkCounts[role] = (landmarkCounts[role] || 0) + 1;
          });
          
          if (landmarkCounts['main'] > 1 || landmarkCounts['banner'] > 1 || landmarkCounts['contentinfo'] > 1) {
            issues.push({
              type: 'duplicate_landmarks',
              counts: landmarkCounts,
              message: 'Multiple instances of unique landmarks detected'
            });
          }
          
          return issues;
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('ARIA compliance check error:', error);
      return [];
    }
  }
}