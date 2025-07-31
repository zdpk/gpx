#!/bin/bash

# Comprehensive GPX testing in Docker environment
set -e

echo "🧪 Comprehensive GPX Testing Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

# Check Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Building GPX Docker image..."
docker-compose build gpx

# Create comprehensive test script
cat > /tmp/comprehensive-test.sh << 'EOF'
#!/bin/bash
set -e

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
test_case() {
    local name="$1"
    local command="$2"
    local timeout_duration="${3:-60}"
    
    ((TOTAL_TESTS++))
    echo "🧪 Testing: $name"
    
    if timeout "$timeout_duration" bash -c "$command"; then
        echo "✅ PASSED: $name"
        ((PASSED_TESTS++))
    else
        echo "❌ FAILED: $name"
        ((FAILED_TESTS++))
    fi
    echo ""
}

# Section function
test_section() {
    echo ""
    echo "===================="
    echo "📋 $1"
    echo "===================="
}

test_section "Basic GPX Functionality"

test_case "GPX Help" "node dist/cli.js --help | grep -q 'GitHub Package eXecutor'"
test_case "GPX Version" "node dist/cli.js --version | grep -q '[0-9]'"

test_section "Popular Tool Downloads"

# Test various popular tools
test_case "Download zoxide (Rust tool)" "node dist/cli.js ajeetdsouza/zoxide --verbose" 300
test_case "Download bat (Rust tool)" "node dist/cli.js sharkdp/bat --verbose" 300
test_case "Download fd (Rust tool)" "node dist/cli.js sharkdp/fd --verbose" 300
test_case "Download ripgrep (Rust tool)" "node dist/cli.js BurntSushi/ripgrep --verbose" 300

test_section "Binary Verification"

# Verify downloaded binaries
test_case "Zoxide binary exists" "test -f \$HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide"
test_case "Zoxide is executable" "test -x \$HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide"
test_case "Zoxide runs" "\$HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide --help > /dev/null"

test_case "Bat binary exists" "find \$HOME/.cache/gpx/sharkdp/bat/latest/ -name 'bat' -type f | head -1 | xargs test -f"
test_case "Bat is executable" "find \$HOME/.cache/gpx/sharkdp/bat/latest/ -name 'bat' -type f | head -1 | xargs test -x"

test_case "Fd binary exists" "find \$HOME/.cache/gpx/sharkdp/fd/latest/ -name 'fd' -type f | head -1 | xargs test -f"
test_case "Fd is executable" "find \$HOME/.cache/gpx/sharkdp/fd/latest/ -name 'fd' -type f | head -1 | xargs test -x"

test_case "Ripgrep binary exists" "find \$HOME/.cache/gpx/BurntSushi/ripgrep/latest/ -name 'rg' -type f | head -1 | xargs test -f"
test_case "Ripgrep is executable" "find \$HOME/.cache/gpx/BurntSushi/ripgrep/latest/ -name 'rg' -type f | head -1 | xargs test -x"

test_section "Version-specific Downloads"

test_case "Download specific zoxide version" "node dist/cli.js ajeetdsouza/zoxide@v0.9.4 --verbose" 300

test_section "Cache Management"

test_case "Cache directory structure" "ls -la \$HOME/.cache/gpx/ | grep -q ajeetdsouza"
test_case "Multiple versions cached" "ls \$HOME/.cache/gpx/ajeetdsouza/zoxide/ | wc -l | awk '\$1 > 1 {exit 0} {exit 1}'"

test_section "Error Handling"

test_case "Invalid repository" "! node dist/cli.js nonexistent/repo-that-does-not-exist 2>/dev/null"
test_case "Invalid version" "! node dist/cli.js ajeetdsouza/zoxide@v999.999.999 2>/dev/null"

test_section "Performance Tests"

test_case "Quick re-download (cache hit)" "time node dist/cli.js ajeetdsouza/zoxide --verbose" 30

echo ""
echo "==============================="
echo "📊 Comprehensive Test Results"
echo "==============================="
echo "Total Tests: $TOTAL_TESTS"
echo "✅ Passed: $PASSED_TESTS"
echo "❌ Failed: $FAILED_TESTS"
echo "Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! GPX is working perfectly in Docker."
    exit 0
else
    echo ""
    echo "💥 Some tests failed. Please check the output above."
    exit 1
fi
EOF

chmod +x /tmp/comprehensive-test.sh

print_section "Running Comprehensive GPX Tests"
print_warning "This will download several popular tools and may take 5-10 minutes..."
print_status "Tests include: zoxide, bat, fd, ripgrep, and various edge cases"

# Run comprehensive tests
docker-compose run --rm \
    -v /tmp/comprehensive-test.sh:/app/test-comprehensive.sh \
    gpx /app/test-comprehensive.sh

print_status "Comprehensive testing completed!"

# Cleanup
rm -f /tmp/comprehensive-test.sh