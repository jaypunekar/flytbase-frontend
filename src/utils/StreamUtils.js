/**
 * Utility functions for handling stream-related operations
 */

/**
 * Format an IVS URL to ensure it's in the correct format for the IVS player
 * Sometimes users might input the AWS console URL instead of the actual playback URL
 * 
 * @param {string} url - The original IVS URL input
 * @returns {string} - The formatted playback URL
 */
export const formatIVSUrl = (url) => {
  if (!url) return '';
  
  console.log('Formatting IVS URL:', url);

  // Handle common playback URL patterns
  if (url.match(/^https:\/\/.*\.m3u8(\?.*)?$/)) {
    console.log('URL is already an m3u8 playback URL');
    return url;
  }
  
  // Handle direct channel playback URLs
  if (url.match(/^https:\/\/.*live-video\.net\/.*$/)) {
    console.log('URL is already a live-video.net URL');
    return url;
  }
  
  // Handle playback endpoints
  if (url.includes('playback.') && url.includes('ivs')) {
    console.log('URL is a playback endpoint');
    // Make sure it has https protocol
    if (!url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
  
  // Extract channel ID from console URL
  if (url.includes('console.aws.amazon.com/ivs')) {
    console.log('URL is an AWS console URL, extracting channel ID');
    const channelIdMatch = url.match(/channel\/([a-zA-Z0-9]+)/);
    if (channelIdMatch && channelIdMatch[1]) {
      const channelId = channelIdMatch[1];
      // Use US-WEST-2 as default region if not specified
      const region = url.includes('region=') ? 
        url.match(/region=([a-z0-9-]+)/)[1] : 
        'us-west-2';
      
      const playbackUrl = `https://${region}.live-video.net/api/video/v1/aws.ivs.${region}.channel.${channelId}.m3u8`;
      console.log('Generated playback URL:', playbackUrl);
      return playbackUrl;
    }
  }
  
  // Handle direct channel ARNs
  if (url.includes('arn:aws:ivs:')) {
    console.log('URL is an ARN, extracting region and channel ID');
    const arnMatch = url.match(/arn:aws:ivs:([a-z0-9-]+):[0-9]+:channel\/([a-zA-Z0-9]+)/);
    if (arnMatch) {
      const [_, region, channelId] = arnMatch;
      const playbackUrl = `https://${region}.live-video.net/api/video/v1/aws.ivs.${region}.channel.${channelId}.m3u8`;
      console.log('Generated playback URL from ARN:', playbackUrl);
      return playbackUrl;
    }
  }
  
  // If it's already a valid playback endpoint but doesn't have the proper protocol
  if (url.includes('.m3u8') && !url.startsWith('https://')) {
    console.log('Adding https:// to m3u8 URL');
    return `https://${url}`;
  }
  
  // Default format for typical IVS test URLs (if it looks like an IVS playground URL)
  if (url.includes('ivs') && !url.includes('.m3u8')) {
    // Try to guess the format
    console.log('URL appears to be an IVS URL without clear format, attempting to standardize');
    
    // Add a default suffix if it doesn't have one
    if (!url.endsWith('/')) {
      url = url + '/';
    }
    
    if (!url.endsWith('.m3u8')) {
      url = url + 'stream.m3u8';
    }
    
    // Ensure https protocol
    if (!url.startsWith('https://')) {
      url = 'https://' + url.replace(/^http:\/\//, '');
    }
    
    console.log('Standardized URL:', url);
    return url;
  }
  
  // Return original URL if we can't determine a better format
  console.log('Unable to reformat URL, returning original');
  return url;
};

/**
 * Extract meaningful stream metrics from logs
 * 
 * @param {Array} logs - Array of stream logs
 * @returns {Object} - Metrics object with counts and recent values
 */
export const extractStreamMetrics = (logs = []) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    return {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      framesProcessed: 0,
      lastProcessedTime: null,
      recentActivity: null
    };
  }
  
  const metrics = {
    totalLogs: logs.length,
    errorCount: 0,
    warningCount: 0,
    framesProcessed: 0,
    lastProcessedTime: null,
    recentActivity: null
  };
  
  // Sort logs by time (most recent first)
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  
  // Get most recent log for activity summary
  if (sortedLogs.length > 0) {
    metrics.lastProcessedTime = new Date(sortedLogs[0].created_at);
    
    // Extract a readable summary from the latest log
    const latestLog = sortedLogs[0];
    if (latestLog.message) {
      // Try to extract a meaningful summary
      const msgLower = latestLog.message.toLowerCase();
      if (msgLower.includes('detected') || msgLower.includes('observed')) {
        // Find the sentence with detection information
        const sentences = latestLog.message.split('. ');
        const detectionSentence = sentences.find(s => 
          s.toLowerCase().includes('detected') || 
          s.toLowerCase().includes('observed') ||
          s.toLowerCase().includes('recognized')
        );
        
        metrics.recentActivity = detectionSentence || latestLog.message.substring(0, 100) + '...';
      } else {
        metrics.recentActivity = latestLog.message.substring(0, 100) + '...';
      }
    }
  }
  
  // Count log types and extract processing info
  logs.forEach(log => {
    if (log.log_type === 'error') metrics.errorCount++;
    if (log.log_type === 'warning') metrics.warningCount++;
    
    // Count frames processed
    if (log.frame_id && !isNaN(log.frame_id)) {
      metrics.framesProcessed = Math.max(metrics.framesProcessed, log.frame_id);
    }
  });
  
  return metrics;
};

export default {
  formatIVSUrl,
  extractStreamMetrics
}; 