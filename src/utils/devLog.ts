/**
 * Development logging utilities
 * These functions only log in development mode
 */

const isDevelopment = __DEV__;

export const devLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

export const devError = (...args: any[]) => {
  if (isDevelopment) {
    console.error(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

export const devInfo = (...args: any[]) => {
  if (isDevelopment) {
    console.info(...args);
  }
};
