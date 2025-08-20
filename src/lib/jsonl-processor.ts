import { createClient } from '@/lib/supabase/client'

interface ProcessedLine {
  line_number: number
  content: any | null
  raw_text: string
  message_type?: string
  message_timestamp?: string
  metadata?: any
}

export class JSONLProcessor {
  private supabase = createClient()
  
  /**
   * JSONL 파일 내용을 파싱하고 DB에 저장
   */
  async processJSONLFile(
    fileContent: string,
    fileId: string,
    uploadId: string
  ): Promise<{ success: boolean; processedLines: number; errors: number }> {
    const lines = fileContent.split('\n').filter(line => line.trim())
    const batch: ProcessedLine[] = []
    let processedCount = 0
    let errorCount = 0
    
    try {
      // 파일 처리 상태를 'processing'으로 업데이트
      await this.supabase
        .from('uploaded_files')
        .update({ 
          processing_status: 'processing',
          processed_lines: 0 
        })
        .eq('id', fileId)
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        let processedLine: ProcessedLine = {
          line_number: i + 1,
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
        } catch (e) {
          // JSON 파싱 실패 시 raw text로 저장
          errorCount++
          console.warn(`Line ${i + 1} is not valid JSON:`, e)
        }
        
        batch.push(processedLine)
        
        // 100개씩 배치 삽입
        if (batch.length >= 100) {
          await this.insertBatch(batch, fileId, uploadId)
          batch.length = 0
          
          // 진행 상황 업데이트
          await this.supabase
            .from('uploaded_files')
            .update({ processed_lines: i + 1 })
            .eq('id', fileId)
        }
      }
      
      // 남은 배치 삽입
      if (batch.length > 0) {
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
      
      return {
        success: true,
        processedLines: processedCount,
        errors: errorCount
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
        errors: errorCount
      }
    }
  }
  
  /**
   * 배치 데이터를 DB에 삽입
   */
  private async insertBatch(
    batch: ProcessedLine[],
    fileId: string,
    uploadId: string
  ): Promise<void> {
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
    
    const { error } = await this.supabase
      .from('session_lines')
      .upsert(records, {
        onConflict: 'file_id,line_number'
      })
    
    if (error) {
      console.error('Error inserting batch:', error)
      throw error
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