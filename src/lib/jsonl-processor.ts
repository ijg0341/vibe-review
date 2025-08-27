import { createClient as createClientClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface ProcessedLine {
  line_number: number
  content: any | null
  raw_text: string
  message_type?: string
  message_timestamp?: string
  metadata?: any
}

export class JSONLProcessor {
  private supabase: any
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB - 스트리밍 처리 임계값
  
  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClientClient()
  }
  
  /**
   * JSONL 파일 내용을 파싱하고 DB에 저장 (증분 업데이트 지원)
   */
  async processJSONLFile(
    fileContent: string,
    sessionId: string,
    uploadId: string, // 호환성을 위해 유지, sessionId와 동일
    existingLineCount: number = 0
  ): Promise<{ success: boolean; processedLines: number; errors: number; newLines: number; error?: string; sessionDates?: { start: string | null; end: string | null } }> {
    console.log('=== Starting JSONL Processing ===')
    console.log('Session ID:', sessionId)
    console.log('Upload ID (same as session):', uploadId)
    console.log('Existing line count:', existingLineCount)
    
    const lines = fileContent.split('\n').filter(line => line.trim())
    const batch: ProcessedLine[] = []
    let processedCount = 0
    let errorCount = 0
    let newLines = 0
    let minTimestamp: Date | null = null
    let maxTimestamp: Date | null = null
    
    // 성능 최적화: 배치 크기와 업데이트 빈도 설정
    const BATCH_SIZE = 500  // 100에서 500으로 증가
    const UPDATE_FREQUENCY = 2000  // 2000줄마다 진행 상황 업데이트
    let lastUpdateLine = 0
    
    console.log('Total lines in file:', lines.length)
    console.log(`Optimized batch size: ${BATCH_SIZE}, Update frequency: ${UPDATE_FREQUENCY}`)
    
    try {
      // 세션 처리 상태를 'processing'으로 업데이트
      console.log('Updating session status to processing...')
      const { error: updateError } = await this.supabase
        .from('project_sessions')
        .update({ 
          processing_status: 'processing',
          processed_lines: existingLineCount 
        })
        .eq('id', sessionId)
      
      console.log('Session status update result:', updateError)
      console.log(`Processing session with ${lines.length} total lines, ${existingLineCount} existing lines`)
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const lineNumber = i + 1
        
        // 이미 처리된 라인은 완전히 건너뛰기
        if (lineNumber <= existingLineCount) {
          continue
        }
        
        const processedLine: ProcessedLine = {
          line_number: lineNumber,
          content: null,
          raw_text: line
        }
        
        try {
          // JSON 파싱 시도
          const json = JSON.parse(line)
          processedLine.content = json
          
          // Claude Code JSONL 구조에서 메타데이터 추출
          if (json.type) {
            processedLine.message_type = json.type
          }
          if (json.role) {
            processedLine.message_type = json.role
          }
          if (json.timestamp) {
            processedLine.message_timestamp = json.timestamp
            // 타임스탬프를 파싱하여 최소/최대 날짜 추적
            try {
              const timestamp = new Date(json.timestamp)
              if (!isNaN(timestamp.getTime())) {
                if (!minTimestamp || timestamp < minTimestamp) {
                  minTimestamp = timestamp
                }
                if (!maxTimestamp || timestamp > maxTimestamp) {
                  maxTimestamp = timestamp
                }
              }
            } catch (e) {
              // 타임스탬프 파싱 실패 무시
            }
          }
          if (json.metadata) {
            processedLine.metadata = json.metadata
          }
          
          processedCount++
          newLines++
        } catch (e) {
          // JSON 파싱 실패 시 raw text로 저장
          errorCount++
          console.warn(`Line ${lineNumber} is not valid JSON:`, e)
        }
        
        batch.push(processedLine)
        
        // 배치 크기에 도달하면 삽입
        if (batch.length >= BATCH_SIZE) {
          console.log(`Inserting batch of ${batch.length} lines...`)
          await this.insertBatch(batch, sessionId, uploadId)
          batch.length = 0
          
          // UPDATE_FREQUENCY 간격으로 진행 상황 업데이트
          if (lineNumber - lastUpdateLine >= UPDATE_FREQUENCY) {
            await this.supabase
              .from('project_sessions')
              .update({ processed_lines: lineNumber })
              .eq('id', sessionId)
            lastUpdateLine = lineNumber
            console.log(`Progress update: ${lineNumber}/${lines.length} lines processed`)
          }
        }
      }
      
      // 남은 배치 삽입
      if (batch.length > 0) {
        console.log(`Inserting final batch of ${batch.length} lines...`)
        await this.insertBatch(batch, sessionId, uploadId)
      }
      
      // 처리 완료 상태 업데이트
      const updateData: any = { 
        processing_status: 'completed',
        processed_lines: lines.length,
        session_count: lines.length
      }
      
      // 세션 날짜 정보 추가
      if (minTimestamp) {
        updateData.session_start_date = minTimestamp.toISOString().split('T')[0]
      }
      if (maxTimestamp) {
        updateData.session_end_date = maxTimestamp.toISOString().split('T')[0]
      }
      
      await this.supabase
        .from('project_sessions')
        .update(updateData)
        .eq('id', sessionId)
      
      console.log(`Processed ${processedCount} lines, ${newLines} new, ${errorCount} errors`)
      
      return {
        success: true,
        processedLines: processedCount,
        errors: errorCount,
        newLines: newLines,
        error: undefined,
        sessionDates: {
          start: minTimestamp ? minTimestamp.toISOString() : null,
          end: maxTimestamp ? maxTimestamp.toISOString() : null
        }
      }
      
    } catch (error) {
      console.error('Error processing JSONL file:', error)
      
      // 에러 상태 업데이트
      await this.supabase
        .from('project_sessions')
        .update({ 
          processing_status: 'error',
          processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', sessionId)
      
      return {
        success: false,
        processedLines: processedCount,
        errors: errorCount,
        newLines: newLines,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * 스트리밍 방식으로 큰 파일 처리
   */
  async processLargeJSONLFile(
    fileContent: string,
    sessionId: string,
    uploadId: string,
    existingLineCount: number = 0
  ): Promise<{ success: boolean; processedLines: number; errors: number; newLines: number; error?: string }> {
    console.log('Processing large file with streaming approach...')
    
    // 청크 단위로 처리
    const CHUNK_SIZE = 1000 // 1000줄씩 처리
    const lines = fileContent.split('\n').filter(line => line.trim())
    let processedCount = 0
    let errorCount = 0
    let newLines = 0
    
    try {
      await this.supabase
        .from('project_sessions')
        .update({ 
          processing_status: 'processing',
          processed_lines: existingLineCount 
        })
        .eq('id', sessionId)
      
      // 청크별로 처리
      for (let chunkStart = existingLineCount; chunkStart < lines.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, lines.length)
        const chunkLines = lines.slice(chunkStart, chunkEnd)
        const batch: ProcessedLine[] = []
        
        for (let i = 0; i < chunkLines.length; i++) {
          const line = chunkLines[i].trim()
          if (!line) continue
          
          const lineNumber = chunkStart + i + 1
          
          let processedLine: ProcessedLine = {
            line_number: lineNumber,
            content: null,
            raw_text: line
          }
          
          try {
            const json = JSON.parse(line)
            processedLine.content = json
            
            if (json.type) processedLine.message_type = json.type
            if (json.role) processedLine.message_type = json.role
            if (json.timestamp) processedLine.message_timestamp = json.timestamp
            if (json.metadata) processedLine.metadata = json.metadata
            
            processedCount++
            newLines++
          } catch (e) {
            errorCount++
          }
          
          batch.push(processedLine)
        }
        
        // 청크 단위로 배치 삽입
        if (batch.length > 0) {
          await this.insertBatch(batch, sessionId, uploadId)
          console.log(`Processed chunk: ${chunkStart}-${chunkEnd} (${batch.length} lines)`)
        }
        
        // 청크마다 진행 상황 업데이트
        if (chunkEnd % 5000 === 0 || chunkEnd === lines.length) {
          await this.supabase
            .from('project_sessions')
            .update({ processed_lines: chunkEnd })
            .eq('id', sessionId)
        }
        
        // 메모리 압박 방지를 위한 가비지 컬렉션 힌트
        if (global.gc && chunkEnd % 10000 === 0) {
          global.gc()
        }
      }
      
      // 최종 상태 업데이트
      await this.supabase
        .from('project_sessions')
        .update({ 
          processing_status: 'completed',
          processed_lines: lines.length,
          session_count: lines.length
        })
        .eq('id', sessionId)
      
      return {
        success: true,
        processedLines: processedCount,
        errors: errorCount,
        newLines: newLines
      }
    } catch (error) {
      console.error('Error in streaming processing:', error)
      
      await this.supabase
        .from('project_sessions')
        .update({ 
          processing_status: 'error',
          processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', sessionId)
      
      return {
        success: false,
        processedLines: processedCount,
        errors: errorCount,
        newLines: newLines,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * 배치 데이터를 DB에 삽입 (새로운 줄만 INSERT)
   */
  private async insertBatch(
    batch: ProcessedLine[],
    sessionId: string,
    uploadId: string
  ): Promise<void> {
    console.log(`Preparing to insert ${batch.length} records...`)
    const records = batch.map(line => ({
      upload_id: uploadId, // sessionId와 동일
      file_id: sessionId, // 호환성을 위해 유지, 실제로는 sessionId
      line_number: line.line_number,
      content: line.content,
      raw_text: line.raw_text,
      message_type: line.message_type,
      message_timestamp: line.message_timestamp,
      metadata: line.metadata
    }))
    
    console.log('Sample record:', records[0])
    
    // INSERT only (upsert 대신 insert 사용)
    console.log('Inserting records to session_lines...')
    const { error } = await this.supabase
      .from('session_lines')
      .insert(records)
    
    if (error) {
      console.error('Error inserting batch:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    } else {
      console.log(`Successfully inserted ${records.length} records`)
    }
  }
  
  /**
   * 세션의 처리 상태 확인
   */
  async getProcessingStatus(sessionId: string): Promise<{
    status: string
    processedLines: number
    error?: string
  } | null> {
    const { data, error } = await this.supabase
      .from('project_sessions')
      .select('processing_status, processed_lines, processing_error')
      .eq('id', sessionId)
      .single()
    
    if (error) {
      console.error('Error getting processing status:', error)
      return null
    }
    
    return {
      status: data.processing_status || 'pending',
      processedLines: data.processed_lines || 0,
      error: data.processing_error
    }
  }
}