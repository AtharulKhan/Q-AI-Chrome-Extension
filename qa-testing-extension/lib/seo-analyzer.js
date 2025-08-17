// SEO Analyzer module
export class SEOAnalyzer {
  constructor() {
    this.idealTitleLength = { min: 30, max: 60 };
    this.idealDescriptionLength = { min: 120, max: 160 };
  }

  async analyze(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const data = {
            title: '',
            meta: {},
            headings: {},
            images: {},
            links: {},
            structuredData: [],
            openGraph: {},
            twitterCard: {},
            canonical: '',
            robots: {},
            sitemap: '',
            schema: []
          };
          
          const issues = [];
          let seoScore = 100;
          
          // Title analysis
          data.title = document.title || '';
          if (!data.title) {
            issues.push({
              type: 'missing_title',
              severity: 'critical',
              message: 'Page title is missing',
              impact: -15
            });
            seoScore -= 15;
          } else {
            if (data.title.length < 30) {
              issues.push({
                type: 'short_title',
                severity: 'high',
                length: data.title.length,
                message: `Title too short (${data.title.length} chars, recommended: 30-60)`,
                impact: -10
              });
              seoScore -= 10;
            } else if (data.title.length > 60) {
              issues.push({
                type: 'long_title',
                severity: 'medium',
                length: data.title.length,
                message: `Title too long (${data.title.length} chars, recommended: 30-60)`,
                impact: -5
              });
              seoScore -= 5;
            }
            
            // Check for keyword stuffing in title
            const titleWords = data.title.toLowerCase().split(/\s+/);
            const wordCounts = {};
            titleWords.forEach(word => {
              if (word.length > 3) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
              }
            });
            
            const repeatedWords = Object.entries(wordCounts).filter(([word, count]) => count > 2);
            if (repeatedWords.length > 0) {
              issues.push({
                type: 'keyword_stuffing_title',
                severity: 'medium',
                repeatedWords: repeatedWords,
                message: 'Possible keyword stuffing in title',
                impact: -5
              });
              seoScore -= 5;
            }
          }
          
          // Meta description analysis
          const metaDescription = document.querySelector('meta[name="description"]');
          data.meta.description = metaDescription?.content || '';
          
          if (!data.meta.description) {
            issues.push({
              type: 'missing_meta_description',
              severity: 'critical',
              message: 'Meta description is missing',
              impact: -15
            });
            seoScore -= 15;
          } else {
            if (data.meta.description.length < 120) {
              issues.push({
                type: 'short_meta_description',
                severity: 'high',
                length: data.meta.description.length,
                message: `Meta description too short (${data.meta.description.length} chars, recommended: 120-160)`,
                impact: -10
              });
              seoScore -= 10;
            } else if (data.meta.description.length > 160) {
              issues.push({
                type: 'long_meta_description',
                severity: 'medium',
                length: data.meta.description.length,
                message: `Meta description too long (${data.meta.description.length} chars, recommended: 120-160)`,
                impact: -5
              });
              seoScore -= 5;
            }
          }
          
          // Other meta tags
          data.meta.keywords = document.querySelector('meta[name="keywords"]')?.content || '';
          data.meta.author = document.querySelector('meta[name="author"]')?.content || '';
          data.meta.viewport = document.querySelector('meta[name="viewport"]')?.content || '';
          data.meta.charset = document.querySelector('meta[charset]')?.getAttribute('charset') || 
                             document.querySelector('meta[http-equiv="Content-Type"]')?.content || '';
          
          if (!data.meta.viewport) {
            issues.push({
              type: 'missing_viewport',
              severity: 'high',
              message: 'Viewport meta tag missing (required for mobile SEO)',
              impact: -10
            });
            seoScore -= 10;
          }
          
          if (!data.meta.charset.toLowerCase().includes('utf-8')) {
            issues.push({
              type: 'missing_charset',
              severity: 'medium',
              message: 'UTF-8 charset not specified',
              impact: -5
            });
            seoScore -= 5;
          }
          
          // Robots meta tag
          const robotsMeta = document.querySelector('meta[name="robots"]');
          data.robots.meta = robotsMeta?.content || '';
          
          if (data.robots.meta.includes('noindex')) {
            issues.push({
              type: 'noindex',
              severity: 'critical',
              message: 'Page has noindex directive - will not be indexed by search engines',
              impact: -20
            });
            seoScore -= 20;
          }
          
          if (data.robots.meta.includes('nofollow')) {
            issues.push({
              type: 'nofollow',
              severity: 'high',
              message: 'Page has nofollow directive - links will not be followed',
              impact: -10
            });
            seoScore -= 10;
          }
          
          // Canonical URL
          const canonical = document.querySelector('link[rel="canonical"]');
          data.canonical = canonical?.href || '';
          
          if (!data.canonical) {
            issues.push({
              type: 'missing_canonical',
              severity: 'medium',
              message: 'Canonical URL not specified',
              impact: -5
            });
            seoScore -= 5;
          } else if (data.canonical !== window.location.href) {
            issues.push({
              type: 'different_canonical',
              severity: 'info',
              canonical: data.canonical,
              current: window.location.href,
              message: 'Canonical URL differs from current URL',
              impact: 0
            });
          }
          
          // Heading analysis
          const h1Tags = document.querySelectorAll('h1');
          const h2Tags = document.querySelectorAll('h2');
          const h3Tags = document.querySelectorAll('h3');
          
          data.headings = {
            h1: {
              count: h1Tags.length,
              text: Array.from(h1Tags).map(h => h.textContent.trim())
            },
            h2: {
              count: h2Tags.length,
              text: Array.from(h2Tags).map(h => h.textContent.trim())
            },
            h3: {
              count: h3Tags.length,
              text: Array.from(h3Tags).map(h => h.textContent.trim())
            },
            h4: document.querySelectorAll('h4').length,
            h5: document.querySelectorAll('h5').length,
            h6: document.querySelectorAll('h6').length
          };
          
          if (h1Tags.length === 0) {
            issues.push({
              type: 'missing_h1',
              severity: 'critical',
              message: 'No H1 tag found',
              impact: -15
            });
            seoScore -= 15;
          } else if (h1Tags.length > 1) {
            issues.push({
              type: 'multiple_h1',
              severity: 'high',
              count: h1Tags.length,
              message: `Multiple H1 tags found (${h1Tags.length})`,
              impact: -10
            });
            seoScore -= 10;
          } else {
            // Check H1 length
            const h1Text = h1Tags[0].textContent.trim();
            if (h1Text.length < 20) {
              issues.push({
                type: 'short_h1',
                severity: 'medium',
                length: h1Text.length,
                message: 'H1 tag is very short',
                impact: -5
              });
              seoScore -= 5;
            } else if (h1Text.length > 70) {
              issues.push({
                type: 'long_h1',
                severity: 'low',
                length: h1Text.length,
                message: 'H1 tag is very long',
                impact: -3
              });
              seoScore -= 3;
            }
          }
          
          // Image SEO analysis
          const images = document.querySelectorAll('img');
          const imagesWithoutAlt = Array.from(images).filter(img => !img.hasAttribute('alt'));
          const largeImages = Array.from(images).filter(img => {
            return img.naturalWidth > 1920 || img.naturalHeight > 1080;
          });
          
          data.images = {
            total: images.length,
            withoutAlt: imagesWithoutAlt.length,
            largeImages: largeImages.length,
            lazyLoaded: Array.from(images).filter(img => img.loading === 'lazy').length
          };
          
          if (imagesWithoutAlt.length > 0) {
            issues.push({
              type: 'images_without_alt',
              severity: 'high',
              count: imagesWithoutAlt.length,
              message: `${imagesWithoutAlt.length} images missing alt text`,
              impact: -Math.min(15, imagesWithoutAlt.length * 2)
            });
            seoScore -= Math.min(15, imagesWithoutAlt.length * 2);
          }
          
          if (largeImages.length > 0) {
            issues.push({
              type: 'large_images',
              severity: 'medium',
              count: largeImages.length,
              message: `${largeImages.length} oversized images detected`,
              impact: -5
            });
            seoScore -= 5;
          }
          
          // Open Graph analysis
          data.openGraph = {
            title: document.querySelector('meta[property="og:title"]')?.content || '',
            description: document.querySelector('meta[property="og:description"]')?.content || '',
            image: document.querySelector('meta[property="og:image"]')?.content || '',
            url: document.querySelector('meta[property="og:url"]')?.content || '',
            type: document.querySelector('meta[property="og:type"]')?.content || '',
            siteName: document.querySelector('meta[property="og:site_name"]')?.content || ''
          };
          
          const hasOG = Object.values(data.openGraph).some(v => v);
          if (!hasOG) {
            issues.push({
              type: 'missing_open_graph',
              severity: 'medium',
              message: 'Open Graph tags missing (affects social media sharing)',
              impact: -8
            });
            seoScore -= 8;
          } else {
            if (!data.openGraph.title) {
              issues.push({
                type: 'missing_og_title',
                severity: 'medium',
                message: 'Open Graph title missing',
                impact: -3
              });
              seoScore -= 3;
            }
            if (!data.openGraph.description) {
              issues.push({
                type: 'missing_og_description',
                severity: 'medium',
                message: 'Open Graph description missing',
                impact: -3
              });
              seoScore -= 3;
            }
            if (!data.openGraph.image) {
              issues.push({
                type: 'missing_og_image',
                severity: 'medium',
                message: 'Open Graph image missing',
                impact: -3
              });
              seoScore -= 3;
            }
          }
          
          // Twitter Card analysis
          data.twitterCard = {
            card: document.querySelector('meta[name="twitter:card"]')?.content || '',
            title: document.querySelector('meta[name="twitter:title"]')?.content || '',
            description: document.querySelector('meta[name="twitter:description"]')?.content || '',
            image: document.querySelector('meta[name="twitter:image"]')?.content || '',
            site: document.querySelector('meta[name="twitter:site"]')?.content || ''
          };
          
          const hasTwitter = Object.values(data.twitterCard).some(v => v);
          if (!hasTwitter && !hasOG) {
            issues.push({
              type: 'missing_twitter_card',
              severity: 'low',
              message: 'Twitter Card tags missing',
              impact: -3
            });
            seoScore -= 3;
          }
          
          // Structured data / JSON-LD
          const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          jsonLdScripts.forEach(script => {
            try {
              const jsonData = JSON.parse(script.textContent);
              data.structuredData.push(jsonData);
              
              // Check for common schema types
              if (jsonData['@type']) {
                data.schema.push(jsonData['@type']);
              }
            } catch (e) {
              issues.push({
                type: 'invalid_structured_data',
                severity: 'medium',
                message: 'Invalid JSON-LD structured data found',
                impact: -5
              });
              seoScore -= 5;
            }
          });
          
          if (data.structuredData.length === 0) {
            issues.push({
              type: 'missing_structured_data',
              severity: 'medium',
              message: 'No structured data (JSON-LD) found',
              impact: -8
            });
            seoScore -= 8;
          }
          
          // Link analysis
          const links = document.querySelectorAll('a[href]');
          const internalLinks = Array.from(links).filter(link => {
            const href = link.getAttribute('href');
            return href && (href.startsWith('/') || 
                          href.startsWith('#') || 
                          link.href.startsWith(window.location.origin));
          });
          const externalLinks = Array.from(links).filter(link => {
            const href = link.getAttribute('href');
            return href && href.startsWith('http') && 
                   !link.href.startsWith(window.location.origin);
          });
          
          data.links = {
            total: links.length,
            internal: internalLinks.length,
            external: externalLinks.length,
            nofollow: Array.from(links).filter(l => l.rel.includes('nofollow')).length,
            ugc: Array.from(links).filter(l => l.rel.includes('ugc')).length,
            sponsored: Array.from(links).filter(l => l.rel.includes('sponsored')).length
          };
          
          // Check for too many external links
          if (externalLinks.length > 100) {
            issues.push({
              type: 'too_many_external_links',
              severity: 'medium',
              count: externalLinks.length,
              message: 'Excessive external links detected',
              impact: -5
            });
            seoScore -= 5;
          }
          
          // Check for broken internal links (anchors)
          const anchorLinks = Array.from(links).filter(l => l.getAttribute('href')?.startsWith('#'));
          let brokenAnchors = 0;
          
          anchorLinks.forEach(link => {
            const targetId = link.getAttribute('href').substring(1);
            if (targetId && !document.getElementById(targetId)) {
              brokenAnchors++;
            }
          });
          
          if (brokenAnchors > 0) {
            issues.push({
              type: 'broken_anchor_links',
              severity: 'medium',
              count: brokenAnchors,
              message: `${brokenAnchors} broken anchor links found`,
              impact: -5
            });
            seoScore -= 5;
          }
          
          // Page speed indicators
          const scripts = document.querySelectorAll('script[src]');
          const renderBlockingScripts = Array.from(scripts).filter(s => 
            !s.async && !s.defer && !s.type.includes('module')
          );
          
          if (renderBlockingScripts.length > 3) {
            issues.push({
              type: 'render_blocking_scripts',
              severity: 'medium',
              count: renderBlockingScripts.length,
              message: `${renderBlockingScripts.length} render-blocking scripts detected`,
              impact: -5
            });
            seoScore -= 5;
          }
          
          // Check for sitemap reference
          const sitemapLink = document.querySelector('link[rel="sitemap"]');
          data.sitemap = sitemapLink?.href || '';
          
          // Language and hreflang
          const htmlLang = document.documentElement.getAttribute('lang');
          const hreflangLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
          
          if (!htmlLang) {
            issues.push({
              type: 'missing_language',
              severity: 'high',
              message: 'Page language not specified',
              impact: -5
            });
            seoScore -= 5;
          }
          
          data.language = {
            htmlLang: htmlLang,
            hreflangCount: hreflangLinks.length
          };
          
          // Mobile friendliness checks
          const viewportMeta = document.querySelector('meta[name="viewport"]');
          if (viewportMeta) {
            const content = viewportMeta.content;
            if (!content.includes('width=device-width')) {
              issues.push({
                type: 'viewport_not_responsive',
                severity: 'high',
                message: 'Viewport not set for responsive design',
                impact: -10
              });
              seoScore -= 10;
            }
          }
          
          // Check for Flash content (deprecated)
          const hasFlash = document.querySelector('object[type*="flash"], embed[type*="flash"]');
          if (hasFlash) {
            issues.push({
              type: 'flash_content',
              severity: 'critical',
              message: 'Flash content detected (not supported by modern browsers)',
              impact: -15
            });
            seoScore -= 15;
          }
          
          return {
            score: Math.max(0, seoScore),
            data: data,
            issues: issues,
            summary: {
              critical: issues.filter(i => i.severity === 'critical').length,
              high: issues.filter(i => i.severity === 'high').length,
              medium: issues.filter(i => i.severity === 'medium').length,
              low: issues.filter(i => i.severity === 'low').length
            }
          };
        }
      });
      
      return result.result;
      
    } catch (error) {
      console.error('SEO analysis error:', error);
      return {
        error: error.message,
        score: 0,
        data: {},
        issues: []
      };
    }
  }
}