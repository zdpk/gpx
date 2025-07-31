#!/bin/bash

# Docker Test Script for GPX
set -e

echo "🐳 GPX Docker Test Environment"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Build the Docker image
print_status "Building GPX Docker image..."
docker-compose build gpx

# Start interactive container for testing
print_status "Starting interactive GPX container..."
print_warning "You can now test GPX commands inside the container:"
echo ""
echo "Available commands to test:"
echo "  node dist/cli.js --help        # Show help"
echo "  node dist/cli.js --version     # Show version"
echo "  node dist/cli.js user/repo     # Test download (if network available)"
echo "  npm test                       # Run tests"
echo "  npm run lint                   # Run linter"
echo ""
echo "Type 'exit' to leave the container"
echo ""

# Run interactive container
docker-compose run --rm gpx