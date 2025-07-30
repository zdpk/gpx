# GPX Future Features Specification

## Overview

This document outlines advanced features planned for GPX beyond the MVP release. These features will be implemented incrementally through focused pull requests to ensure quality and maintainability.

---

## 1. Binary Name Conflict Resolution System

### 1.1 Problem Statement

When multiple repositories provide binaries with the same name, users face ambiguity:

```bash
# Both provide 'cli' binary
gpx microsoft/azure-cli     # Installs as 'cli'
gpx aws/aws-cli            # Also installs as 'cli'

# Ambiguous execution
gpx cli --version          # Which one runs?
```

### 1.2 Proposed Solution

#### 1.2.1 Interactive Conflict Resolution

```bash
$ gpx cli
? Multiple binaries found for 'cli':
  ❯ microsoft/azure-cli (v2.45.0, last used: 2 days ago)
    aws/aws-cli (v2.11.5, installed: 1 week ago)
    heroku/heroku-cli (v8.0.2, never used)

[↑↓ to select, Enter to confirm, Ctrl+C to cancel]
```

#### 1.2.2 Priority Configuration

**Config Structure:**
```yaml
# ~/.config/gpx/config.yml
conflicts:
  cli:
    default: "microsoft/azure-cli"
    alternatives:
      - "aws/aws-cli"
      - "heroku/heroku-cli"
  
  # User-defined aliases
aliases:
  azurecli: "microsoft/azure-cli"
  awscli: "aws/aws-cli"
```

**CLI Commands:**
```bash
gpx config set-default cli microsoft/azure-cli
gpx config alias azurecli microsoft/azure-cli
gpx config conflicts list
```

#### 1.2.3 Execution Strategies

```bash
# Uses configured default
gpx cli --version

# Explicit repository specification  
gpx aws/aws-cli --version

# User-defined alias
gpx awscli --version

# Override default temporarily
gpx cli --from aws/aws-cli --version
```

### 1.3 Implementation Details

**Binary Registry:**
```json
{
  "cli": [
    {
      "repo": "microsoft/azure-cli",
      "version": "v2.45.0",
      "installDate": "2024-01-25T14:30:00Z",
      "lastUsed": "2024-01-28T10:15:00Z",
      "usageCount": 47
    }
  ]
}
```

**Priority Resolution Logic:**
1. Check for exact alias match
2. Check for configured default
3. Fall back to interactive selection
4. Remember user choice for future

---

## 2. Binary Information Management System

### 2.1 Enhanced Metadata Tracking

**Metadata Structure:**
```json
{
  "repo": "BurntSushi/ripgrep",
  "binaryName": "rg",
  "version": "v14.1.1",
  "platform": "darwin-arm64",
  "installDate": "2024-01-25T14:30:00Z",
  "lastUsed": "2024-01-30T09:45:00Z",
  "usageCount": 156,
  "downloadSize": 8425672,
  "extractedSize": 15738624,
  "checksum": "sha256:a1b2c3d4...",
  "source": "github-release"
}
```

### 2.2 Information Commands

#### 2.2.1 Binary Information Display

```bash
$ gpx info rg
📦 Ripgrep (rg)

Repository: BurntSushi/ripgrep
├── Version: v14.1.1  
├── Platform: darwin-arm64
├── Installed: Jan 25, 2024 at 2:30 PM
├── Last used: 2 hours ago
├── Usage count: 156 times
├── Binary size: 15.7 MB
└── Download size: 8.4 MB

🔗 Source: https://github.com/BurntSushi/ripgrep/releases/tag/v14.1.1
```

#### 2.2.2 Multi-Binary Information

```bash
$ gpx info cli
📦 CLI Tools named 'cli':

microsoft/azure-cli ⭐ (default)
├── Version: v2.45.0
├── Installed: Jan 25, 2024
├── Last used: 2 days ago  
├── Size: 85.2 MB
└── Usage: 47 times

aws/aws-cli
├── Version: v2.11.5
├── Installed: Jan 18, 2024
├── Last used: 1 week ago
├── Size: 124.8 MB
└── Usage: 12 times

💡 Use 'gpx config set-default cli <repo>' to change default
```

#### 2.2.3 Global Statistics

```bash
$ gpx stats
📊 GPX Usage Statistics

Total cached tools: 23
Total cache size: 1.2 GB / 2 GB
Most used tools:
  1. rg (ripgrep) - 156 uses
  2. fd - 89 uses  
  3. bat - 67 uses

Recent activity:
  • rg: 2 hours ago
  • bat: 1 day ago
  • fd: 3 days ago

Cache efficiency: 94% (cache hits / total executions)
```

---

## 3. Preset System

### 3.1 Concept Overview

Presets allow users to define and manage groups of related tools, enabling bulk installation and management operations.

### 3.2 Preset Structure

**Config Storage:**
```yaml
# ~/.config/gpx/presets.yml
presets:
  dev-tools:
    name: "Development Tools"
    description: "Essential CLI tools for development"
    tools:
      - BurntSushi/ripgrep
      - sharkdp/fd  
      - sharkdp/bat
      - dandavison/delta
    created: "2024-01-25T14:30:00Z"
    
  work-setup:
    name: "Work Environment"
    description: "Tools for work projects"
    tools:
      - microsoft/azure-cli
      - kubernetes/kubectl
      - helm/helm
    created: "2024-01-26T09:15:00Z"
```

### 3.3 Preset Commands

#### 3.3.1 Preset Management

```bash
# Create new preset
gpx preset create dev-tools "Development Tools"

# Add tools to preset
gpx preset add dev-tools BurntSushi/ripgrep
gpx preset add dev-tools sharkdp/fd sharkdp/bat

# Remove tools from preset
gpx preset remove dev-tools sharkdp/bat

# List all presets
gpx preset list

# Show preset contents
gpx preset show dev-tools
```

#### 3.3.2 Bulk Operations

```bash
# Install all tools in preset
$ gpx preset install dev-tools
📦 Installing preset 'dev-tools' (4 tools)...

✅ ripgrep v14.1.1 (already cached)
⬇️  Downloading fd v8.7.0... ████████████ 100%
⬇️  Downloading bat v0.24.0... ████████████ 100%  
⬇️  Downloading delta v0.16.5... ████████████ 100%

✅ Preset 'dev-tools' installed successfully
   • 1 tool was already cached
   • 3 tools downloaded (total: 45.2 MB)
```

```bash
# Update all tools in preset
$ gpx preset update dev-tools
🔄 Checking for updates in 'dev-tools'...

📦 Updates available:
  • bat: v0.24.0 → v0.24.1
  • delta: v0.16.5 → v0.17.0

? Update these tools? (Y/n) y
⬇️  Updating bat... ████████████ 100%
⬇️  Updating delta... ████████████ 100%

✅ Updated 2/4 tools in preset 'dev-tools'
```

#### 3.3.3 Smart Removal

```bash
# Safe removal - only removes tools not used elsewhere
$ gpx preset remove dev-tools --safe
🗑️  Analyzing preset 'dev-tools' for safe removal...

📊 Analysis results:
  ✅ ripgrep: Safe to remove (only in this preset)
  ⚠️  fd: Also in preset 'work-setup' - keeping
  ⚠️  bat: Manually installed - keeping  
  ✅ delta: Safe to remove (only in this preset)

? Remove 2 tools that are safe to remove? (Y/n) y
🗑️  Removed ripgrep, delta (saved 28.4 MB)
📝 Preset 'dev-tools' deleted (2 tools preserved)
```

### 3.4 Preset Templates

**Built-in Templates:**
```bash
gpx preset template list
Available templates:
  • rust-dev: Rust development tools (ripgrep, fd, bat, etc.)
  • web-dev: Web development tools  
  • ops-tools: DevOps and system administration
  • minimal: Essential CLI replacements

gpx preset create my-rust --from-template rust-dev
```

---

## 4. Advanced UX Features

### 4.1 Smart Suggestions

```bash
$ gpx rg
❌ Tool 'rg' not found

💡 Did you mean?
  • BurntSushi/ripgrep (provides 'rg')
  • Available in preset 'dev-tools'

? Install ripgrep now? (Y/n)
```

### 4.2 Usage Analytics

```bash
$ gpx analytics
📈 Usage Trends (Last 30 days)

Most active tools:
  1. rg: 156 uses (↑ 23% vs last month)
  2. fd: 89 uses (↓ 5% vs last month)
  3. bat: 67 uses (↑ 12% vs last month)

Unused tools (suggest cleanup):
  • heroku-cli: Last used 3 months ago
  • old-tool: Last used 6 months ago

💡 Run 'gpx cleanup --unused' to free 180 MB
```

### 4.3 Auto-Cleanup Suggestions

```bash
$ gpx
⚠️  Cache optimization available
   • 3 unused tools (last used > 90 days)
   • 5 old versions can be cleaned up  
   • Potential savings: 340 MB

💡 Run 'gpx cache optimize' to clean up automatically
   Or 'gpx cache analyze' for detailed breakdown
```

---

## 5. Implementation Roadmap

### Phase 1: Core Infrastructure (2-3 PRs)
- [ ] Enhanced metadata tracking system
- [ ] Binary registry implementation
- [ ] Basic info command (`gpx info`)

### Phase 2: Conflict Resolution (2-3 PRs)  
- [ ] Interactive conflict resolution UI
- [ ] Priority configuration system
- [ ] Alias management commands

### Phase 3: Preset System (3-4 PRs)
- [ ] Preset data structure and storage
- [ ] Basic preset management commands
- [ ] Bulk install/update operations
- [ ] Smart removal logic

### Phase 4: Advanced UX (2-3 PRs)
- [ ] Usage analytics and statistics
- [ ] Smart suggestions system
- [ ] Auto-cleanup recommendations

### Phase 5: Polish & Templates (1-2 PRs)
- [ ] Built-in preset templates
- [ ] Advanced analytics dashboard
- [ ] Performance optimizations

---

## Technical Considerations

### Database/Storage
- Use JSON files for metadata (SQLite for future if needed)
- Atomic write operations for data consistency
- Backup/restore functionality for user data

### Performance
- Lazy loading of metadata
- Background cleanup operations
- Efficient conflict detection algorithms

### Security
- Validate preset contents before installation
- Sandbox preset operations
- Audit logging for bulk operations

### Testing Strategy
- Unit tests for each feature component
- Integration tests for preset workflows
- Performance benchmarks for large presets

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-30  
**Target Start Date:** Post-MVP Release