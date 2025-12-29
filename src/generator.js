const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const { INTERNAL_EXCLUDES } = require('./config');
const { clean } = require('clean-context');

// --- Helper Functions ---

/**
 * Safely gets file size. Returns 0 if file is missing/error.
 */
function getFileSizeInKB(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.isFile() ? stats.size / 1024 : 0;
    } catch (error) {
        return 0;
    }
}

/**
 * Estimates tokens.
 * Heuristic: Code is denser than prose. ~3.2 chars per token is a safe average.
 */
function estimateTokenCount(text) {
    return Math.ceil(text.length / 3.2);
}

/**
 * Returns a language identifier for Markdown syntax highlighting (Output only).
 * Note: clean-context handles language detection for stripping separately.
 */
function getLanguageFromExt(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath).toLowerCase();

    if (filename === 'dockerfile') return 'dockerfile';
    if (filename === 'gradlew') return 'bash';
    if (filename === 'makefile') return 'makefile';
    if (filename.startsWith('readme')) return 'markdown';
    if (filename === 'genctx') return 'javascript';

    // Map extensions to markdown fence languages
    const langMap = {
        '.js': 'javascript', '.jsx': 'jsx', '.mjs': 'javascript', '.cjs': 'javascript',
        '.ts': 'typescript', '.tsx': 'tsx',
        '.py': 'python', '.rb': 'ruby',
        '.java': 'java', '.kt': 'kotlin',
        '.cs': 'csharp', '.go': 'go', '.rs': 'rust', '.php': 'php',
        '.html': 'html', '.css': 'css', '.scss': 'scss',
        '.json': 'json', '.md': 'markdown', '.yml': 'yaml', '.yaml': 'yaml',
        '.sh': 'bash', '.zsh': 'bash',
        '.xml': 'xml', '.sql': 'sql', '.vue': 'vue', '.svelte': 'svelte'
    };
    return langMap[ext] || 'plaintext';
}

/**
 * Checks if a file is binary by reading the first 512 bytes.
 * If it contains a null byte, we treat it as binary.
 */
function isBinaryFile(filePath) {
    try {
        const buffer = Buffer.alloc(512);
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
        fs.closeSync(fd);
        
        // If file is empty, it's "text" (safe to read)
        if (bytesRead === 0) return false;

        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) return true; // Null byte found -> Binary
        }
        return false;
    } catch (e) {
        return false; // On error, assume text to let main loop handle read error
    }
}

/**
 * Visualizes the file structure.
 */
function generateTreeStructure(filePaths) {
    if (!filePaths || filePaths.length === 0) return "[No files to display]";

    const tree = {};
    const rootDir = process.cwd();

    filePaths.forEach(filePath => {
        const relativePath = path.relative(rootDir, filePath);
        const parts = relativePath.split(path.sep);

        let current = tree;
        parts.forEach((part, i) => {
            const isFile = i === parts.length - 1;
            if (isFile) {
                current.files = current.files || [];
                current.files.push(part);
            } else {
                current[part] = current[part] || {};
                current = current[part];
            }
        });
    });

    const buildTree = (node, prefix = '') => {
        let result = '';
        const dirs = Object.keys(node).filter(k => k !== 'files').sort();
        const files = (node.files || []).sort();

        dirs.forEach((dir, i) => {
            const isLast = i === dirs.length - 1 && files.length === 0;
            result += `${prefix}${isLast ? '└── ' : '├── '}📁 ${dir}/\n`;
            result += buildTree(node[dir], `${prefix}${isLast ? '    ' : '│   '}`);
        });

        files.forEach((file, i) => {
            const isLast = i === files.length - 1;
            result += `${prefix}${isLast ? '└── ' : '├── '}📄 ${file}\n`;
        });
        return result;
    };
    return buildTree(tree);
}

function formatFileSize(sizeInKB) {
    if (sizeInKB < 0.01 && sizeInKB > 0) return "< 0.01 KB";
    return sizeInKB < 1024 ? `${sizeInKB.toFixed(2)} KB` : `${(sizeInKB / 1024).toFixed(2)} MB`;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getLongestBacktickSequence(content) {
    const matches = content.match(/`+/g) || [];
    if (matches.length === 0) return 0;
    return Math.max(...matches.map(match => match.length));
}

function parseGitignore() {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) return [];

    const patterns = fs.readFileSync(gitignorePath, 'utf8')
        .split('\n').map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(pattern => pattern.startsWith('/') ? pattern.substring(1) : pattern);

    return patterns;
}

// --- Core Logic ---

async function findRelevantFiles(config) {
    const includePatterns = config.include || ['**/*'];
    const excludePatterns = config.exclude || [];
    const MANDATORY_EXCLUDES = ['node_modules', '.git', '.DS_Store'];

    let ignorePatterns = [...new Set([...excludePatterns, ...MANDATORY_EXCLUDES])];

    if (config.useGitignore !== false) {
        const gitignorePatterns = parseGitignore();
        ignorePatterns.push(...gitignorePatterns);
    }

    const userIncludes = config.include || [];
    const activeInternalExcludes = INTERNAL_EXCLUDES.filter(ignored => {
        return !userIncludes.some(inc => {
            if (ignored.startsWith('*.')) return inc.endsWith(ignored.slice(1));
            return inc.endsWith(ignored);
        });
    });

    ignorePatterns = [...ignorePatterns, ...activeInternalExcludes];

    try {
        const files = await fg(includePatterns, {
            ignore: ignorePatterns,
            cwd: process.cwd(),
            onlyFiles: true,
            absolute: true,
            dot: true
        });
        return files.sort();
    } catch (error) {
        console.error("Error finding files:", error);
        return [];
    }
}

async function generateContextFile(config) {
    console.log("\n🔍 Finding relevant files...");
    const allFiles = await findRelevantFiles(config);

    if (allFiles.length === 0) {
        console.log("\n⚠️ No files found. Check your configuration.");
        return;
    }

    // Sort files
    allFiles.sort((a, b) => {
        const aName = path.basename(a).toLowerCase();
        const bName = path.basename(b).toLowerCase();
        if (aName === 'readme.md' && bName !== 'readme.md') return -1;
        if (aName !== 'readme.md' && bName === 'readme.md') return 1;
        return a.localeCompare(b);
    });

    console.log(`   Processing ${allFiles.length} files...`);

    const stats = {
        totalFilesFound: allFiles.length,
        includedFileContents: 0,
        skippedDueToSize: 0,
        skippedOther: 0,
        totalTokens: 0
    };

    // 1. BUFFER STAGE
    // We process files first to see which ones actually make the cut
    const processedContent = []; 
    const treeFull = config.options?.treeFull || false;

    for (const filePath of allFiles) {
        // Stop if token limit reached (Hard Stop)
        if (config.options?.maxTotalTokens > 0 && stats.totalTokens >= config.options.maxTotalTokens) {
            console.warn(`⚠️  Context Limit Reached (${formatNumber(stats.totalTokens)} tokens). Stopping.`);
            // If treeFull is FALSE, we stop adding to the tree here too.
            // If treeFull is TRUE, we might continue just to list them? 
            // Usually "Hard Stop" implies we stop work. Let's break loop.
            break;
        }

        const relativeName = path.relative(process.cwd(), filePath);
        
        // Check Binary
        if (isBinaryFile(filePath)) {
            console.log(`   ⚠️  Skipped Binary: ${relativeName}`);
            stats.skippedOther++;
            continue; // Not added to processedContent
        }

        // Check Size
        const currentFileSizeKB = getFileSizeInKB(filePath);
        const maxKB = config.options?.maxFileSizeKB || 2048;
        if (currentFileSizeKB > maxKB) {
            console.log(`   ⚠️  Skipped Large File: ${relativeName} (${formatFileSize(currentFileSizeKB)})`);
            stats.skippedDueToSize++;
            continue; // Not added to processedContent
        }

        try {
            let fileContent = fs.readFileSync(filePath, 'utf8');
            const language = getLanguageFromExt(filePath);

            if (config.options?.removeComments) {
                fileContent = clean(fileContent, { lang: path.extname(filePath) });
            }

            if (config.options?.removeEmptyLines) {
                fileContent = fileContent.replace(/^\s*[\r\n]/gm, "");
            }

            const fileTokens = estimateTokenCount(fileContent);

            // Check File Token Limit
            if (config.options?.maxFileTokens > 0 && fileTokens > config.options.maxFileTokens) {
                console.log(`   ⚠️  Skipped Token Limit: ${relativeName} (~${formatNumber(fileTokens)} tokens)`);
                stats.skippedDueToSize++;
                continue; // Not added
            }

            // Success! Add to buffer
            stats.includedFileContents++;
            stats.totalTokens += fileTokens;
            
            const longestSequence = getLongestBacktickSequence(fileContent);
            const fenceLength = Math.max(3, longestSequence + 1);
            const fence = '`'.repeat(fenceLength);

            processedContent.push({
                path: filePath,
                content: `### \`${relativeName}\`\n\n${fence}${language}\n${fileContent.trim() ? fileContent : '[EMPTY FILE]'}\n${fence}\n\n`
            });

        } catch (error) {
            stats.skippedOther++;
            console.warn(`   ❌ Read Error (${relativeName}): ${error.message}`);
        }
    }

    // 2. TREE GENERATION STAGE
    // Decide which files go into the tree based on the flag
    let filesForTree = [];
    if (treeFull) {
        // Show ALL files found (even binaries/skipped ones)
        filesForTree = allFiles;
    } else {
        // Show ONLY files that made it into the context
        filesForTree = processedContent.map(item => item.path);
    }

    // 3. OUTPUT GENERATION STAGE
    const projectName = path.basename(process.cwd());
    let outputContent = `# Project Context: ${projectName}\n\nGenerated: ${new Date().toISOString()} via genctx\n\n`;

    outputContent += `## Configuration\n\`\`\`json\n${JSON.stringify({
        include: config.include,
        exclude: config.exclude,
        options: config.options
    }, null, 2)}\n\`\`\`\n\n`;

    outputContent += `## Directory Structure\n\n\`\`\`\n${generateTreeStructure(filesForTree)}\`\`\`\n\n`;
    
    outputContent += `## File Contents\n\n`;
    outputContent += processedContent.map(p => p.content).join('');

    // Final Stats
    if (stats.totalTokens >= config.options?.maxTotalTokens && config.options?.maxTotalTokens > 0) {
        outputContent += `\n> **Context Limit Reached**: Further files were omitted to stay within ${formatNumber(config.options.maxTotalTokens)} tokens.\n`;
    }

    stats.totalTokens += estimateTokenCount(outputContent.replace(/```[^`]*?\n[\s\S]*?\n```/g, ''));

    fs.writeFileSync(config.outputFile, outputContent);
    const outputFileSizeKB = getFileSizeInKB(config.outputFile);

    console.log("\n" + "=".repeat(60));
    console.log("📊 GENERATION STATISTICS");
    console.log("=".repeat(60));
    console.log(`  • Output File:    ${config.outputFile} (${formatFileSize(outputFileSizeKB)})`);
    console.log(`  • Token Estimate: ~${formatNumber(stats.totalTokens)}`);
    console.log(`  • Files Included: ${stats.includedFileContents} / ${allFiles.length}`);
    console.log(`  • Tree Mode:      ${treeFull ? 'Full (All Files)' : 'Context Only (Clean)'}`);
    if (config.options?.removeComments) console.log(`  • Optimization:   Comments Stripped ✂️`);
    if (config.options?.removeEmptyLines) console.log(`  • Optimization:   Empty Lines Removed ✂️`);
    console.log("=".repeat(60));
    console.log("✨ Done!");
}

module.exports = { generateContextFile };