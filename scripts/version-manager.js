#!/usr/bin/env node

/**
 * Version Manager for ANIMO Pilates Studio
 * 
 * This script automatically syncs version numbers across:
 * - package.json
 * - app.json (Expo version)
 * - android/app/build.gradle (versionName)
 * 
 * Usage:
 *   node scripts/version-manager.js bump patch|minor|major
 *   node scripts/version-manager.js set 1.0.5
 *   node scripts/version-manager.js show
 */

const fs = require('fs');
const path = require('path');

class VersionManager {
  constructor() {
    this.root = process.cwd();
    this.packageJsonPath = path.join(this.root, 'package.json');
    this.appJsonPath = path.join(this.root, 'app.json');
    this.buildGradlePath = path.join(this.root, 'android/app/build.gradle');
  }

  // Parse semantic version
  parseVersion(version) {
    const parts = version.split('.');
    return {
      major: parseInt(parts[0]),
      minor: parseInt(parts[1]),
      patch: parseInt(parts[2])
    };
  }

  // Format version object to string
  formatVersion(versionObj) {
    return `${versionObj.major}.${versionObj.minor}.${versionObj.patch}`;
  }

  // Bump version according to type
  bumpVersion(currentVersion, type) {
    const version = this.parseVersion(currentVersion);
    
    switch (type) {
      case 'patch':
        version.patch++;
        break;
      case 'minor':
        version.minor++;
        version.patch = 0;
        break;
      case 'major':
        version.major++;
        version.minor = 0;
        version.patch = 0;
        break;
      default:
        throw new Error(`Invalid bump type: ${type}. Use patch, minor, or major.`);
    }
    
    return this.formatVersion(version);
  }

  // Read current version from package.json
  getCurrentVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }
  }

  // Update package.json version
  updatePackageJson(newVersion) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      packageJson.version = newVersion;
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ Updated package.json version to ${newVersion}`);
    } catch (error) {
      throw new Error(`Failed to update package.json: ${error.message}`);
    }
  }

  // Update app.json version
  updateAppJson(newVersion) {
    try {
      const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
      appJson.expo.version = newVersion;
      fs.writeFileSync(this.appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
      console.log(`✅ Updated app.json version to ${newVersion}`);
    } catch (error) {
      throw new Error(`Failed to update app.json: ${error.message}`);
    }
  }

  // Update Android build.gradle versionName
  updateBuildGradle(newVersion) {
    try {
      let buildGradle = fs.readFileSync(this.buildGradlePath, 'utf8');
      
      // Update versionName
      buildGradle = buildGradle.replace(
        /versionName\s+["'][^"']*["']/,
        `versionName "${newVersion}"`
      );
      
      fs.writeFileSync(this.buildGradlePath, buildGradle);
      console.log(`✅ Updated Android build.gradle versionName to ${newVersion}`);
    } catch (error) {
      throw new Error(`Failed to update build.gradle: ${error.message}`);
    }
  }

  // Update hardcoded versions in source code
  updateHardcodedVersions(newVersion) {
    try {
      const sourceFiles = [
        'src/screens/client/ClientProfile.tsx',
        'src/screens/instructor/InstructorProfile.tsx',
        'src/screens/admin/AdminProfile.tsx',
        'src/screens/reception/ReceptionProfile.tsx'
      ];

      let updatedCount = 0;
      
      for (const filePath of sourceFiles) {
        const fullPath = path.join(this.root, filePath);
        if (fs.existsSync(fullPath)) {
          let content = fs.readFileSync(fullPath, 'utf8');
          
          // Update hardcoded version patterns
          const patterns = [
            /v\d+\.\d+\.\d+/g,  // v1.0.1, v2.3.4, etc.
            /version:\s*["']\d+\.\d+\.\d+["']/g,  // version: "1.0.1"
            /"version":\s*["']\d+\.\d+\.\d+["']/g  // "version": "1.0.1"
          ];
          
          let fileUpdated = false;
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              content = content.replace(pattern, (match) => {
                if (match.startsWith('v')) {
                  return `v${newVersion}`;
                } else if (match.includes('version')) {
                  return match.replace(/\d+\.\d+\.\d+/, newVersion);
                }
                return match;
              });
              fileUpdated = true;
            }
          }
          
          if (fileUpdated) {
            fs.writeFileSync(fullPath, content);
            console.log(`✅ Updated hardcoded version in ${filePath}`);
            updatedCount++;
          }
        }
      }
      
      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} source files with new version`);
      } else {
        console.log('ℹ️  No hardcoded versions found in source files');
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Failed to update hardcoded versions: ${error.message}`);
    }
  }

  // Show current versions
  showVersions() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
      const buildGradle = fs.readFileSync(this.buildGradlePath, 'utf8');
      
      const versionNameMatch = buildGradle.match(/versionName\s+["']([^"']*)["']/);
      const androidVersion = versionNameMatch ? versionNameMatch[1] : 'Not found';
      
      console.log('\n📱 Current Versions:');
      console.log(`📦 package.json:     ${packageJson.version}`);
      console.log(`📱 app.json:         ${appJson.expo.version}`);
      console.log(`🤖 Android:          ${androidVersion}`);
      console.log(`🍎 iOS buildNumber:  ${appJson.expo.ios.buildNumber}`);
      
      // Check if versions are in sync
      const versions = [packageJson.version, appJson.expo.version, androidVersion];
      const uniqueVersions = [...new Set(versions)];
      
      if (uniqueVersions.length === 1) {
        console.log('\n✅ All versions are synchronized!');
      } else {
        console.log('\n⚠️  Versions are not synchronized!');
        console.log('Run: node scripts/version-manager.js sync');
      }
    } catch (error) {
      console.error(`❌ Error reading versions: ${error.message}`);
    }
  }

  // Sync all versions to match package.json
  syncVersions() {
    const currentVersion = this.getCurrentVersion();
    console.log(`🔄 Syncing all versions to ${currentVersion}...`);
    
    this.updateAppJson(currentVersion);
    this.updateBuildGradle(currentVersion);
    this.updateHardcodedVersions(currentVersion);
    
    console.log('\n✅ All versions synchronized!');
  }

  // Main execution
  run() {
    const args = process.argv.slice(2);
    const command = args[0];
    const param = args[1];

    if (!command) {
      console.log('Usage:');
      console.log('  node scripts/version-manager.js show');
      console.log('  node scripts/version-manager.js sync');
      console.log('  node scripts/version-manager.js bump patch|minor|major');
      console.log('  node scripts/version-manager.js set <version>');
      return;
    }

    try {
      switch (command) {
        case 'show':
          this.showVersions();
          break;
          
        case 'sync':
          this.syncVersions();
          break;
          
        case 'bump':
          if (!param) {
            console.error('❌ Please specify bump type: patch, minor, or major');
            return;
          }
          const currentVersion = this.getCurrentVersion();
          const newVersion = this.bumpVersion(currentVersion, param);
          console.log(`🔄 Bumping version from ${currentVersion} to ${newVersion}...`);
          this.updatePackageJson(newVersion);
          this.updateAppJson(newVersion);
          this.updateBuildGradle(newVersion);
          this.updateHardcodedVersions(newVersion);
          console.log('\n✅ Version bumped successfully!');
          break;
          
        case 'set':
          if (!param) {
            console.error('❌ Please specify version number (e.g., 1.0.5)');
            return;
          }
          if (!/^\d+\.\d+\.\d+$/.test(param)) {
            console.error('❌ Invalid version format. Use semantic versioning (e.g., 1.0.5)');
            return;
          }
          console.log(`🔄 Setting version to ${param}...`);
          this.updatePackageJson(param);
          this.updateAppJson(param);
          this.updateBuildGradle(param);
          this.updateHardcodedVersions(param);
          console.log('\n✅ Version set successfully!');
          break;
          
        default:
          console.error(`❌ Unknown command: ${command}`);
          console.log('Available commands: show, sync, bump, set');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the version manager
const versionManager = new VersionManager();
versionManager.run(); 