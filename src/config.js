const fs = require('fs');
const path = require('path');

const CONFIG_FILE_NAME = 'genctx.json';

// A sensible base that applies to most projects.
const BASE_CONFIG = {
  excludePaths: [
    'context.md', '.DS_Store', 'node_modules', 'vendor',
    '.git/', '.github/', 'dist/', 'build/', '.gradle/', '.idea/',
    '*.log', '*.lock', 'LICENSE', 'yarn.lock', 'package-lock.json',
  ],
  includePaths: [],
  includeExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss',
    '.json', '.md', '.txt', '.yml', '.yaml',
  ],
  maxFileSizeKB: 500,
  outputFile: 'context.md',
  useGitignore: false,  // Whether to respect .gitignore files in the project.
  // Tracks which presets have been applied to this configuration.
  presets: [],
};

// Expanded list of additive presets for various technologies.
const PRESETS = {
  // Web & General
  nodejs: {
    excludePaths: ['coverage/', '.env'],
    includeExtensions: ['.mjs', '.cjs'],
  },
  python: {
    excludePaths: ['__pycache__/', '.venv/', 'venv/', '*.pyc', '.env', 'requirements.txt'],
    includeExtensions: ['.py'],
  },
  // Mobile
  android: {
    excludePaths: ['captures/', '*.apk', '*.aab', '*.iml', 'gradle/', 'gradlew', 'gradlew.bat', 'local.properties'],
    includeExtensions: ['.java', '.kt', '.kts', '.xml', '.gradle', '.pro'],
  },
  swift: {
    excludePaths: ['.swiftpm/', 'Packages/', 'DerivedData/', '*.xcodeproj', '*.xcworkspace'],
    includeExtensions: ['.swift'],
  },
  // Backend & Systems
  java: {
    excludePaths: ['target/', '.mvn/', '*.jar', '*.war', 'logs/'],
    includeExtensions: ['.java', '.xml', '.properties', '.pom'],
  },
  go: {
    excludePaths: ['*.exe', '*.bin', 'go.sum'],
    includeExtensions: ['.go'],
  },
  rust: {
    excludePaths: ['target/', 'Cargo.lock'],
    includeExtensions: ['.rs'],
  },
  ruby: {
    excludePaths: ['tmp/', 'log/', 'Gemfile.lock'],
    includeExtensions: ['.rb'],
  },
  php: {
    excludePaths: ['composer.lock'],
    includeExtensions: ['.php'],
  },
  dotnet: {
    excludePaths: ['bin/', 'obj/', '*.sln', '*.csproj'],
    includeExtensions: ['.cs'],
  },
  c_cpp: {
    excludePaths: ['*.o', '*.out', '*.a', '*.so', 'Makefile', 'CMakeLists.txt'],
    includeExtensions: ['.c', '.h', '.cpp', '.hpp'],
  },
  // Data Science
  r: {
    excludePaths: ['.Rhistory', '.RData'],
    includeExtensions: ['.r', '.R'],
  },
};

/**
 * Loads the configuration from genctx.json if it exists.
 * @returns {object|null} The loaded configuration object or null if not found.
 */
function loadConfig() {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (e) {
      console.warn(`⚠️ Warning: Could not parse ${CONFIG_FILE_NAME}. Using defaults. Error: ${e.message}`);
      return null;
    }
  }
  return null;
}

/**
 * Saves the configuration object to genctx.json.
 * @param {object} config The configuration object to save.
 */
function saveConfig(config) {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  try {
    // Sort arrays for a clean and deterministic file output.
    config.excludePaths.sort();
    config.includeExtensions.sort();
    if (config.presets) config.presets.sort();

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`💾 Configuration saved to ${CONFIG_FILE_NAME}`);
  } catch (e) {
    console.error(`❌ Error saving configuration to ${CONFIG_FILE_NAME}: ${e.message}`);
  }
}

module.exports = {
    BASE_CONFIG,
    PRESETS,
    loadConfig,
    saveConfig
};