
// Safe development mode detection
export const isDev = (): boolean => {
  try {
    return typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
  } catch {
    return false;
  }
};

// Development logging helper
export const devLog = (message: string, ...args: any[]): void => {
  if (isDev()) {
    console.log(`[DEV] ${message}`, ...args);
  }
};

// Development error logging helper
export const devError = (message: string, ...args: any[]): void => {
  if (isDev()) {
    console.error(`[DEV ERROR] ${message}`, ...args);
  }
};

// Cross-platform timeout for fetch requests
export const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
  const controller = new AbortController();
  
  // Set timeout to abort the request
  setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return controller.signal;
};

// Enhanced fetch with timeout
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> => {
  const timeoutSignal = createTimeoutSignal(timeoutMs);
  
  // Combine user signal with timeout signal if provided
  if (options.signal) {
    // If user already provided a signal, we need to handle both
    const userSignal = options.signal;
    const combinedController = new AbortController();
    
    const abortHandler = () => combinedController.abort();
    
    userSignal.addEventListener('abort', abortHandler);
    timeoutSignal.addEventListener('abort', abortHandler);
    
    options.signal = combinedController.signal;
  } else {
    options.signal = timeoutSignal;
  }
  
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
}; 