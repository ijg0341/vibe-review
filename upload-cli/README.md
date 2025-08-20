# Vibe Upload CLI

CLI tool for uploading Claude Code sessions to Vibe Review platform.

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g vibe-upload-cli

# Or use locally
cd upload-cli
npm install
npm link
```

### Configuration

1. **Get your API key** from the Vibe Review web app:
   - Go to `/api-keys` page
   - Create a new API key
   - Copy the generated key

2. **Configure the CLI**:
```bash
vibe-upload config --api-key YOUR_API_KEY --server-url https://your-app-url.com
```

### Usage

#### Upload Claude sessions
```bash
# Upload from default Claude projects directory
vibe-upload

# Upload from custom directory
vibe-upload /path/to/claude/projects

# Upload single file
vibe-upload /path/to/session.jsonl --project "my-project"
```

#### Check upload status
```bash
vibe-upload status
```

#### View configuration
```bash
vibe-upload config
```

## 📁 Directory Structure

The CLI expects Claude Code session files in JSONL format, typically found in:
- macOS/Linux: `~/.claude/projects/`
- Windows: `%USERPROFILE%\.claude\projects\`

Example structure:
```
~/.claude/projects/
├── -Users-username-project1/
│   ├── session1.jsonl
│   └── session2.jsonl
└── -Users-username-project2/
    └── session3.jsonl
```

## 🔧 Advanced Usage

### Command Options

#### `vibe-upload` command
- `<path>` - Path to directory or JSONL file (optional, defaults to ~/.claude/projects)
- `-p, --project <name>` - Project name (for single file upload)
- `--stop-on-error` - Stop upload if any file fails

#### `vibe-upload config` command
- `--api-key <key>` - Set API key
- `--server-url <url>` - Set server URL

### Environment Variables

You can also use environment variables:
```bash
export VIBE_API_KEY="your-api-key"
export VIBE_SERVER_URL="https://your-app-url.com"
```

### Configuration File

The configuration is stored in `~/.viberc`:
```json
{
  "apiKey": "vibe_xxxxxxxxxxxxx",
  "serverUrl": "https://your-app-url.com"
}
```

## 🤖 Automation

### Using Shell Script

Use the provided automation script:
```bash
# Make executable
chmod +x scripts/auto-upload.sh

# Run upload
./scripts/auto-upload.sh

# Upload from custom directory
./scripts/auto-upload.sh -d /custom/path
```

### Setting up Cron Job

Use the setup script for automatic periodic uploads:
```bash
# Make executable
chmod +x scripts/setup-cron.sh

# Run setup
./scripts/setup-cron.sh
```

Choose from predefined schedules:
- Every hour
- Every 6 hours
- Every 12 hours
- Daily at midnight
- Daily at specific time
- Custom cron expression

### Manual Cron Setup

Add to crontab manually:
```bash
# Edit crontab
crontab -e

# Add one of these lines:
0 * * * * /path/to/auto-upload.sh          # Every hour
0 */6 * * * /path/to/auto-upload.sh        # Every 6 hours
0 0 * * * /path/to/auto-upload.sh          # Daily at midnight
```

### Using systemd Timer (Linux)

Create a systemd service:
```ini
# /etc/systemd/system/vibe-upload.service
[Unit]
Description=Vibe Upload Service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/vibe-upload
User=youruser

[Install]
WantedBy=multi-user.target
```

Create a timer:
```ini
# /etc/systemd/system/vibe-upload.timer
[Unit]
Description=Run Vibe Upload every hour

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable vibe-upload.timer
sudo systemctl start vibe-upload.timer
```

## 📊 API Usage

The CLI uses the following API endpoints:

### Upload Endpoint
```bash
POST /api/upload
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "projectName": "my-project",
  "fileName": "session.jsonl",
  "content": "JSONL_CONTENT"
}
```

### Status Endpoint
```bash
GET /api/upload
Authorization: Bearer YOUR_API_KEY
```

## 🔍 Troubleshooting

### API Key Issues
- Ensure API key starts with `vibe_`
- Check if key is active in web app
- Verify server URL is correct

### Upload Failures
- Check file permissions
- Verify JSONL format is valid
- Ensure network connectivity
- Check API key permissions

### Logs
- CLI logs: `~/.vibe-upload.log`
- Cron logs: `~/.vibe-upload-cron.log`

### Debug Mode
```bash
# Enable verbose output
DEBUG=* vibe-upload
```

## 📝 Examples

### Upload specific project
```bash
vibe-upload ~/.claude/projects/-Users-john-myproject/
```

### Upload with error handling
```bash
vibe-upload --stop-on-error || echo "Upload failed"
```

### Batch upload script
```bash
#!/bin/bash
for dir in ~/.claude/projects/*/; do
  echo "Uploading $dir"
  vibe-upload "$dir"
done
```

## 🔐 Security

- API keys are stored locally in `~/.viberc`
- Keys are transmitted over HTTPS only
- Never commit `.viberc` to version control
- Rotate keys regularly for security

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Issues

Report issues at: [GitHub Issues](https://github.com/your-repo/issues)