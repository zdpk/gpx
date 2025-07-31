# GPX (GitHub Package eXecutor) - Product Requirements Document

## 1. Product Overview

### 1.1 Problem Statement

**Current Pain Points with npx:**
- Limited to npm registry packages only
- Inefficient cache management (infinite accumulation, no cleanup)
- No direct support for GitHub release binaries
- Manual installation required for non-JavaScript tools

**Market Gap:**
- Developers frequently use CLI tools distributed via GitHub releases (ripgrep, bat, fd, etc.)
- No unified way to execute GitHub release binaries directly
- Complex manual download → extract → install → update cycle

### 1.2 Solution Vision

GPX is a command-line tool that enables seamless execution of GitHub release binaries, similar to how npx works for npm packages. It provides intelligent caching, automatic updates, and cross-platform binary management.

**Value Proposition:**
```bash
# Instead of:
curl -L https://github.com/BurntSushi/ripgrep/releases/download/14.1.1/ripgrep-14.1.1-x86_64-apple-darwin.tar.gz | tar xz
./rg --version

# Simply use:
gpx BurntSushi/ripgrep --version
```

### 1.3 Target Users

**Primary Users:**
- Software developers using multiple CLI tools
- DevOps engineers managing toolchains
- System administrators requiring portable tools

**Secondary Users:**
- CI/CD pipelines needing consistent tool versions
- Docker image builders optimizing layer caching

## 2. Core Functionality

### 2.1 Primary Features

#### 2.1.1 Binary Execution
```bash
gpx owner/repo [args...]
```

**Execution Flow:**
1. Check local cache for binary
2. If not cached, fetch latest release from GitHub API
3. Download and extract platform-specific binary
4. Cache binary with version/platform metadata
5. Execute binary with provided arguments

#### 2.1.2 Intelligent Caching System

**Cache Structure:**
```
~/.cache/gpx/
├── BurntSushi/
│   └── ripgrep/
│       ├── v14.1.1/
│       │   └── darwin-arm64/
│       │       ├── rg
│       │       └── metadata.json
│       └── latest -> v14.1.1
└── sharkdp/
    └── bat/
        └── v0.24.0/
            └── linux-x64/
                ├── bat
                └── metadata.json
```

**Cache Management:**
- Version-based organization
- LRU cleanup based on configurable intervals
- Automatic size management with user-prompted expansion
- Platform-specific binary separation

#### 2.1.3 Configuration Management

**Config File Location:** `~/.config/gpx/config.yml`

**Default Configuration:**
```yaml
cache:
  maxVersionsPerRepo: 3
  maxTotalSize: 2GB
  lruInterval: 7d
  updateCheckInterval: 24h
  autoCleanup: true
  autoExpandCache: true
  expansionFactor: 2
  maxAutoExpansions: 3

network:
  timeout: 30000
  retries: 3
  userAgent: gpx/1.0.0
  maxConcurrentDownloads: 2

behavior:
  alwaysUseLatest: false
  confirmUpdates: true
  verbose: false
  showProgressBar: true
  colorOutput: true

advanced:
  checksumValidation: true
  compressionLevel: 6
  parallelExtraction: true
  keepDownloadLogs: false
  enableTelemetry: false
```

### 2.2 Secondary Features

#### 2.2.1 Cache Management Commands
```bash
gpx config list                    # Show current configuration
gpx config set cache.maxTotalSize 4GB  # Update configuration
gpx cache status                   # Show cache statistics
gpx cache clean                    # Manual cache cleanup
gpx cache clean --dry-run         # Simulate cleanup
```

#### 2.2.2 Version Management
```bash
gpx owner/repo@version            # Use specific version
gpx --update owner/repo           # Force update check
gpx --list-versions owner/repo    # Show available versions
```

## 3. Technical Requirements

### 3.1 Platform Support

**Supported Operating Systems:**
- macOS (Intel/Apple Silicon)
- Linux (x86_64/ARM64)
- Windows (x86_64)

**Binary Format Support:**
- tar.gz archives
- zip archives
- Direct binary downloads

### 3.2 Performance Requirements

**Execution Performance:**
- First run (download + cache): < 30 seconds for 100MB binary
- Cached execution: < 500ms overhead
- Cache lookup: < 100ms

**Resource Usage:**
- Memory footprint: < 50MB during execution
- Disk usage: Configurable (default 2GB cache limit)
- Network: Respectful of GitHub API rate limits (5000/hour)

### 3.3 Reliability Requirements

**Error Handling:**
- Graceful network failure recovery
- Corrupted download detection and retry
- Missing binary fallback strategies

**Data Integrity:**
- SHA256 checksum validation
- Atomic cache operations
- Concurrent access safety

### 3.4 Security Requirements

**Download Security:**
- HTTPS-only downloads
- Checksum verification against GitHub releases
- No execution of unverified binaries

**File System Security:**
- Proper permission handling (chmod +x)
- Secure temporary file management
- No privilege escalation

## 4. User Experience Design

### 4.1 CLI Interface Design

#### 4.1.1 Primary Command Structure
```bash
gpx <owner/repo> [tool-args...]
gpx [options] <owner/repo> [tool-args...]
```

#### 4.1.2 Global Options
```bash
--version, -v          Show GPX version
--help, -h             Show help information
--verbose              Enable verbose output
--quiet                Suppress non-essential output
--config PATH          Use alternative config file
--no-cache             Skip cache, always download
--update               Force update check
```

#### 4.1.3 Subcommands
```bash
gpx config <action>    Configuration management
gpx cache <action>     Cache management
gpx list              List cached tools
gpx update [repo]     Update specific or all tools
```

### 4.2 User Feedback and Progress

#### 4.2.1 Download Progress
```
📦 Downloading ripgrep v14.1.1 for darwin-arm64
████████████████████████████████████████ 100% | 8.2MB/8.2MB | 2.1MB/s
✅ Cached at ~/.cache/gpx/BurntSushi/ripgrep/v14.1.1/darwin-arm64/rg
```

#### 4.2.2 Cache Management Notifications
```
⚠️  Cache size limit reached!
   Current: 1.8GB
   Limit: 2GB
   Required: 150MB

💡 Would you like to increase cache limit to 4GB?
🚀 Yes, double the cache size
🧹 Clean old versions and continue  
❌ Cancel download

✅ Cache limit increased to 4GB
```

#### 4.2.3 Error Messages
```
❌ Binary not found for linux-arm64
💡 Available platforms: linux-x64, darwin-arm64, darwin-x64, windows-x64
💡 Try: gpx --list-platforms owner/repo

❌ Network timeout after 30s
🔄 Retrying... (2/3)
💡 Check your internet connection or try: gpx --timeout 60 owner/repo
```

### 4.3 Installation and Setup

#### 4.3.1 Installation Methods
```bash
# Via npm (recommended)
npm install -g gpx

# Via npx (no installation required)
npx gpx owner/repo [args...]

# Via package managers (future)
# brew install gpx                # macOS (planned)
# winget install gpx             # Windows (planned)
```

#### 4.3.2 First-Run Experience
```bash
$ gpx
👋 Welcome to GPX v1.0.0!

GPX allows you to run GitHub release binaries directly:
  gpx owner/repo [args...]

Configuration will be created at ~/.config/gpx/config.yml
Cache directory: ~/.cache/gpx (2GB limit)

Get started:
  gpx BurntSushi/ripgrep --help
  gpx sharkdp/bat --version

Need help? Run: gpx --help
```

## 5. Implementation Strategy

### 5.1 Technology Stack

**Core Technology:**
- Node.js 18+ (for npm ecosystem compatibility)
- TypeScript (type safety and developer experience)

**Key Dependencies:**
- `axios` - HTTP client for GitHub API
- `tar` - Archive extraction
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `yaml` - Configuration parsing
- `chalk` - Terminal colors

### 5.2 Development Phases

#### 5.2.1 MVP (Phase 1) - 4 weeks
**Core Features:**
- Basic binary execution (`gpx owner/repo`)
- Simple file-based caching
- Cross-platform binary detection
- GitHub API integration

**Success Criteria:**
- Successfully execute 10 popular tools (ripgrep, bat, fd, etc.)
- Basic caching functionality working
- npm package published

#### 5.2.2 Enhanced Features (Phase 2) - 3 weeks
**Advanced Features:**
- Configuration system implementation
- Intelligent cache management
- Progress indicators and better UX
- Comprehensive error handling

**Success Criteria:**
- Config-driven cache management
- Automated cleanup functionality
- Professional CLI experience

#### 5.2.3 Production Ready (Phase 3) - 2 weeks
**Polish & Optimization:**
- Performance optimization
- Security hardening
- Comprehensive testing
- Documentation completion

**Success Criteria:**
- < 500ms cached execution overhead
- Security audit passed
- 90%+ test coverage

### 5.3 Quality Assurance

#### 5.3.1 Testing Strategy
- Unit tests for core logic
- Integration tests with real GitHub repos
- Cross-platform testing (macOS, Linux, Windows)
- Performance benchmarking

#### 5.3.2 Security Review
- Dependency vulnerability scanning
- Download verification testing
- File system permission auditing
- HTTPS/TLS configuration validation

## 6. Success Metrics

### 6.1 Adoption Metrics
- npm downloads per week
- GitHub stars and forks
- Community contributions

### 6.2 Performance Metrics
- Average execution time (cached vs uncached)
- Cache hit ratio
- Network usage efficiency
- Error rates by operation type

### 6.3 User Satisfaction
- GitHub issue resolution time
- Feature request implementation rate
- Community feedback sentiment

## 7. Risks and Mitigation

### 7.1 Technical Risks

**Risk:** GitHub API rate limiting
**Mitigation:** Implement intelligent caching, respect rate limits, provide fallback mechanisms

**Risk:** Binary compatibility issues
**Mitigation:** Comprehensive platform detection, clear error messages, community feedback loop

**Risk:** Security vulnerabilities in downloaded binaries
**Mitigation:** Checksum verification, HTTPS-only downloads, user warnings for unverified sources

### 7.2 Business Risks

**Risk:** Low adoption due to npm ecosystem saturation
**Mitigation:** Focus on unique value proposition (GitHub releases), target specific use cases

**Risk:** Maintenance burden from supporting many platforms
**Mitigation:** Automated testing, community contributions, clear platform support matrix

## 8. Future Roadmap

### 8.1 Near-term Features (3-6 months)
- Plugin system for custom binary sources
- Integration with other package managers (brew, winget)
- Workspace-level configuration support
- Batch operations for multiple tools

### 8.2 Long-term Vision (6-12 months)
- GUI companion application
- Cloud-based cache sharing
- Enterprise features (private repositories, audit logging)
- Integration with container ecosystems

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-30  
**Next Review:** 2025-02-15