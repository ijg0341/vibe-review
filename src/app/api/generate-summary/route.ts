import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Claude API를 직접 호출하는 함수
async function generateWithClaude(prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, date, projectTexts, forceRegenerate = false } = await req.json();

    if (!userId || !date) {
      return NextResponse.json(
        { error: "userId and date are required" },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 강제 재생성이 아닌 경우 캐시된 요약 확인
    if (!forceRegenerate) {
      const { data: cachedSummary, error: cacheError } = await supabase
        .from('ai_summaries')
        .select('summary')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (cachedSummary && !cacheError) {
        return NextResponse.json({ 
          summary: cachedSummary.summary,
          cached: true 
        }, { status: 200 });
      }
    }

    // 프로젝트 텍스트 데이터가 제공되지 않은 경우
    if (!projectTexts || !Array.isArray(projectTexts) || projectTexts.length === 0) {
      return NextResponse.json(
        { summary: "이 날짜에는 작업한 내용이 없습니다." },
        { status: 200 }
      );
    }

    // Claude에게 전달할 프롬프트 생성
    const analysisPrompt = `
다음은 한 사용자가 ${date} 날짜에 프로젝트별로 작성한 모든 사용자 메시지들입니다:

${projectTexts.map(project => {
  // 프로젝트별 메시지 수와 전체 텍스트 길이 계산
  const messages = project.userText.split('\n\n').filter(text => text.trim().length > 0)
  const totalLength = project.userText.length
  const messageCount = messages.length
  
  return `
## 프로젝트: ${project.projectName}
총 ${messageCount}개 프롬프트, 총 ${totalLength}자

${project.userText}
`
}).join('\n')}

위 메시지들을 분석해서 실제로 완료된 작업들을 TODO LIST 형태로 추출해주세요:

## ✅ 오늘 완료한 작업 목록

### 프로젝트별 완료 작업
${projectTexts.map(project => `
**${project.projectName}**
- [ ] [해당 프로젝트에서 완료한 작업 항목들]
`).join('\n')}

**지침:**
1. 각 프롬프트에서 실제로 요청하거나 작업한 구체적인 내용을 추출
2. "버그 수정", "기능 구현", "코드 리팩토링" 등 명확한 작업 단위로 표현
3. 하나의 작업을 완료하는데 몇 번의 프롬프트가 사용되었는지 분석
4. 체크박스(- [ ]) 형태로 TODO 리스트 작성
5. 각 작업 뒤에 해당 작업에 소요된 프롬프트 횟수와 대화량 표시
6. 한국어로 작성하되, 기술 용어는 그대로 유지

**예시 형태:**
- [ ] 사용자 인증 시스템 구현 (프롬프트 5회, 대화량: 많음)
- [ ] 데이터베이스 스키마 최적화 (프롬프트 2회, 대화량: 보통)
- [ ] API 응답 시간 개선 (프롬프트 1회, 대화량: 적음)

**대화량 기준 (프롬프트 개수 + 텍스트 길이 종합 판단):**
- 적음: 1-2개 프롬프트 또는 총 500자 미만
- 보통: 3-5개 프롬프트 또는 총 500-2000자
- 많음: 6개 이상 프롬프트 또는 총 2000자 이상

각 작업에 관련된 프롬프트들의 총 길이와 개수를 모두 고려하여 대화량을 판단하세요.
`;

    // Claude API 호출
    const summary = await generateWithClaude(analysisPrompt);

    // 생성된 요약을 DB에 저장 (upsert)
    const { error: saveError } = await supabase
      .from('ai_summaries')
      .upsert({
        user_id: userId,
        date: date,
        summary: summary,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      });

    if (saveError) {
      console.error('Error saving summary:', saveError);
      // 저장 실패해도 요약은 반환
    }

    return NextResponse.json({ 
      summary,
      cached: false 
    }, { status: 200 });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
