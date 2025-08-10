import packageJson from '../../package.json';

/**
 * Get the current app version from package.json
 * @returns The current app version (e.g., "1.0.4")
 */
export const getAppVersion = (): string => {
  return packageJson.version;
};

/**
 * Get the formatted app version for display
 * @returns The formatted version (e.g., "v1.0.4")
 */
export const getFormattedAppVersion = (): string => {
  return `v${getAppVersion()}`;
}; 