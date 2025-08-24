#!/bin/bash

# Production Build Script for Cybersecurity Compliance Platform
# This script handles the complete production build process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_NAME="cybersecurity-compliance-platform"
BUILD_DIR="dist"
ENV_FILE=".env.production"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "vite.config.ts" ]; then
    log_error "This script must be run from the project root directory"
    exit 1
fi

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18 or higher is required (current: $(node --version))"
        exit 1
    fi
    
    log_success "Node.js version: $(node --version)"
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "npm version: $(npm --version)"
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Production environment file $ENV_FILE not found"
        log_info "Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example "$ENV_FILE"
            log_warning "Please update $ENV_FILE with production values before continuing"
            read -p "Press Enter after updating environment variables..."
        else
            log_error "No .env.example template found"
            exit 1
        fi
    fi
}

# Function to install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm ci --production=false
    
    log_success "Dependencies installed successfully"
}

# Function to run tests
run_tests() {
    log_info "Running tests..."
    
    # Run unit tests
    if npm run test:run; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        exit 1
    fi
    
    # Run type checking
    if npm run type-check; then
        log_success "Type checking passed"
    else
        log_error "Type checking failed"
        exit 1
    fi
    
    # Run linting
    if npm run lint; then
        log_success "Linting passed"
    else
        log_error "Linting failed"
        exit 1
    fi
}

# Function to create backup
create_backup() {
    log_info "Creating backup of current build..."
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$BUILD_DIR" ]; then
        cp -r "$BUILD_DIR" "$BACKUP_DIR/"
        log_success "Backup created at $BACKUP_DIR"
    else
        log_warning "No existing build to backup"
    fi
}

# Function to build the application
build_application() {
    log_info "Building application for production..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Clean build directory
    rm -rf "$BUILD_DIR"
    
    # Build the application
    if npm run build; then
        log_success "Build completed successfully"
    else
        log_error "Build failed"
        exit 1
    fi
    
    # Verify build output
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Build directory not created"
        exit 1
    fi
    
    # Check build size
    BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
    log_info "Build size: $BUILD_SIZE"
}

# Function to analyze bundle
analyze_bundle() {
    log_info "Analyzing bundle..."
    
    if npm run analyze; then
        log_success "Bundle analysis completed"
    else
        log_warning "Bundle analysis failed (continuing anyway)"
    fi
}

# Function to run security checks
run_security_checks() {
    log_info "Running security checks..."
    
    # Check for common security issues
    if grep -r "console.log\|console.error\|console.warn" "$BUILD_DIR" --include="*.js" --include="*.mjs" | grep -v "sourcemap" > /dev/null; then
        log_warning "Console statements found in production build"
    else
        log_success "No console statements in production build"
    fi
    
    # Check for source maps in production
    if [ "$NODE_ENV" = "production" ] && find "$BUILD_DIR" -name "*.map" | grep -q .; then
        log_warning "Source maps found in production build"
    fi
    
    # Check for environment variables
    if grep -r "VITE_" "$BUILD_DIR" --include="*.js" --include="*.mjs" > /dev/null; then
        log_warning "Environment variables found in build (check if they're properly handled)"
    fi
}

# Function to create deployment package
create_deployment_package() {
    log_info "Creating deployment package..."
    
    DEPLOYMENT_PACKAGE="${PROJECT_NAME}-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # Create tar.gz of build directory
    tar -czf "$DEPLOYMENT_PACKAGE" -C "$BUILD_DIR" .
    
    if [ -f "$DEPLOYMENT_PACKAGE" ]; then
        PACKAGE_SIZE=$(du -sh "$DEPLOYMENT_PACKAGE" | cut -f1)
        log_success "Deployment package created: $DEPLOYMENT_PACKAGE ($PACKAGE_SIZE)"
    else
        log_error "Failed to create deployment package"
        exit 1
    fi
}

# Function to generate build report
generate_build_report() {
    log_info "Generating build report..."
    
    REPORT_FILE="build-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Build Report - $(date)

## Build Information
- **Project**: $PROJECT_NAME
- **Build Time**: $(date)
- **Node Version**: $(node --version)
- **NPM Version**: $(npm --version)
- **Environment**: $NODE_ENV

## Build Results
- **Status**: ✅ Success
- **Build Directory**: $BUILD_DIR
- **Build Size**: $(du -sh "$BUILD_DIR" | cut -f1)
- **Deployment Package**: $DEPLOYMENT_PACKAGE

## Files Generated
$(find "$BUILD_DIR" -type f | wc -l) files in build directory

## Security Status
- **Console Statements**: $(if grep -r "console.log\|console.error\|console.warn" "$BUILD_DIR" --include="*.js" --include="*.mjs" | grep -v "sourcemap" > /dev/null; then echo "⚠️ Found"; else echo "✅ Clean"; fi)
- **Source Maps**: $(if find "$BUILD_DIR" -name "*.map" | grep -q .; then echo "⚠️ Found"; else echo "✅ Clean"; fi)

## Next Steps
1. Review the build output in \`$BUILD_DIR\`
2. Test the production build locally: \`npm run preview\`
3. Deploy using the generated package: \`$DEPLOYMENT_PACKAGE\`
4. Verify deployment and monitor for issues

## Build Commands Used
\`\`\`bash
npm ci --production=false
npm run test:run
npm run type-check
npm run lint
npm run build
\`\`\`
EOF

    log_success "Build report generated: $REPORT_FILE"
}

# Function to cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary files
    rm -rf .vite
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "Starting production build for $PROJECT_NAME"
    log_info "Build directory: $BUILD_DIR"
    log_info "Environment: $ENV_FILE"
    
    # Execute build steps
    check_prerequisites
    install_dependencies
    run_tests
    create_backup
    build_application
    analyze_bundle
    run_security_checks
    create_deployment_package
    generate_build_report
    cleanup
    
    log_success "Production build completed successfully!"
    log_info "Build output: $BUILD_DIR"
    log_info "Deployment package: $DEPLOYMENT_PACKAGE"
    log_info "Build report: build-report-*.md"
    
    echo ""
    echo "🚀 Ready for deployment!"
    echo "   - Test locally: npm run preview"
    echo "   - Deploy: $DEPLOYMENT_PACKAGE"
    echo "   - Monitor: Check build report for details"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --skip-tests   Skip running tests"
        echo "  --skip-backup  Skip creating backup"
        echo "  --analyze      Run bundle analysis"
        echo ""
        echo "Environment:"
        echo "  NODE_ENV       Set to 'production' for production build"
        echo "  VITE_*         Vite environment variables"
        exit 0
        ;;
    --skip-tests)
        log_warning "Skipping tests (--skip-tests flag used)"
        SKIP_TESTS=true
        ;;
    --skip-backup)
        log_warning "Skipping backup (--skip-backup flag used)"
        SKIP_BACKUP=true
        ;;
    --analyze)
        log_info "Bundle analysis enabled (--analyze flag used)"
        ENABLE_ANALYSIS=true
        ;;
esac

# Run main function
main "$@"