const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Helper functions (no changes needed for these)
function getFileSizeInKB(filePath) { try { const stats = fs.statSync(filePath); return stats.isFile() ? stats.size / 1024 : 0; } catch (error) { return 0; } }

function estimateTokenCount(text) { return Math.ceil(text.length * 0.25); }

function getLanguageFromExt(filePath) { const ext = path.extname(filePath).toLowerCase(); const filename = path.basename(filePath).toLowerCase(); if (filename === 'gradlew') return 'bash'; if (filename === 'proguard-rules.pro' || ext === '.pro') return 'properties'; if (filename.startsWith('readme')) return 'markdown'; if (filename === 'license') return 'text'; const langMap = { '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx', '.php': 'php', '.html': 'html', '.css': 'css', '.scss': 'scss', '.json': 'json', '.md': 'markdown', '.txt': 'text', '.yml': 'yaml', '.yaml': 'yaml', '.sh': 'bash', '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin', '.kts': 'kotlin', '.dart': 'dart', '.sql': 'sql', '.env': 'dotenv', '.config': 'plaintext', '.xml': 'xml', '.gradle': 'groovy', '.r': 'r', '.R': 'r'}; return langMap[ext] || 'plaintext'; }

function generateTreeStructure(files) { if (!files || files.length === 0) return "[No files to display]"; const tree = {}; files.forEach(file => { const parts = file.startsWith('./') ? file.substring(2).split('/') : file.split('/'); let current = tree; parts.forEach((part, i) => { const isFile = i === parts.length - 1; if (isFile) { current.files = current.files || []; current.files.push(part); } else { current[part] = current[part] || {}; current = current[part]; } }); }); const buildTree = (node, prefix = '') => { let result = ''; const dirs = Object.keys(node).filter(k => k !== 'files').sort(); const files = (node.files || []).sort(); dirs.forEach((dir, i) => { const isLast = i === dirs.length - 1 && files.length === 0; result += `${prefix}${isLast ? '└── ' : '├── '}📁 ${dir}/\n`; result += buildTree(node[dir], `${prefix}${isLast ? '    ' : '│   '}`); }); files.forEach((file, i) => { const isLast = i === files.length - 1; result += `${prefix}${isLast ? '└── ' : '├── '}📄 ${file}\n`; }); return result; }; return buildTree(tree); }

function formatFileSize(sizeInKB) { if (sizeInKB < 0.01 && sizeInKB > 0) return "< 0.01 KB"; if (sizeInKB === 0) return "0 KB"; return sizeInKB < 1024 ? `${sizeInKB.toFixed(2)} KB` : `${(sizeInKB / 1024).toFixed(2)} MB`; }

function formatNumber(num) { return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

/**
 * Scans a string of text to find the longest consecutive sequence of backticks.
 * @param {string} content The text content to scan.
 * @returns {number} The length of the longest backtick sequence found.
 */
function getLongestBacktickSequence(content) {
    // Use a regular expression to find all sequences of backticks
    const matches = content.match(/`+/g) || [];
    if (matches.length === 0) {
        return 0; // No backticks in the content
    }
    // Find the length of the longest sequence from all matches
    return Math.max(...matches.map(match => match.length));
}

/**
 * Reads the .gitignore file from the project root and parses it into exclusion patterns.
 * This is a simplified parser that handles comments and basic file/directory patterns.
 * @returns {string[]} An array of patterns to be excluded.
 */
function parseGitignore() {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        return [];
    }

    const patterns = fs.readFileSync(gitignorePath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        // Filter out empty lines and comments.
        .filter(line => line && !line.startsWith('#'))
        // Basic conversion to patterns our find command can use.
        .map(pattern => {
            // Remove leading slashes for broader matching, e.g., /build -> build
            if (pattern.startsWith('/')) {
                return pattern.substring(1);
            }
            return pattern;
        });

    console.log(`   Loaded ${patterns.length} patterns from .gitignore.`);
    return patterns;
}

/**
 * Executes one or more `find` commands to locate all relevant files.
 * This function uses a two-pass approach for maximum reliability:
 * 1. Find all explicitly included paths (including hidden ones).
 * 2. Find all regular paths (non-hidden and not excluded).
 * It then merges the results.
 * @param {object} config The final configuration object.
 * @param {boolean} debug If true, logs the generated find command.
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths.
 */
async function findRelevantFiles(config, debug = false) {
    // This function runs a shell command that may contain multiple find commands.
    const commands = [];

    // --- Command 1: Find EXPLICITLY INCLUDED files ---
    // This command finds everything within the paths specified in `includePaths`.
    // It is simple and powerful, correctly grabbing hidden files if they are included.
    const includePaths = config.includePaths || [];
    if (includePaths.length > 0) {
        const paths = includePaths.map(p => `./${p.replace(/^\.\//, '')}`).join(' ');
        commands.push(`find ${paths} -type f`);
    }

    // --- Command 2: Find REGULAR files ---
    // This command finds all non-hidden files that are not explicitly excluded.
    let effectiveExcludePaths = [...(config.excludePaths || [])];
    if (config.useGitignore) {
        const gitignorePatterns = parseGitignore();
        effectiveExcludePaths = [...new Set([...effectiveExcludePaths, ...gitignorePatterns])];
    }
    
    let regularFilesCommand = "find . -type f -not -path '*/.*/*'";

    if (effectiveExcludePaths.length > 0) {
        const excludeConditions = effectiveExcludePaths.map(p => {
            const pattern = p.replace(/'/g, "'\\''");
            if (pattern.endsWith('/')) return `-path '*/${pattern}*'`;
            if (pattern.startsWith('*.')) return `-name '${pattern}'`;
            return `\\( -name '${pattern}' -o -path '*/${pattern}/*' \\)`;
        }).join(' -o ');
        regularFilesCommand += ` -a -not \\( ${excludeConditions} \\)`;
    }
    commands.push(regularFilesCommand);

    // --- Combine, Execute, and Deduplicate ---
    // We join commands with ';', pipe to sort, and then pipe to uniq to remove duplicates.
    const finalCommand = commands.join('; ');

    if (debug) {
        console.log("DEBUG: Running final shell command:");
        console.log(finalCommand);
    }

    return new Promise((resolve) => {
        // We wrap the command in a subshell `sh -c "..."` to handle multiple commands.
        // The output is piped to `sort | uniq` to merge and deduplicate results.
        exec(`${finalCommand} | sort -u`, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (debug && stderr && stderr.trim().length > 0) {
                console.warn("DEBUG: `find` command STDERR:", stderr.trim());
            }
            if (error) {
                console.error(`\n❌ Error executing find command (exit code ${error.code}).`);
                resolve([]);
                return;
            }
            const files = stdout.split('\n').filter(line => line.trim() !== '');
            resolve(files);
        });
    });
}

/**
 * Generates the final context.md file from the list of files to process.
 * @param {object} config The final configuration object.
 * @param {boolean} debug Enables debug logging.
 */
async function generateContextFile(config, debug = false) {
  console.log("\n🔍 Finding relevant files based on your configuration...");
  const initialFiles = await findRelevantFiles(config, debug);

  if (initialFiles.length === 0) {
      console.log("\n⚠️ No files found that match your criteria.");
      console.log("   Run `llmcontext --init` to create a config file and customize it.");
      return;
  }

  console.log(`   Found ${initialFiles.length} potential files. Filtering by extension...`);

  const filesToProcess = initialFiles.filter(file => {
      if (config.includeExtensions.length === 0) return true;
      const ext = path.extname(file).toLowerCase();
      return config.includeExtensions.includes(ext);
  });

  if (filesToProcess.length === 0) {
      console.log(`\n⚠️ No files remaining after filtering by 'includeExtensions'.`);
      return;
  }
  console.log(`   Processing ${filesToProcess.length} files...`);

  // This custom sort function prioritizes './README.md' to the top of the list.
  filesToProcess.sort((a, b) => {
      const aIsReadme = path.basename(a).toLowerCase() === 'readme.md';
      const bIsReadme = path.basename(b).toLowerCase() === 'readme.md';

      if (aIsReadme && !bIsReadme) return -1; // a comes first
      if (!aIsReadme && bIsReadme) return 1;  // b comes first
      return a.localeCompare(b); // alphabetical for all others
  });

  const stats = { totalFilesFound: initialFiles.length, totalFilesProcessed: filesToProcess.length, includedFileContents: 0, skippedDueToSize: 0, skippedOther: 0, totalTokens: 0, totalOriginalSizeKB: 0 };

  const projectName = path.basename(process.cwd());

  let outputContent = `# Project Context: ${projectName}\n\nGenerated: ${new Date().toISOString()} w/ llmcontext\n\n`;
  outputContent += `## Configuration Used\n\n\`\`\`json\n${JSON.stringify({ presets: config.presets, outputFile: config.outputFile, maxFileSizeKB: config.maxFileSizeKB }, null, 2)}\n\`\`\`\n\n`;
  outputContent += `## Directory Structure\n\n\`\`\`\n${generateTreeStructure(filesToProcess)}\`\`\`\n\n`;
  outputContent += `## File Contents\n\n`;

  for (const filePath of filesToProcess) {
    const currentFileSizeKB = getFileSizeInKB(filePath);
    stats.totalOriginalSizeKB += currentFileSizeKB;

    if (currentFileSizeKB > config.maxFileSizeKB) {
      stats.skippedDueToSize++;
      outputContent += `### \`${filePath}\`\n\n*File content skipped: Size ${formatFileSize(currentFileSizeKB)} exceeds ${config.maxFileSizeKB} KB limit.*\n\n`;
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const language = getLanguageFromExt(filePath);
      stats.includedFileContents++;
      stats.totalTokens += estimateTokenCount(fileContent);

      // We find the longest sequence in the content and add one.
      // We ensure a minimum of 4 for consistency and to handle the common case well.
      const longestSequence = getLongestBacktickSequence(fileContent);
      const fenceLength = Math.max(4, longestSequence + 1);
      const fence = '`'.repeat(fenceLength);

      // Construct the output with the dynamic fence.
      outputContent += `### \`${filePath}\`\n\n${fence}${language}\n${fileContent.trim() ? fileContent : '[EMPTY FILE]'}\n${fence}\n\n`;

    } catch (error) {
      stats.skippedOther++;
      outputContent += `### \`${filePath}\`\n\n*Error reading file: ${error.message}*\n\n`;
      console.warn(`Warning on ${filePath}: ${error.message}`);
    }
  }

  const structureTokens = estimateTokenCount(outputContent.replace(/```[^`]*?\n[\s\S]*?\n```/g, ''));
  stats.totalTokens += structureTokens;

  fs.writeFileSync(config.outputFile, outputContent);
  console.log(`\n💾 Writing output to ${config.outputFile}...`);
  const outputFileSizeKB = getFileSizeInKB(config.outputFile);

  console.log("\n" + "=".repeat(60));
  console.log("📊 CONTEXT FILE STATISTICS");
  console.log("=".repeat(60));
  console.log(`  • Context file created: ${config.outputFile} (${formatFileSize(outputFileSizeKB)})`);
  console.log(`  • Estimated total tokens: ~${formatNumber(stats.totalTokens)}`);
  console.log(`\n  • Files found by search: ${stats.totalFilesFound}`);
  console.log(`  • Files processed (after ext filter): ${stats.totalFilesProcessed}`);
  console.log(`  • Content included: ${stats.includedFileContents} files`);
  console.log(`  • Skipped (size > ${config.maxFileSizeKB}KB): ${stats.skippedDueToSize} files`);
  console.log(`  • Skipped (read errors): ${stats.skippedOther} files`);
  console.log("=".repeat(60));
  console.log("✨ Done!");
}

module.exports = { generateContextFile };