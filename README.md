# genctx (GenContext)

<p align="left">
  <a href="https://www.npmjs.com/package/genctx"><img src="https://img.shields.io/npm/v/genctx.svg?style=flat-square&color=007acc" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/genctx"><img src="https://img.shields.io/npm/dt/genctx.svg?style=flat-square&color=success" alt="npm downloads"></a>
  <a href="https://github.com/mgks/genctx/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mgks/genctx.svg?style=flat-square&color=blue" alt="license"></a>
  <a href="https://github.com/mgks/genctx/stargazers"><img src="https://img.shields.io/github/stars/mgks/genctx?style=flat-square&logo=github" alt="stars"></a>
</p>

**The AI Context Generator for Modern Developers.**

`genctx` consolidates your entire codebase into a single, high-signal Markdown file optimized for Large Language Models (LLMs). It intelligently formats your project structure and source code, stripping noise to ensure AI models (like ChatGPT, Claude, Gemini) get the most relevant context with the fewest tokens.

## 🌟 Why genctx?

- **Token Efficiency**: Save money and context window space. `genctx` can automatically strip comments and empty lines.
- **Project Structure**: Provides a clear directory tree so the AI understands file relationships.
- **Smart Filtering**: Respects `.gitignore` and automatically excludes build artifacts (`node_modules`, `dist`, etc.).
- **Zero Config Start**: Just run it. It works out of the box for most projects.
- **Detailed Control**: Fully configurable via `genctx.config.json` for advanced users.

## 🚀 Quick Start

Run instantly in any project folder using `npx`:

```bash
npx genctx
```

This generates **`genctx.context.md`** in your current directory. Drag and drop this file into your AI chat window.

### Installing Globally (Optional)

If you use it frequently, install it globally:

```bash
npm install -g genctx
genctx
```

## 🛠️ Usage & Examples

### Basic Run
Generate context for the current directory, respecting `.gitignore` and default excludes.
```bash
npx genctx
```

### Optimize for Tokens
Strip all comments and empty lines to fit a large codebase into a small context window.
```bash
npx genctx --remove-comments --remove-empty-lines
```

### Focus on Specific Folders
Only include the `src` and `config` directories.
```bash
npx genctx --include src config
```

### Use a Tech Stack Preset
Apply standard exclude patterns for a specific language ecosystem (e.g., ignoring `.env`, `coverage`, `__pycache__`).
```bash
npx genctx --preset nodejs
npx genctx --preset python
```

## ⚙️ Configuration

While CLI flags are great for quick runs, you can persist your settings in a configuration file.

Initialize a config file:
```bash
npx genctx --init
```

This creates **`genctx.config.json`**:

```json
{
  "includeExtensions": [
    ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".md", ".yml"
  ],
  "excludePaths": [
    "dist", "coverage", "test", "*.log"
  ],
  "removeComments": false,
  "removeEmptyLines": false,
  "outputFile": "genctx.context.md",
  "maxFileSizeKB": 500,
  "useGitignore": true
}
```

### 🔒 Privacy by Default
`genctx` automatically excludes sensitive and high-noise files to ensure your context is clean and secure.

- **Security**: `*.pem`, `*.key`, `*.cert`, `*.pfx`, `id_rsa` are **hard-excluded**.
- **Binaries**: Images, Videos, Archives, PDFs, and Executables are ignored.
- **System**: `.DS_Store`, `.git`, Logs, and Lockfiles are skipped.
- **Overrides**: You can force-include any of these by explicitly adding them to `include` (e.g., `include: ["src/logo.png"]`).

### ⚙️ Configuration (v2)

`genctx` looks for `genctx.config.json` in the current directory.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `include` | `string[]` | `["**/*"]` | Array of glob patterns to include. |
| `exclude` | `string[]` | `["node_modules", ...]` | Array of glob patterns to exclude. |
| `options.useGitignore` | `boolean` | `true` | Respect `.gitignore` rules automatically. |
| `options.maxFileSizeKB` | `number` | `2048` | Skip files larger than this size (Safeguard). |
| `options.maxTotalTokens` | `number` | `0` | **Hard Stop**. Stop processing files once context hits this limit. |
| `options.maxFileTokens` | `number` | `0` | **Skip File**. Ignore individual files exceeding this limit. |
| `options.removeComments` | `boolean` | `false` | Strip comments to save tokens. |

> **Note on Tokens**: Token counts are estimates (`chars / 3.2`). This heuristic is optimized for code density (which is higher than plain English).

### Example Config
```json
{
  "include": ["src/**/*", "package.json"],
  "exclude": ["node_modules", ".env"],
  "options": {
    "maxTotalTokens": 50000,
    "useGitignore": true
  }
}
```

### 💡 Advanced: Whitelist Strategy

The `include` option works as a strict **whitelist**. This allows you to cherry-pick specific files even if they might otherwise be ignored by a broad rule (as long as they are not explicitly in `exclude`).

**Scenario**: You want to verify a single binary file but ignore the rest of the `bin/` folder.

```json
{
  "include": [
    "src/**/*",          // Include all source code
    "bin/genctx"         // Explicitly include this ONE file
  ],
  // Note: "bin/other-junk" is automatically ignored because it's not in the include list.
  "exclude": ["node_modules"]
}
```

## 📦 Presets

Presets apply additive exclusion rules and default extensions for specific technologies.

| Preset | Adds Exclusions | Adds Extensions |
|---|---|---|
| `nodejs` | `coverage`, `.env`, `npm-debug.log` | `.mjs`, `.cjs` |
| `python` | `__pycache__`, `.venv`, `venv`, `*.pyc`, `requirements.txt` | `.py` |
| `java` | `target`, `.mvn`, `*.jar`, `*.war` | `.java`, `.xml` |
| `android` | `gradle`, `*.apk`, `*.aab` | `.kt`, `.kts`, `.gradle` |
| `go` | `*.exe`, `*.bin`, `go.sum` | `.go` |
| `rust` | `target`, `Cargo.lock` | `.rs` |
| `dotnet` | `bin`, `obj`, `*.sln` | `.cs` |
| ...and more | Includes `swift`, `ruby`, `php`, `c_cpp`, `r` | |

Use multiple presets if your project is full-stack:
```bash
npx genctx --preset nodejs --preset python
```

## 🤝 Contributing

We welcome contributions! Whether it's adding a new preset, fixing a bug, or improving documentation.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

> **{ github.com/mgks }**
> 
> ![Website Badge](https://img.shields.io/badge/Visit-mgks.dev-blue?style=flat&link=https%3A%2F%2Fmgks.dev) ![Sponsor Badge](https://img.shields.io/badge/%20%20Become%20a%20Sponsor%20%20-red?style=flat&logo=github&link=https%3A%2F%2Fgithub.com%2Fsponsors%2Fmgks)