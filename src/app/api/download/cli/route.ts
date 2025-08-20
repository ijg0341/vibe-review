import { NextRequest, NextResponse } from 'next/server'

// CLI 스크립트 다운로드 API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'script'
  
  if (type === 'script') {
    // 단일 스크립트 파일로 제공
    const cliScript = `#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG_PATH = path.join(os.homedir(), '.viberc');

// Colors for output
const colors = {
  red: '\\x1b[31m',
  green: '\\x1b[32m',
  yellow: '\\x1b[33m',
  blue: '\\x1b[34m',
  reset: '\\x1b[0m'
};

// Load config
function loadConfig() {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    return {};
  }
}

// Save config
function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Configure API key
function configureApiKey(apiKey, serverUrl) {
  const config = loadConfig();
  
  if (apiKey) {
    config.apiKey = apiKey;
  }
  
  if (serverUrl) {
    config.serverUrl = serverUrl;
  }
  
  saveConfig(config);
  console.log(\`\${colors.green}✓ Configuration saved\${colors.reset}\`);
  console.log(\`Config file: \${CONFIG_PATH}\`);
}

// Upload JSONL file
async function uploadFile(filePath, projectName, config) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const data = JSON.stringify({
      projectName,
      fileName,
      content
    });
    
    const url = new URL(config.serverUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${config.apiKey}\`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const httpModule = url.protocol === 'https:' ? https : http;
    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('\\\\nServer response:', JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          console.log('\\\\nRaw server response:', responseData);
          reject(new Error('Invalid response from server: ' + responseData));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Scan directory for JSONL files
function scanDirectory(dirPath) {
  const files = [];
  const projects = {};
  
  function scan(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        scan(fullPath);
      } else if (item.endsWith('.jsonl')) {
        const projectName = path.basename(path.dirname(fullPath));
        if (!projects[projectName]) {
          projects[projectName] = [];
        }
        projects[projectName].push(fullPath);
      }
    }
  }
  
  scan(dirPath);
  return projects;
}

// Get user settings from server
async function getUserSettings(config) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.serverUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/api/user-settings',
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${config.apiKey}\`,
        'Content-Type': 'application/json'
      }
    };
    
    const httpModule = url.protocol === 'https:' ? https : http;
    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          resolve({ project_path: null }); // 설정이 없으면 null
        }
      });
    });
    
    req.on('error', () => resolve({ project_path: null }));
    req.end();
  });
}

// Filter projects based on user settings
function filterProjectsBySettings(projects, userSettings) {
  if (!userSettings?.project_path) {
    return projects; // 설정이 없으면 모든 프로젝트 포함
  }
  
  const workingDir = userSettings.project_path;
  const expectedPrefix = workingDir.replace(/\\//g, '-').replace(/^-/, '-');
  
  console.log(\`\${colors.blue}Filtering projects with working directory: \${workingDir}\${colors.reset}\`);
  console.log(\`\${colors.blue}Expected project prefix: \${expectedPrefix}\${colors.reset}\`);
  
  const filteredProjects = {};
  let filteredCount = 0;
  
  for (const [projectName, files] of Object.entries(projects)) {
    if (projectName.startsWith(expectedPrefix)) {
      filteredProjects[projectName] = files;
      filteredCount++;
    }
  }
  
  console.log(\`\${colors.green}Found \${filteredCount} matching projects\${colors.reset}\`);
  return filteredProjects;
}

// Main upload command
async function uploadCommand(targetPath) {
  const config = loadConfig();
  
  if (!config.apiKey) {
    console.error(\`\${colors.red}Error: API key not configured\${colors.reset}\`);
    console.log(\`\${colors.yellow}Run: vibe-upload config --api-key YOUR_API_KEY --server-url YOUR_SERVER_URL\${colors.reset}\`);
    process.exit(1);
  }
  
  if (!config.serverUrl) {
    console.error(\`\${colors.red}Error: Server URL not configured\${colors.reset}\`);
    console.log(\`\${colors.yellow}Run: vibe-upload config --server-url YOUR_SERVER_URL\${colors.reset}\`);
    process.exit(1);
  }
  
  // 사용자 설정 가져오기
  console.log(\`\${colors.blue}Checking user settings...\${colors.reset}\`);
  const userSettings = await getUserSettings(config);
  
  console.log(\`\${colors.blue}Scanning for JSONL files...\${colors.reset}\`);
  
  const stats = fs.statSync(targetPath);
  let projects = {};
  
  if (stats.isDirectory()) {
    projects = scanDirectory(targetPath);
  } else if (targetPath.endsWith('.jsonl')) {
    const projectName = path.basename(path.dirname(targetPath));
    projects[projectName] = [targetPath];
  }
  
  // 사용자 설정에 따라 프로젝트 필터링
  projects = filterProjectsBySettings(projects, userSettings);
  
  const totalProjects = Object.keys(projects).length;
  const totalFiles = Object.values(projects).reduce((sum, files) => sum + files.length, 0);
  
  console.log(\`Found \${totalProjects} projects with \${totalFiles} JSONL files\`);
  
  if (totalFiles === 0) {
    console.log(\`\${colors.yellow}No JSONL files found\${colors.reset}\`);
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const [projectName, files] of Object.entries(projects)) {
    console.log(\`\\n📁 Project: \${projectName}\`);
    
    for (const file of files) {
      const fileName = path.basename(file);
      process.stdout.write(\`  Uploading \${fileName}...\`);
      
      try {
        const result = await uploadFile(file, projectName, config);
        
        if (result.success) {
          if (result.newLines > 0) {
            console.log(\` \${colors.green}✓\${colors.reset} \${result.newLines} new lines added\`);
          } else {
            console.log(\` \${colors.green}✓\${colors.reset} Already up to date\`);
          }
          successCount++;
        } else {
          console.log(\` \${colors.red}✗\${colors.reset} Upload failed\`);
          if (result.error) {
            console.log(\`    Error: \${result.error}\`);
          }
          if (result.details) {
            console.log(\`    Details: \${result.details}\`);
          }
          errorCount++;
        }
      } catch (error) {
        console.log(\` \${colors.red}✗\${colors.reset} \${error.message}\`);
        errorCount++;
      }
    }
  }
  
  console.log(\`\\n\${colors.green}✨ Upload complete!\${colors.reset}\`);
  console.log(\`Success: \${successCount} files\`);
  if (errorCount > 0) {
    console.log(\`\${colors.red}Failed: \${errorCount} files\${colors.reset}\`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  vibe-upload config --api-key KEY --server-url URL');
  console.log('  vibe-upload [path]');
  console.log('  vibe-upload status');
  process.exit(0);
}

if (args[0] === 'config') {
  let apiKey = null;
  let serverUrl = null;
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--api-key' && args[i + 1]) {
      apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--server-url' && args[i + 1]) {
      serverUrl = args[i + 1];
      i++;
    }
  }
  
  if (!apiKey && !serverUrl) {
    const config = loadConfig();
    console.log('Current configuration:');
    console.log(\`API Key: \${config.apiKey ? config.apiKey.substring(0, 12) + '...' : 'Not set'}\`);
    console.log(\`Server URL: \${config.serverUrl || 'Not set'}\`);
    console.log(\`Config file: \${CONFIG_PATH}\`);
  } else {
    configureApiKey(apiKey, serverUrl);
  }
} else {
  const targetPath = args[0] || path.join(os.homedir(), '.claude', 'projects');
  uploadCommand(targetPath).catch(console.error);
}
`;

    return new NextResponse(cliScript, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="vibe-upload.js"'
      }
    });
  }
  
  // package.json 다운로드
  if (type === 'package') {
    const packageJson = {
      name: "vibe-upload-cli",
      version: "1.0.0",
      description: "CLI tool for uploading Claude Code sessions",
      bin: {
        "vibe-upload": "./vibe-upload.js"
      },
      engines: {
        node: ">=14.0.0"
      }
    };
    
    return new NextResponse(JSON.stringify(packageJson, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="package.json"'
      }
    });
  }
  
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}