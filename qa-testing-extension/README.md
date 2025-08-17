# QA Testing Suite - Chrome Extension

A comprehensive Chrome extension for automated website quality assurance testing with AI-powered analysis. Perfect for developers, QA testers, and agencies who need to ensure websites meet professional standards before launch.

## 🚀 Features

### Core Testing Capabilities

#### 📸 **Visual Testing**
- Full-page screenshot capture with automatic scrolling
- Multi-viewport testing (Mobile: 375px, Tablet: 768px, Desktop: 1920px)
- Layout and spacing validation
- Element overlap detection
- Visual hierarchy analysis

#### 🔗 **Technical Testing**
- Broken link detection with status codes
- Staging/development URL detection
- Mixed content warnings
- Resource loading analysis
- Render-blocking resource identification

#### ♿ **Accessibility (WCAG/AODA)**
- WCAG 2.1 Level A/AA compliance checking
- Alt text validation for images
- Form label association
- Heading hierarchy analysis
- Color contrast checking
- Keyboard navigation testing
- ARIA attribute validation

#### ⚡ **Performance Analysis**
- Core Web Vitals (LCP, FCP, CLS)
- Page load timing metrics
- Resource optimization recommendations
- Memory usage tracking
- Network performance analysis

#### 🔍 **SEO Analysis**
- Title and meta description optimization
- Heading structure (H1-H6) validation
- Open Graph and Twitter Card tags
- Structured data/JSON-LD validation
- Canonical URL checking
- Image alt text for SEO

#### 🤖 **AI-Powered Analysis**
- Comprehensive visual analysis of screenshots
- Issue prioritization by severity
- Actionable recommendations
- Professional Markdown reports
- Client-ready deliverables

## 📋 Installation

### Prerequisites
- Google Chrome browser (version 88 or higher)
- OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))

### Steps

1. **Download the Extension**
   ```bash
   git clone https://github.com/yourusername/qa-testing-extension.git
   cd qa-testing-extension
   ```

2. **Generate Icons**
   - Open `assets/icons/icon-generator.html` in Chrome
   - Click "Generate Icons" 
   - Download all three icon sizes to the `assets/icons/` folder

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `qa-testing-extension` folder

4. **Configure API Key**
   - Click the extension icon in Chrome toolbar
   - Enter your OpenRouter API key
   - Key is stored securely in local storage

## 🎯 Usage Guide

### Basic Testing Workflow

1. **Enter URLs to Test**
   - Click the extension icon
   - Enter URLs in the text area (one per line)
   - Maximum 50 URLs per test batch

2. **Configure Test Options**
   Select which tests to run:
   - ✅ Full-page Screenshots
   - ✅ Mobile/Tablet Testing  
   - ✅ Layout/Spacing Validation
   - ✅ Broken Link Detection
   - ✅ Staging URL Detection
   - ✅ Performance Metrics
   - ✅ SEO Analysis
   - ✅ AODA Accessibility
   - ✅ AI Report Generation

3. **Start Testing**
   - Click "Start Testing" button
   - Monitor progress in real-time
   - Tests run in background tabs

4. **Review Results**
   - View comprehensive report in new tab
   - AI-generated analysis with recommendations
   - Export as Markdown, JSON, or PDF

### Advanced Features

#### Bulk URL Testing
```
https://example.com
https://example.com/about
https://example.com/services
https://example.com/contact
```

#### Custom Test Profiles
- **Quick Check**: Disable AI for faster basic testing
- **Full Audit**: Enable all tests for comprehensive analysis
- **Accessibility Focus**: Priority on WCAG compliance
- **Performance Focus**: Emphasis on speed metrics

## 📊 Understanding Results

### Overall Score
- **90-100**: Excellent - Ready for production
- **70-89**: Good - Minor improvements needed
- **50-69**: Fair - Several issues to address
- **Below 50**: Poor - Significant work required

### Issue Severity Levels
- 🔴 **Critical**: Must fix before launch
- 🟠 **High**: Should fix soon
- 🟡 **Medium**: Important but not blocking
- 🟢 **Low**: Nice to have improvements

### Report Sections

1. **Executive Summary**
   - Overall quality assessment
   - Key findings
   - Production readiness

2. **Visual Analysis**
   - Layout consistency
   - Responsive design issues
   - Visual hierarchy

3. **Technical Issues**
   - Broken functionality
   - Performance problems
   - Security concerns

4. **Accessibility Compliance**
   - WCAG violations
   - Keyboard navigation
   - Screen reader compatibility

5. **SEO Optimization**
   - Meta tag issues
   - Content structure
   - Technical SEO

6. **Recommendations**
   - Prioritized action items
   - Quick wins
   - Long-term improvements

## 🛠️ Technical Details

### Architecture
- **Manifest V3** Chrome Extension
- **Background Service Worker** for test orchestration
- **Content Scripts** for page analysis
- **Chrome APIs** for screenshot capture and debugging

### Testing Modules
- `screenshot.js` - Full-page capture
- `link-checker.js` - HTTP status validation
- `staging-detector.js` - Environment detection
- `layout-validator.js` - Spacing/overlap checks
- `accessibility.js` - WCAG compliance
- `seo-analyzer.js` - SEO optimization
- `performance.js` - Speed metrics
- `openrouter.js` - AI integration

### Data Storage
- Local storage for settings and API keys
- Session storage for temporary data
- JSON export for archival

## 🔒 Privacy & Security

- **Local Processing**: All tests run locally in your browser
- **Secure API Storage**: API keys encrypted in local storage
- **No Data Collection**: We don't collect or store your test data
- **OpenRouter Only**: Screenshots sent only to OpenRouter for AI analysis (first 10 URLs)

## 🐛 Troubleshooting

### Common Issues

**Extension Not Loading**
- Ensure Developer Mode is enabled
- Check for manifest.json errors in console

**API Key Invalid**
- Verify key at [openrouter.ai/dashboard](https://openrouter.ai)
- Check for extra spaces in key

**Tests Failing**
- Some sites block automated testing
- Try disabling specific tests
- Check browser console for errors

**Screenshot Issues**
- Large pages may timeout
- JavaScript-heavy sites need more wait time
- Some sites prevent screenshot capture

**Memory Issues**
- Reduce number of URLs per batch
- Disable screenshot capture for large batches
- Close other tabs to free memory

## 📈 Best Practices

### Pre-Launch Testing
1. Test all critical user paths
2. Include form pages and interactive elements
3. Test on staging environment first
4. Review mobile experience carefully
5. Address accessibility issues first

### Client Deliverables
1. Export Markdown report for documentation
2. Include executive summary
3. Prioritize issues by business impact
4. Provide clear reproduction steps
5. Include visual evidence (screenshots)

### Ongoing Maintenance
- Schedule weekly quality checks
- Test after each deployment
- Monitor performance trends
- Track issue resolution

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/qa-testing-extension.git

# Install any development dependencies
npm install

# Make your changes
# Test thoroughly

# Submit PR with description
```

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- OpenRouter for AI analysis capabilities
- Chrome Extensions team for APIs
- WCAG for accessibility guidelines
- The web development community

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: your.email@example.com

## 🚦 Roadmap

### Planned Features
- [ ] Scheduled automated testing
- [ ] CI/CD integration
- [ ] Team collaboration features
- [ ] Historical comparison
- [ ] Custom test rules
- [ ] API endpoint testing
- [ ] Performance budgets
- [ ] Multi-language support
- [ ] Chrome DevTools integration
- [ ] Slack/email notifications

## 📚 Resources

- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** QA Testing Suite Team

Made with ❤️ for web developers and QA professionals