#!/bin/bash

# Cron Job Setup Script for Vibe Upload
# This script helps set up automatic periodic uploads

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOAD_SCRIPT="$SCRIPT_DIR/auto-upload.sh"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if upload script exists
if [ ! -f "$UPLOAD_SCRIPT" ]; then
    print_color "$RED" "❌ auto-upload.sh not found in $SCRIPT_DIR"
    exit 1
fi

# Make sure upload script is executable
chmod +x "$UPLOAD_SCRIPT"

print_color "$BLUE" "╔════════════════════════════════╗"
print_color "$BLUE" "║   Vibe Upload Cron Setup       ║"
print_color "$BLUE" "╚════════════════════════════════╝"
echo ""

# Display schedule options
print_color "$YELLOW" "Select upload schedule:"
echo "1) Every hour"
echo "2) Every 6 hours"
echo "3) Every 12 hours"
echo "4) Daily at midnight"
echo "5) Daily at specific time"
echo "6) Custom cron expression"
echo "7) Remove existing cron job"
echo ""

read -p "Enter your choice (1-7): " choice

# Generate cron expression based on choice
case $choice in
    1)
        CRON_EXPR="0 * * * *"
        SCHEDULE_DESC="every hour"
        ;;
    2)
        CRON_EXPR="0 */6 * * *"
        SCHEDULE_DESC="every 6 hours"
        ;;
    3)
        CRON_EXPR="0 */12 * * *"
        SCHEDULE_DESC="every 12 hours"
        ;;
    4)
        CRON_EXPR="0 0 * * *"
        SCHEDULE_DESC="daily at midnight"
        ;;
    5)
        read -p "Enter hour (0-23): " hour
        read -p "Enter minute (0-59): " minute
        CRON_EXPR="$minute $hour * * *"
        SCHEDULE_DESC="daily at $hour:$minute"
        ;;
    6)
        read -p "Enter custom cron expression: " CRON_EXPR
        SCHEDULE_DESC="custom schedule"
        ;;
    7)
        # Remove existing cron job
        crontab -l 2>/dev/null | grep -v "$UPLOAD_SCRIPT" | crontab -
        print_color "$GREEN" "✅ Existing cron job removed"
        exit 0
        ;;
    *)
        print_color "$RED" "Invalid choice"
        exit 1
        ;;
esac

# Create the cron job command
CRON_JOB="$CRON_EXPR $UPLOAD_SCRIPT >> $HOME/.vibe-upload-cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$UPLOAD_SCRIPT"; then
    print_color "$YELLOW" "⚠️ Existing cron job found. Updating..."
    # Remove old job
    crontab -l 2>/dev/null | grep -v "$UPLOAD_SCRIPT" | crontab -
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Verify installation
if crontab -l 2>/dev/null | grep -q "$UPLOAD_SCRIPT"; then
    print_color "$GREEN" "✅ Cron job installed successfully!"
    print_color "$BLUE" "📅 Schedule: $SCHEDULE_DESC"
    print_color "$BLUE" "📄 Log file: $HOME/.vibe-upload-cron.log"
    echo ""
    print_color "$YELLOW" "Current cron jobs:"
    crontab -l | grep "$UPLOAD_SCRIPT"
    echo ""
    print_color "$GREEN" "To view logs:"
    print_color "$BLUE" "  tail -f $HOME/.vibe-upload-cron.log"
    echo ""
    print_color "$GREEN" "To remove the cron job:"
    print_color "$BLUE" "  $0 and select option 7"
else
    print_color "$RED" "❌ Failed to install cron job"
    exit 1
fi