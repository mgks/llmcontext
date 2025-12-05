# genctx (GenContext)

<p align="left">
  <a href="https://www.npmjs.com/package/genctx"><img src="https://img.shields.io/npm/v/genctx.svg?style=flat-square&color=007acc" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/genctx"><img src="https://img.shields.io/npm/dt/genctx.svg?style=flat-square&color=success" alt="npm downloads"></a>
  <a href="https://github.com/mgks/genctx/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mgks/genctx.svg?style=flat-square&color=blue" alt="license"></a>
  <a href="https://github.com/mgks/genctx/stargazers"><img src="https://img.shields.io/github/stars/mgks/genctx?style=flat-square&logo=github" alt="stars"></a>
</p>

GenContext is a CLI tool for generating high-signal project context for AI assistants and automated systems.
It produces a structured Markdown summary optimised for relevance, reproducibility, and minimal token usage.

## Features

- Generates clean, model-ready project context.
- Uses a `genctx.json` configuration file for reproducible output.
- Supports additive technology presets such as `nodejs`, `python`, `rust`, and others.
- Respects `.gitignore` for automatic exclusion of noise.
- Allows fine-grained control over included and excluded paths or extensions.
- Supports forced inclusion of hidden or special directories (e.g., `.github/`).
- Provides deterministic output suitable for pipelines or automation agents.

## Quick Start

Run the following command in your project root:

```bash
npx genctx -p nodejs
````

Global installation (optional):

```bash
npm install -g genctx
```

## Usage Examples

```bash
# Node.js preset with default output
genctx -p nodejs

# Android preset, custom output file
genctx -p android -o MyAndroidApp.md

# Custom exclusions and additional language extension
genctx --exclude docs/ --ext swift
```

## CLI Options

| Flag               | Alias | Description                                                |
| ------------------ | ----- | ---------------------------------------------------------- |
| `--preset`         | `-p`  | Apply one or more presets (`nodejs`, `python`, etc.).      |
| `--include`        | `-i`  | Force-include a file or directory, including hidden paths. |
| `--add-exclude`    | `-a`  | Add a directory or pattern to the exclusion list.          |
| `--remove-exclude` | `-r`  | Remove a directory or pattern from the exclusion list.     |
| `--use-gitignore`  |       | Enable or disable `.gitignore` handling.                   |
| `--reset`          |       | Reset the configuration to defaults before applying flags. |
| `--init`           |       | Update the configuration file without generating output.   |
| `--output`         | `-o`  | Specify the output file name (e.g., `project-context.md`). |
| `--help`           | `-h`  | Show the help menu.                                        |

## Output Format

The tool generates a single Markdown file containing:

* Project directory structure
* Relevant source files
* Key configuration and metadata files
* Compressed summaries optimised for LLMs
* Deterministic, pipeline-ready formatting

## Support

If this project is useful, consider starring the repository or sponsoring ongoing development:

* GitHub Sponsors: [https://github.com/sponsors/mgks](https://github.com/sponsors/mgks)
* Repository: [https://github.com/mgks/genctx](https://github.com/mgks/genctx)