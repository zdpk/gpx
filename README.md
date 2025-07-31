# GPX - GitHub Package eXecutor

Run GitHub release binaries directly, just like npx but for GitHub releases.

## Features

- 🚀 **Direct execution** of GitHub release binaries
- 📦 **Smart caching** with automatic cleanup
- 🔍 **Platform detection** and binary matching
- ⚡ **Fast execution** with local caching
- 🛠️ **Cross-platform** support (macOS, Linux, Windows)

## Quick Start

```bash
# Install GPX globally
npm install -g gpx

# Run any GitHub release binary directly
gpx BurntSushi/ripgrep --version
gpx sharkdp/bat --help
gpx sharkdp/fd --type f
```

## How it Works

1. **Parse** the `owner/repo` format
2. **Fetch** latest release from GitHub API
3. **Match** binary for your platform (OS + architecture)  
4. **Download** and extract if not cached
5. **Execute** with your arguments

## Installation

### Via npm (Recommended)
```bash
npm install -g gpx
```

### Via npx (No installation required)
```bash
# Run directly without installing
npx gpx BurntSushi/ripgrep --version
```

## Usage

### Basic Usage
```bash
# Run latest version
gpx owner/repo [args...]

# Examples
gpx BurntSushi/ripgrep --search-zip
gpx sharkdp/bat README.md
gpx dandavison/delta file1.txt file2.txt
```

### CLI Options
```bash
gpx owner/repo [args...]           # Run binary with args
gpx --no-cache owner/repo          # Skip cache, always download
gpx --update owner/repo            # Force update check
gpx --verbose owner/repo           # Show detailed output
```

### Configuration
```bash
gpx config list                    # Show current config
gpx config path                    # Show config file location
```

### Cache Management
```bash
gpx cache dir                      # Show cache directory
gpx cache clean                    # Clean entire cache
gpx cache clean --dry-run         # Preview cleanup
```

## Configuration

GPX stores configuration in `~/.config/gpx/config.yml`:

```yaml
cache:
  maxVersionsPerRepo: 3            # Keep 3 versions per tool
  maxTotalSize: 2GB               # Total cache size limit
  lruInterval: 7d                 # Cleanup interval
  updateCheckInterval: 24h        # Check for updates
  autoCleanup: true               # Automatic cleanup
  autoExpandCache: true           # Ask to expand when full

network:
  timeout: 30000                  # 30 second timeout
  retries: 3                      # Retry failed downloads
  userAgent: gpx/0.1.0           # User agent string

behavior:
  alwaysUseLatest: false         # Prefer cached versions
  confirmUpdates: true           # Ask before updating
  verbose: false                 # Default verbosity
  showProgressBar: true          # Show download progress
  colorOutput: true              # Colored terminal output

advanced:
  checksumValidation: true       # Verify download integrity
  compressionLevel: 6            # Archive compression
  parallelExtraction: true       # Fast extraction
  keepDownloadLogs: false        # Keep download logs
  enableTelemetry: false         # Usage analytics
```

## Supported Platforms

GPX automatically detects your platform and downloads the appropriate binary:

- **macOS**: Intel (x86_64) and Apple Silicon (arm64)
- **Linux**: x86_64, ARM64, and other architectures
- **Windows**: x86_64 (64-bit)

## Binary Matching

GPX uses intelligent pattern matching to find the right binary:

1. **OS Detection**: `darwin` → `apple-darwin`, `linux` → `linux-gnu`, etc.
2. **Architecture**: `x64` → `x86_64`, `arm64` → `aarch64`, etc.
3. **Format Preference**: `.tar.gz` for Unix, `.zip` for Windows
4. **Scoring System**: Rates each asset and picks the best match

## Cache Structure

```
~/.cache/gpx/
├── BurntSushi/
│   └── ripgrep/
│       ├── v14.1.1/
│       │   └── darwin-arm64/
│       │       ├── rg                # The binary
│       │       ├── metadata.json     # Install info
│       │       └── cache-entry.json  # Usage stats
│       └── latest -> v14.1.1         # Symlink to latest
└── sharkdp/
    └── bat/
        └── v0.24.0/
            └── linux-x64/
                ├── bat
                ├── metadata.json
                └── cache-entry.json
```

## Examples

### Development Tools
```bash
# Modern replacements for common CLI tools
gpx BurntSushi/ripgrep pattern file.txt     # Better grep
gpx sharkdp/fd "*.js"                       # Better find  
gpx sharkdp/bat file.txt                    # Better cat
gpx dandavison/delta file1 file2            # Better diff
```

### Quick Start Examples
```bash
# Install GPX
npm install -g gpx

# Try some popular tools immediately
gpx BurntSushi/ripgrep --version
gpx sharkdp/bat --help
gpx sharkdp/fd --type f --name "*.ts"
```

### System Administration
```bash
# Network tools
gpx imsnif/bandwhich                        # Network monitor
gpx ClementTsang/bottom                     # Better top

# File management  
gpx bootandy/dust                           # Better du
gpx pemistahl/grex "example@email.com"      # Regex generator
```

### Build & Deploy
```bash
# CI/CD tools in actions
gpx cli/cli repo view                       # GitHub CLI
gpx docker/compose up                       # Docker Compose
gpx kubernetes/kubectl get pods            # Kubernetes CLI
```

## Troubleshooting

### Binary Not Found
```bash
❌ No compatible binary found for darwin-arm64
💡 Available platforms: linux-x64, windows-x64

# Solution: Check if your platform is supported
gpx --list-platforms owner/repo
```

### Permission Denied
```bash
❌ Permission denied executing binary

# Solution: GPX automatically sets execute permissions
# If this fails, manually fix permissions:
chmod +x ~/.cache/gpx/owner/repo/version/platform/binary
```

### Network Issues
```bash
❌ GitHub API rate limit exceeded

# Solution: Wait for rate limit reset or authenticate
export GITHUB_TOKEN=your_token_here
gpx owner/repo
```

### Cache Issues
```bash
# Clear specific tool cache
rm -rf ~/.cache/gpx/owner/repo

# Clear entire cache
gpx cache clean

# Check cache size
du -sh ~/.cache/gpx
```

## Development

### Building from Source
```bash
git clone https://github.com/your-name/gpx.git
cd gpx
npm install
npm run build
npm link
```

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch     # Watch mode
npm run lint           # Lint code
npm run typecheck      # Type checking
```

### Project Structure
```
src/
├── cli.ts          # CLI interface
├── runner.ts       # Main execution logic
├── github.ts       # GitHub API client
├── platform.ts     # Platform detection
├── downloader.ts   # Download & extract
├── cache.ts        # Cache management
├── executor.ts     # Binary execution
├── config.ts       # Configuration
└── types.ts        # TypeScript types
```

## Comparison with npx

| Feature | npx | gpx |
|---------|-----|-----|
| Source | npm registry | GitHub releases |
| Cache management | Poor (infinite) | Smart (configurable) |
| Platform support | Node.js only | Native binaries |
| Binary types | JS packages | Any executable |
| Update strategy | Manual | Automatic checks |
| Size optimization | No cleanup | LRU + size limits |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Commit changes: `git commit -am 'Add feature'`
6. Push to branch: `git push origin my-feature`
7. Submit a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 **Documentation**: See README.md and DEPLOYMENT.md
- 🐛 **Issues**: [GitHub Issues](https://github.com/zdpk/gpx/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/zdpk/gpx/discussions)
- 🔧 **Help**: `gpx --help`