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
  
  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClientClient()
  }
  
  /**
   * JSONL 파일 내용을 파싱하고 DB에 저장 (증분 업데이트 지원)
   */
  async processJSONLFile(
    fileContent: string,
    fileId: string,
    uploadId: string,
    existingLineCount: number = 0
  ): Promise<{ success: boolean; processedLines: number; errors: number; newLines: number }> {
    console.log('=== Starting JSONL Processing ===')
    console.log('File ID:', fileId)
    console.log('Upload ID:', uploadId)
    console.log('Existing line count:', existingLineCount)
    
    const lines = fileContent.split('\n').filter(line => line.trim())
    const batch: ProcessedLine[] = []
    let processedCount = 0
    let errorCount = 0
    let newLines = 0
    
    console.log('Total lines in file:', lines.length)
    
    try {
      // 파일 처리 상태를 'processing'으로 업데이트
      console.log('Updating file status to processing...')
      const { error: updateError } = await this.supabase
        .from('uploaded_files')
        .update({ 
          processing_status: 'processing',
          processed_lines: existingLineCount 
        })
        .eq('id', fileId)
      
      console.log('File status update result:', updateError)
      console.log(`Processing file with ${lines.length} total lines, ${existingLineCount} existing lines`)
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const lineNumber = i + 1
        
        // 이미 처리된 라인은 완전히 건너뛰기
        if (lineNumber <= existingLineCount) {
          continue
        }
        
        let processedLine: ProcessedLine = {
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
        
        // 100개씩 배치 삽입
        if (batch.length >= 100) {
          console.log(`Inserting batch of ${batch.length} lines...`)
          await this.insertBatch(batch, fileId, uploadId)
          batch.length = 0
          
          // 진행 상황 업데이트
          await this.supabase
            .from('uploaded_files')
            .update({ processed_lines: lineNumber })
            .eq('id', fileId)
        }
      }
      
      // 남은 배치 삽입
      if (batch.length > 0) {
        console.log(`Inserting final batch of ${batch.length} lines...`)
        await this.insertBatch(batch, fileId, uploadId)
      }
      
      // 처리 완료 상태 업데이트
      await this.supabase
        .from('uploaded_files')
        .update({ 
          processing_status: 'completed',
          processed_lines: lines.length
        })
        .eq('id', fileId)
      
      console.log(`Processed ${processedCount} lines, ${newLines} new, ${errorCount} errors`)
      
      return {
        success: true,
        processedLines: processedCount,
        errors: errorCount,
        newLines: newLines
      }
      
    } catch (error) {
      console.error('Error processing JSONL file:', error)
      
      // 에러 상태 업데이트
      await this.supabase
        .from('uploaded_files')
        .update({ 
          processing_status: 'error',
          processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', fileId)
      
      return {
        success: false,
        processedLines: processedCount,
        errors: errorCount,
        newLines: newLines
      }
    }
  }
  
  /**
   * 배치 데이터를 DB에 삽입 (새로운 줄만 INSERT)
   */
  private async insertBatch(
    batch: ProcessedLine[],
    fileId: string,
    uploadId: string
  ): Promise<void> {
    console.log(`Preparing to insert ${batch.length} records...`)
    const records = batch.map(line => ({
      upload_id: uploadId,
      file_id: fileId,
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
   * 파일의 처리 상태 확인
   */
  async getProcessingStatus(fileId: string): Promise<{
    status: string
    processedLines: number
    error?: string
  } | null> {
    const { data, error } = await this.supabase
      .from('uploaded_files')
      .select('processing_status, processed_lines, processing_error')
      .eq('id', fileId)
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