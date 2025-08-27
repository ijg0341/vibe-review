#!/usr/bin/env node

const { program } = require('commander');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const ora = require('ora');
const glob = require('glob').sync;
require('dotenv').config();

// 설정 파일 경로
const CONFIG_PATH = path.join(os.homedir(), '.viberc');

// 설정 로드
async function loadConfig() {
  try {
    const configContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    return {};
  }
}

// 설정 저장
async function saveConfig(config) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// API 키 설정
async function configureApiKey(apiKey, serverUrl) {
  const config = await loadConfig();
  
  if (apiKey) {
    config.apiKey = apiKey;
  }
  
  if (serverUrl) {
    config.serverUrl = serverUrl;
  } else if (!config.serverUrl) {
    config.serverUrl = 'https://your-app-url.com'; // 기본 서버 URL
  }
  
  await saveConfig(config);
  console.log(chalk.green('✓ Configuration saved'));
  console.log(chalk.gray(`Config file: ${CONFIG_PATH}`));
}

// JSONL 파일 업로드
async function uploadFile(filePath, projectName, config, projectId) {
  const fileName = path.basename(filePath);
  const content = await fs.readFile(filePath, 'utf-8');
  
  const requestBody = {
    projectName,
    fileName,
    content
  };
  
  // projectId가 제공된 경우 추가
  if (projectId) {
    requestBody.projectId = projectId;
  }
  
  const response = await axios.post(
    `${config.serverUrl}/api/upload`,
    requestBody,
    {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}

// Claude 프로젝트 디렉토리 스캔
async function scanClaudeProjects(projectsPath) {
  const pattern = path.join(projectsPath, '*', '*.jsonl');
  const files = glob(pattern);
  
  // 프로젝트별로 그룹화
  const projects = {};
  for (const file of files) {
    const dir = path.dirname(file);
    const projectName = path.basename(dir);
    if (!projects[projectName]) {
      projects[projectName] = [];
    }
    projects[projectName].push(file);
  }
  
  return projects;
}

// 업로드 명령어
async function uploadCommand(targetPath, options) {
  const config = await loadConfig();
  
  if (!config.apiKey) {
    console.error(chalk.red('Error: API key not configured'));
    console.log(chalk.yellow('Run: vibe-upload config --api-key YOUR_API_KEY'));
    process.exit(1);
  }
  
  const spinner = ora('Scanning for JSONL files...').start();
  
  try {
    // 대상 경로 확인
    const stats = await fs.stat(targetPath);
    let projects = {};
    
    if (stats.isDirectory()) {
      // 디렉토리인 경우 스캔
      projects = await scanClaudeProjects(targetPath);
    } else if (targetPath.endsWith('.jsonl')) {
      // 단일 파일인 경우
      const projectName = options.project || path.basename(path.dirname(targetPath));
      projects[projectName] = [targetPath];
    } else {
      spinner.fail('Invalid target: must be a directory or .jsonl file');
      process.exit(1);
    }
    
    const totalProjects = Object.keys(projects).length;
    const totalFiles = Object.values(projects).reduce((sum, files) => sum + files.length, 0);
    
    spinner.succeed(`Found ${totalProjects} projects with ${totalFiles} JSONL files`);
    
    if (totalFiles === 0) {
      console.log(chalk.yellow('No JSONL files found'));
      return;
    }
    
    // 업로드 진행
    let successCount = 0;
    let errorCount = 0;
    
    for (const [projectName, files] of Object.entries(projects)) {
      console.log(chalk.blue(`\n📁 Project: ${projectName}`));
      
      for (const file of files) {
        const fileName = path.basename(file);
        const uploadSpinner = ora(`Uploading ${fileName}...`).start();
        
        try {
          const result = await uploadFile(file, projectName, config, options.projectId);
          
          if (result.newLines > 0) {
            uploadSpinner.succeed(
              `${fileName} - ${result.newLines} new lines added`
            );
          } else {
            uploadSpinner.succeed(
              `${fileName} - Already up to date`
            );
          }
          successCount++;
        } catch (error) {
          uploadSpinner.fail(
            `${fileName} - ${error.response?.data?.error || error.message}`
          );
          errorCount++;
          
          if (options.stopOnError) {
            console.error(chalk.red('\nStopping due to error (--stop-on-error flag)'));
            process.exit(1);
          }
        }
      }
    }
    
    // 결과 요약
    console.log(chalk.green(`\n✨ Upload complete!`));
    console.log(chalk.gray(`Success: ${successCount} files`));
    if (errorCount > 0) {
      console.log(chalk.red(`Failed: ${errorCount} files`));
    }
    
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

// 상태 확인 명령어
async function statusCommand() {
  const config = await loadConfig();
  
  if (!config.apiKey) {
    console.error(chalk.red('Error: API key not configured'));
    process.exit(1);
  }
  
  const spinner = ora('Fetching upload status...').start();
  
  try {
    const response = await axios.get(
      `${config.serverUrl}/api/upload`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      }
    );
    
    spinner.succeed('Status fetched');
    
    const uploads = response.data.uploads;
    
    if (uploads.length === 0) {
      console.log(chalk.yellow('No uploads found'));
      return;
    }
    
    console.log(chalk.blue('\n📊 Upload Status:\n'));
    
    for (const upload of uploads) {
      console.log(chalk.bold(`📁 ${upload.project_name}`));
      console.log(chalk.gray(`   ID: ${upload.id}`));
      console.log(chalk.gray(`   Path: ${upload.project_path}`));
      console.log(chalk.gray(`   Files: ${upload.uploaded_files?.length || 0}`));
      console.log(chalk.gray(`   Last updated: ${new Date(upload.uploaded_at).toLocaleString()}`));
      
      if (upload.uploaded_files && upload.uploaded_files.length > 0) {
        console.log(chalk.gray('   Recent files:'));
        upload.uploaded_files.slice(0, 3).forEach(file => {
          console.log(chalk.gray(`     - ${file.file_name} (${file.processed_lines} lines)`));
        });
      }
      console.log();
    }
  } catch (error) {
    spinner.fail(`Error: ${error.response?.data?.error || error.message}`);
    process.exit(1);
  }
}

// CLI 설정
program
  .name('vibe-upload')
  .description('CLI tool for uploading Claude Code sessions to Vibe Review')
  .version('1.0.0');

// config 명령어
program
  .command('config')
  .description('Configure API key and server URL')
  .option('--api-key <key>', 'Set API key')
  .option('--server-url <url>', 'Set server URL')
  .action(async (options) => {
    if (!options.apiKey && !options.serverUrl) {
      const config = await loadConfig();
      console.log(chalk.blue('Current configuration:'));
      console.log(chalk.gray(`API Key: ${config.apiKey ? config.apiKey.substring(0, 12) + '...' : 'Not set'}`));
      console.log(chalk.gray(`Server URL: ${config.serverUrl || 'Not set'}`));
      console.log(chalk.gray(`Config file: ${CONFIG_PATH}`));
    } else {
      await configureApiKey(options.apiKey, options.serverUrl);
    }
  });

// upload 명령어 (기본)
program
  .command('upload <path>')
  .description('Upload JSONL files from a directory or single file')
  .option('-p, --project <name>', 'Project name (for single file upload)')
  .option('--stop-on-error', 'Stop upload if any file fails')
  .action(uploadCommand);

// status 명령어
program
  .command('status')
  .description('Check upload status')
  .action(statusCommand);

// 기본 명령어 (upload)
program
  .argument('[path]', 'Path to Claude projects directory or JSONL file')
  .option('-p, --project <name>', 'Project name (for single file upload)')
  .option('--stop-on-error', 'Stop upload if any file fails')
  .action(async (targetPath, options) => {
    if (!targetPath) {
      // 기본 Claude 프로젝트 경로 사용
      targetPath = path.join(os.homedir(), '.claude', 'projects');
      console.log(chalk.gray(`Using default path: ${targetPath}`));
    }
    await uploadCommand(targetPath, options);
  });

program.parse();