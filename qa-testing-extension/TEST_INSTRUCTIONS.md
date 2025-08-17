# Testing the QA Extension

## Quick Test Steps:

1. **Load the Extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `qa-testing-extension` folder

2. **Open Extension & Configure:**
   - Click the extension icon in Chrome toolbar
   - Make sure these are CHECKED:
     - ✅ Full-page Screenshots
     - ✅ Generate AI Report
   - Enter your OpenRouter API key
   - Keep the default model: `google/gemini-2.0-flash-exp:free`

3. **Test with Debug Page:**
   - Open the test page in your browser:
     - File path: `qa-testing-extension/test-debug.html`
     - Or use any URL like: `https://example.com`
   - Copy the URL from the address bar
   - Paste it in the extension's URL field
   - Click "Start Testing"

4. **Check Console for Debug Info:**
   - Right-click extension icon → "Manage Extension"
   - Click "Service Worker" link under "Inspect views"
   - This opens the background script console
   - Look for these logs:
     ```
     === STARTING TEST ===
     Test configuration: {fullScreenshots: true, aiAnalysis: true, ...}
     === PHASE 1: Starting screenshot capture ===
     Desktop screenshot captured successfully
     Mobile screenshot captured successfully
     Generating AI reports for [URL]...
     Found 2 screenshots for URL
     ```

5. **View Results:**
   - Wait for test to complete (progress bar reaches 100%)
   - Click "View Report"
   - Check the "Visual Analysis" tab
   - Check the "Screenshots" tab

## Troubleshooting:

### If "No screenshots captured" appears:
1. Check the console for errors
2. Verify "Full-page Screenshots" checkbox is checked
3. Look for any permission errors in console

### If Visual Analysis shows "Not Available":
1. Check if screenshots were captured (Screenshots tab)
2. Verify API key is correct
3. Check console for API errors
4. Look for these specific logs:
   - "Found X screenshots for URL"
   - "Sending X full-page screenshots to AI"

### Common Issues:
- **Permission Denied**: Reload the extension after granting permissions
- **Tab Capture Failed**: Some sites block screenshots (try the test-debug.html file)
- **API Error**: Check your OpenRouter API key and model name

## Expected Console Output:
```
=== STARTING TEST ===
Test ID: test_1234567890_abc123
URLs to test: ["https://example.com"]
Test configuration: {fullScreenshots: true, mobileTablet: true, ...}
Full screenshots enabled: true
AI Analysis enabled: true
Screenshot config check - fullScreenshots: true
=== PHASE 1: Starting screenshot capture (desktop and mobile in parallel) ===
Desktop screenshot captured successfully
Mobile screenshot captured successfully
Found 2 screenshots for URL https://example.com
Screenshot types: ['desktop', 'mobile']
Starting visual AI report generation...
Adding desktop screenshot to API request (stitched: true)
Adding mobile screenshot to API request (stitched: true)
Sending 2 full-page screenshots to AI for https://example.com
Visual report generated: Success
```