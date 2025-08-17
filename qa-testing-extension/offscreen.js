// Offscreen document for full page screenshot capturing

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    captureFullPageScreenshot(request.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function captureFullPageScreenshot(url) {
  try {
    // Create an iframe to load the page
    const iframe = document.createElement('iframe');
    iframe.style.width = '1920px';
    iframe.style.height = '1080px';
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    
    // Load the URL
    iframe.src = url;
    
    // Wait for the iframe to load
    await new Promise((resolve, reject) => {
      iframe.onload = resolve;
      iframe.onerror = reject;
      setTimeout(() => reject(new Error('Iframe load timeout')), 30000);
    });
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get page dimensions
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const body = doc.body;
    const html = doc.documentElement;
    
    const pageHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
    
    const pageWidth = Math.max(
      body.scrollWidth,
      body.offsetWidth,
      html.clientWidth,
      html.scrollWidth,
      html.offsetWidth
    );
    
    // Capture screenshot segments
    const segments = [];
    const viewportHeight = 1080;
    const numSegments = Math.ceil(pageHeight / viewportHeight);
    
    for (let i = 0; i < numSegments; i++) {
      const scrollY = i * viewportHeight;
      iframe.contentWindow.scrollTo(0, scrollY);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Note: Actual screenshot capture would need chrome.tabs API
      // This is a placeholder for the structure
      segments.push({
        index: i,
        scrollY: scrollY,
        height: Math.min(viewportHeight, pageHeight - scrollY)
      });
    }
    
    // Clean up
    document.body.removeChild(iframe);
    
    return {
      success: true,
      dimensions: {
        width: pageWidth,
        height: pageHeight
      },
      segments: segments
    };
    
  } catch (error) {
    console.error('Offscreen capture error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}