/**
 * Utility functions for handling time conversion and formatting
 */

/**
 * Converts a UTC timestamp to local time and formats it
 * @param timestamp - UTC timestamp string (ISO format)
 * @returns Formatted local time string
 */
export function formatUTCToLocal(timestamp: string): string {
  try {
    const utcDate = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - utcDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return utcDate.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error formatting UTC time:', error);
    return 'Invalid time';
  }
}

/**
 * Converts a local timestamp to relative time format
 * @param timestamp - Local timestamp string
 * @returns Formatted relative time string
 */
export function formatLocalTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error formatting local time:', error);
    return 'Invalid time';
  }
}

/**
 * Formats a timestamp for detailed display (includes time)
 * @param timestamp - Timestamp string (UTC or local)
 * @param isUTC - Whether the timestamp is in UTC format
 * @returns Formatted date and time string
 */
export function formatDetailedTime(timestamp: string, isUTC: boolean = false): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting detailed time:', error);
    return 'Invalid time';
  }
}

/**
 * Checks if a timestamp is in UTC format
 * @param timestamp - Timestamp string
 * @returns True if UTC format, false otherwise
 */
export function isUTCFormat(timestamp: string): boolean {
  return timestamp.includes('T') && timestamp.includes('Z');
} 