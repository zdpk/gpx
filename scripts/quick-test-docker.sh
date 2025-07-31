#!/bin/bash

# Quick GPX test with zoxide in Docker
set -e

echo "⚡ Quick GPX + zoxide Test"
echo "========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running!"
    exit 1
fi

print_status "Building image..."
docker-compose build gpx --quiet

print_status "Running quick zoxide test..."

# Quick test script
cat > /tmp/quick-test.sh << 'EOF'
#!/bin/bash
echo "🔧 Quick GPX test starting..."

# Show system info
echo "📋 System info..."
uname -m
cat /etc/os-release | grep PRETTY_NAME || echo "OS info not available"

# Test GPX basic functionality
echo "📋 Testing GPX commands..."
node dist/cli.js --version
node dist/cli.js --help | head -5

# Download and test zoxide
echo "📥 Downloading zoxide..."
if timeout 180 node dist/cli.js ajeetdsouza/zoxide --verbose; then
    echo "✅ Download successful!"
    
    # Find and test zoxide binary
    ZOXIDE_PATH=$(find $HOME/.cache/gpx/ajeetdsouza/zoxide/latest/ -name "zoxide" -type f 2>/dev/null | head -1)
    
    if [ -n "$ZOXIDE_PATH" ] && [ -x "$ZOXIDE_PATH" ]; then
        echo "✅ Zoxide binary found and executable: $ZOXIDE_PATH"
        
        # Test zoxide
        echo "🧪 Testing zoxide functionality..."
        $ZOXIDE_PATH --version
        $ZOXIDE_PATH --help | head -3
        
        echo "🎉 SUCCESS: GPX + zoxide working perfectly!"
        exit 0
    else
        echo "❌ Zoxide binary not found or not executable"
        exit 1
    fi
else
    echo "❌ Failed to download zoxide"
    exit 1
fi
EOF

chmod +x /tmp/quick-test.sh

# Run the test
if docker-compose run --rm --user root -v /tmp/quick-test.sh:/app/quick-test.sh gpx /app/quick-test.sh; then
    print_status "✅ Quick test PASSED!"
    echo ""
    echo "🚀 GPX is ready for deployment!"
    echo "   - Downloads work correctly"
    echo "   - Binaries are executable"
    echo "   - Cache system working"
else
    print_error "❌ Quick test FAILED!"
    exit 1
fi

# Cleanup
rm -f /tmp/quick-test.sh