#!/usr/bin/env node

/**
 * vibe-upload 성능 테스트 스크립트
 * 
 * 사용법: node test-performance.js [path-to-jsonl-files] --project-id=[your-project-id]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 테스트 설정
const testCases = [
  { parallel: 1, label: 'Sequential (1 thread)' },
  { parallel: 3, label: 'Parallel (3 threads)' },
  { parallel: 5, label: 'Parallel (5 threads)' }
];

async function runPerformanceTest() {
  const targetPath = process.argv[2] || path.join(process.env.HOME, '.claude', 'projects');
  const projectId = process.argv.find(arg => arg.startsWith('--project-id='))?.split('=')[1];
  
  if (!projectId) {
    console.error('Error: --project-id is required');
    console.log('Usage: node test-performance.js [path] --project-id=YOUR_PROJECT_ID');
    process.exit(1);
  }
  
  console.log('🚀 vibe-upload Performance Test');
  console.log('================================');
  console.log(`Target path: ${targetPath}`);
  console.log(`Project ID: ${projectId}`);
  console.log('');
  
  // 파일 스캔
  try {
    const files = execSync(`find "${targetPath}" -name "*.jsonl" 2>/dev/null | wc -l`)
      .toString().trim();
    console.log(`Found ${files} JSONL files`);
    console.log('');
  } catch (e) {
    console.log('Unable to count files');
  }
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.label}`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    
    try {
      const command = `vibe-upload "${targetPath}" --parallel ${testCase.parallel} --project-id=${projectId}`;
      console.log(`Command: ${command}`);
      
      execSync(command, {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      const elapsed = (Date.now() - startTime) / 1000;
      
      results.push({
        ...testCase,
        time: elapsed,
        success: true
      });
      
      console.log(`\n✅ Completed in ${elapsed.toFixed(2)} seconds`);
    } catch (error) {
      const elapsed = (Date.now() - startTime) / 1000;
      
      results.push({
        ...testCase,
        time: elapsed,
        success: false
      });
      
      console.log(`\n❌ Failed after ${elapsed.toFixed(2)} seconds`);
    }
  }
  
  // 결과 요약
  console.log('\n\n📈 Performance Summary');
  console.log('======================');
  console.table(results.map(r => ({
    'Mode': r.label,
    'Time (s)': r.time.toFixed(2),
    'Status': r.success ? '✅' : '❌'
  })));
  
  // 성능 개선 계산
  if (results.length > 1 && results[0].success && results[1].success) {
    const improvement = ((results[0].time - results[1].time) / results[0].time * 100).toFixed(1);
    console.log(`\n🎉 Performance improvement: ${improvement}% faster with parallel uploads`);
  }
}

// 테스트 실행
runPerformanceTest().catch(console.error);