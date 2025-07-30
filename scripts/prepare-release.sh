#!/bin/bash

# GPX Release Preparation Script
# This script prepares the project for release by running all necessary checks

set -e

echo "🚀 Preparing GPX for release..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/cli.ts" ]; then
    print_error "This script must be run from the GPX project root directory"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version check passed: $(node -v)"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf coverage/
rm -rf *.tgz

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run type checking
print_status "Running type checking..."
if npm run typecheck; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Run linting
print_status "Running linting..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "Tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Build the project
print_status "Building project..."
if npm run build; then
    print_success "Build completed"
else
    print_error "Build failed"
    exit 1
fi

# Test the CLI
print_status "Testing CLI functionality..."
if node dist/cli.js --version > /dev/null 2>&1; then
    print_success "CLI version check passed"
else
    print_error "CLI version check failed"
    exit 1
fi

if node dist/cli.js --help > /dev/null 2>&1; then
    print_success "CLI help check passed"
else
    print_error "CLI help check failed"
    exit 1
fi

# Check package.json for required fields
print_status "Validating package.json..."
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")
PACKAGE_DESCRIPTION=$(node -p "require('./package.json').description")

if [ "$PACKAGE_NAME" = "undefined" ] || [ -z "$PACKAGE_NAME" ]; then
    print_error "Package name is missing or invalid"
    exit 1
fi

if [ "$PACKAGE_VERSION" = "undefined" ] || [ -z "$PACKAGE_VERSION" ]; then
    print_error "Package version is missing or invalid"
    exit 1
fi

if [ "$PACKAGE_DESCRIPTION" = "undefined" ] || [ -z "$PACKAGE_DESCRIPTION" ]; then
    print_error "Package description is missing or invalid"
    exit 1
fi

print_success "Package validation passed: $PACKAGE_NAME@$PACKAGE_VERSION"

# Run a dry-run of npm pack
print_status "Running npm pack dry-run..."
if npm pack --dry-run > /dev/null 2>&1; then
    print_success "npm pack dry-run passed"
else
    print_error "npm pack dry-run failed"
    exit 1
fi

# Security audit
print_status "Running security audit..."
if npm audit --audit-level=moderate; then
    print_success "Security audit passed"
else
    print_warning "Security audit found issues - please review"
fi

# Check if git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Git working directory is not clean. Uncommitted changes:"
    git status --short
    print_warning "Consider committing or stashing changes before release"
else
    print_success "Git working directory is clean"
fi

# Final summary
echo ""
echo "🎉 Release preparation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review the build output in dist/"
echo "2. Check that all tests pass: npm test"
echo "3. Commit any final changes"
echo "4. Create a release on GitHub or run: npm run semantic-release"
echo ""
echo "Package info:"
echo "  Name: $PACKAGE_NAME"
echo "  Version: $PACKAGE_VERSION"
echo "  Description: $PACKAGE_DESCRIPTION"
echo ""
print_success "Ready for release! 🚀"