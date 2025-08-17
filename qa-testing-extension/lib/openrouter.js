// OpenRouter AI integration module
export class OpenRouterClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.model = 'google/gemini-2.0-flash-exp:free'; // Using free model
  }

  async analyzeWebsiteData(analysisData, screenshots) {
    try {
      const content = this.prepareContent(analysisData, screenshots);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'QA Testing Suite'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: content
            }
          ],
          max_tokens: 4000,
          temperature: 0.3,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenRouter API');
      }
      
      return {
        report: data.choices[0].message.content,
        usage: data.usage,
        model: this.model,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('OpenRouter analysis error:', error);
      throw error;
    }
  }

  getSystemPrompt() {
    return `You are a professional website QA analyst specializing in comprehensive quality assurance testing. 
Your role is to analyze website testing data and screenshots to create detailed, actionable QA reports.

Your analysis should:
1. Be thorough and professional
2. Prioritize issues by severity (Critical > High > Medium > Low)
3. Provide specific, actionable recommendations
4. Consider both technical and user experience aspects
5. Format output in clean, readable Markdown

Focus areas:
- Visual design and layout issues
- Accessibility compliance (WCAG/AODA)
- Performance optimization
- SEO best practices
- Mobile responsiveness
- Security concerns
- User experience problems

Always provide constructive feedback with clear solutions.`;
  }

  prepareContent(analysisData, screenshots) {
    const content = [];
    
    // Add text analysis request
    content.push({
      type: 'text',
      text: this.createAnalysisPrompt(analysisData)
    });
    
    // Add screenshots (limit to 10)
    const screenshotsToAnalyze = screenshots.slice(0, 10);
    
    screenshotsToAnalyze.forEach((screenshot, index) => {
      if (screenshot.data && screenshot.data.length > 0) {
        // Use the first screenshot segment
        const mainScreenshot = screenshot.data[0];
        
        if (mainScreenshot.dataUrl) {
          content.push({
            type: 'image_url',
            image_url: {
              url: mainScreenshot.dataUrl,
              detail: 'high'
            }
          });
          
          content.push({
            type: 'text',
            text: `Screenshot ${index + 1} from: ${screenshot.url}`
          });
        }
      }
    });
    
    return content;
  }

  createAnalysisPrompt(data) {
    const { summary, urls } = data;
    
    // Count issues by type
    const issueTypes = {};
    urls.forEach(urlData => {
      urlData.issues?.forEach(issue => {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
      });
    });
    
    return `# Website QA Analysis Request

## Test Summary
- **URLs Tested:** ${summary.totalUrls}
- **Total Issues Found:** ${summary.totalIssues}
- **Test Duration:** ${Math.round(summary.testDuration / 1000)} seconds

## URLs Tested
${urls.map(u => `- ${u.url} (${u.issues?.length || 0} issues)`).join('\n')}

## Issue Distribution
${Object.entries(issueTypes).map(([type, count]) => `- ${type.replace(/_/g, ' ')}: ${count}`).join('\n')}

## Detailed Test Results
${JSON.stringify(urls.map(u => ({
  url: u.url,
  issues: u.issues?.slice(0, 10), // Limit issues per URL
  tests: u.tests ? Object.keys(u.tests) : [],
  metrics: u.metrics
})), null, 2)}

## Analysis Requirements

Please provide a comprehensive QA report in Markdown format that includes:

### 1. Executive Summary
- Overall website quality assessment (score out of 100)
- Key findings and critical issues
- Readiness for production/client delivery
- Immediate action items

### 2. Visual Analysis (Based on Screenshots)
Analyze the provided screenshots for:
- Layout consistency and alignment issues
- Visual hierarchy problems
- Spacing and padding inconsistencies
- Color scheme and contrast issues
- Typography problems
- Mobile responsiveness concerns
- Any broken or misaligned elements

### 3. Critical Issues (Must Fix)
List all critical issues that must be addressed before launch:
- Security vulnerabilities
- Broken functionality
- Major accessibility violations
- Severe performance problems

### 4. High Priority Issues
Issues that significantly impact user experience:
- Navigation problems
- Form usability issues
- Mobile compatibility problems
- SEO blockers

### 5. Medium Priority Issues
Issues that should be addressed but aren't blocking:
- Minor visual inconsistencies
- Performance optimizations
- SEO improvements
- Content issues

### 6. Low Priority Enhancements
Nice-to-have improvements:
- Visual polish
- Additional optimizations
- Enhanced features

### 7. Technical Analysis
- Performance metrics and recommendations
- SEO optimization suggestions
- Accessibility compliance status
- Browser compatibility concerns

### 8. Detailed Recommendations
For each major issue category, provide:
- Specific problem description
- Impact on users/business
- Recommended solution
- Implementation priority
- Estimated effort (if applicable)

### 9. Positive Observations
Highlight what's working well:
- Strong points of the website
- Good practices observed
- Features that enhance user experience

### 10. Next Steps & Action Plan
- Prioritized task list
- Quick wins (easy fixes with high impact)
- Timeline recommendations
- Testing checklist for verification

## Output Format Requirements
- Use clear Markdown formatting with proper headers
- Include severity badges: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- Provide code examples where helpful
- Keep language professional but accessible
- Focus on actionable insights

Please analyze the screenshots carefully for visual issues that may not be captured in the automated tests. Pay special attention to:
- Text readability and contrast
- Button and link visibility
- Form field clarity
- Image quality and loading
- Overall visual appeal and professionalism
- Consistency across different pages
- Mobile vs desktop presentation`;
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      return data.data || [];
      
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  }

  async estimateCost(tokenCount) {
    // Estimate cost based on token count
    // Gemini 2.0 Flash free tier - no cost for free model
    if (this.model.includes(':free')) {
      return {
        cost: 0,
        model: this.model,
        tokens: tokenCount,
        message: 'Using free model'
      };
    }
    
    // For paid models, estimate based on typical pricing
    const costPer1kTokens = 0.001; // Example rate
    const estimatedCost = (tokenCount / 1000) * costPer1kTokens;
    
    return {
      cost: estimatedCost,
      model: this.model,
      tokens: tokenCount,
      message: `Estimated cost: $${estimatedCost.toFixed(4)}`
    };
  }
}