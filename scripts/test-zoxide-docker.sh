#!/bin/bash

# Test GPX with zoxide in Docker environment
set -e

echo "🚀 Testing GPX with zoxide in Docker"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Build the Docker image
print_status "Building GPX Docker image..."
docker-compose build gpx

# Create test script to run inside container
cat > /tmp/zoxide-test-script.sh << 'EOF'
#!/bin/bash
set -e

echo "🔧 Setting up test environment..."

# Test variables
TEST_PASSED=0
TEST_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "🧪 Running: $test_name"
    if eval "$test_command"; then
        echo "✅ PASSED: $test_name"
        ((TEST_PASSED++))
    else
        echo "❌ FAILED: $test_name"
        ((TEST_FAILED++))
    fi
    echo ""
}

# Test 1: Check GPX help
run_test "GPX Help Command" "node dist/cli.js --help > /dev/null"

# Test 2: Check GPX version
run_test "GPX Version Command" "node dist/cli.js --version > /dev/null"

# Test 3: Download zoxide (latest release)
echo "📥 Testing zoxide download with GPX..."
run_test "Download zoxide binary" "timeout 300 node dist/cli.js ajeetdsouza/zoxide --verbose"

# Test 4: Check if zoxide binary exists and is executable
if [ -f "$HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide" ]; then
    run_test "Zoxide binary exists" "test -f $HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide"
    run_test "Zoxide binary is executable" "test -x $HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide"
    
    # Test 5: Run zoxide help command
    run_test "Zoxide help command" "$HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide --help > /dev/null"
    
    # Test 6: Run zoxide version command
    run_test "Zoxide version command" "$HOME/.cache/gpx/ajeetdsouza/zoxide/latest/zoxide --version > /dev/null"
else
    echo "❌ Zoxide binary not found after download"
    ((TEST_FAILED++))
fi

# Test 7: Test GPX with specific version (if we want to test version handling)
echo "📥 Testing specific version download..."
run_test "Download zoxide v0.9.4" "timeout 300 node dist/cli.js ajeetdsouza/zoxide@v0.9.4 --verbose"

# Test 8: Verify cached files
run_test "Check cache structure" "ls -la $HOME/.cache/gpx/ajeetdsouza/zoxide/"

# Summary
echo "=========================="
echo "📊 Test Results Summary"
echo "=========================="
echo "✅ Passed: $TEST_PASSED"
echo "❌ Failed: $TEST_FAILED"
echo "Total: $((TEST_PASSED + TEST_FAILED))"

if [ $TEST_FAILED -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "💥 Some tests failed!"
    exit 1
fi
EOF

chmod +x /tmp/zoxide-test-script.sh

print_status "Running zoxide tests in Docker container..."
print_warning "This may take several minutes as it downloads binaries..."

# Run the test script in Docker container
docker-compose run --rm \
    -v /tmp/zoxide-test-script.sh:/app/test-script.sh \
    gpx /app/test-script.sh

print_status "Test completed!"

# Cleanup
rm -f /tmp/zoxide-test-script.sh