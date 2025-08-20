#!/bin/bash

# Vibe Upload Auto Script
# This script automatically uploads Claude Code sessions to Vibe Review

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLAUDE_PROJECTS_DIR="$HOME/.claude/projects"
LOG_FILE="$HOME/.vibe-upload.log"
CONFIG_FILE="$HOME/.viberc"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if vibe-upload CLI is installed
check_cli_installed() {
    if ! command -v vibe-upload &> /dev/null; then
        print_color "$RED" "❌ vibe-upload CLI is not installed"
        print_color "$YELLOW" "Install it with: npm install -g vibe-upload-cli"
        exit 1
    fi
}

# Check if API key is configured
check_api_key() {
    if [ ! -f "$CONFIG_FILE" ]; then
        print_color "$RED" "❌ API key not configured"
        print_color "$YELLOW" "Configure it with: vibe-upload config --api-key YOUR_API_KEY"
        exit 1
    fi
    
    if ! grep -q "apiKey" "$CONFIG_FILE"; then
        print_color "$RED" "❌ API key not found in config"
        print_color "$YELLOW" "Configure it with: vibe-upload config --api-key YOUR_API_KEY"
        exit 1
    fi
}

# Main upload function
perform_upload() {
    local target_dir=${1:-$CLAUDE_PROJECTS_DIR}
    
    print_color "$BLUE" "🚀 Starting automatic upload..."
    print_color "$BLUE" "📁 Target directory: $target_dir"
    
    log_message "Starting upload from $target_dir"
    
    # Check if directory exists
    if [ ! -d "$target_dir" ]; then
        print_color "$RED" "❌ Directory not found: $target_dir"
        log_message "ERROR: Directory not found: $target_dir"
        exit 1
    fi
    
    # Count JSONL files
    local file_count=$(find "$target_dir" -name "*.jsonl" 2>/dev/null | wc -l)
    
    if [ "$file_count" -eq 0 ]; then
        print_color "$YELLOW" "⚠️ No JSONL files found in $target_dir"
        log_message "No JSONL files found"
        exit 0
    fi
    
    print_color "$GREEN" "📊 Found $file_count JSONL files"
    
    # Perform upload
    if vibe-upload "$target_dir"; then
        print_color "$GREEN" "✅ Upload completed successfully"
        log_message "Upload completed successfully"
    else
        print_color "$RED" "❌ Upload failed"
        log_message "ERROR: Upload failed"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--directory)
            CUSTOM_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -d, --directory DIR   Upload from custom directory (default: ~/.claude/projects)"
            echo "  -h, --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Upload from default Claude projects directory"
            echo "  $0 -d /path/to/projects      # Upload from custom directory"
            exit 0
            ;;
        *)
            print_color "$RED" "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Main execution
print_color "$BLUE" "╔════════════════════════════════╗"
print_color "$BLUE" "║   Vibe Upload Auto Script      ║"
print_color "$BLUE" "╚════════════════════════════════╝"

# Run checks
check_cli_installed
check_api_key

# Perform upload
if [ -n "$CUSTOM_DIR" ]; then
    perform_upload "$CUSTOM_DIR"
else
    perform_upload
fi

print_color "$GREEN" "🎉 Done!"