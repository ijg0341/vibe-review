"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Folder,
  Trash2,
} from "lucide-react";
import { WorkCategoryChart } from "@/components/ai-summary/WorkCategoryChart";
import { ProjectTodoList } from "@/components/ai-summary/ProjectTodoList";
import { QualityScore } from "@/components/ai-summary/QualityScore";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface Participant {
  id: string;
  scrum_id: string;
  user_id: string;
  order_index: number;
  yesterday_summary?: string;
  today_plan?: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  user: {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

interface DailyScrum {
  id: string;
  meeting_date: string;
  status: "in_progress" | "completed" | "cancelled";
  started_at: string;
  completed_at?: string;
}

export default function DailyScrumMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const scrumId = params.id as string;

  const [scrum, setScrum] = useState<DailyScrum | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [todayPlan, setTodayPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchScrumData();
  }, [scrumId]);

  const fetchScrumData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-scrums/${scrumId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Scrum data:", data);
        console.log("Scrum object:", data.data?.scrum);
        console.log("Participants:", data.data?.participants);

        if (!data.data?.scrum || Object.keys(data.data.scrum).length === 0) {
          console.error("Scrum not found or empty in response", data.data);
          alert("스크럼 데이터가 비어있습니다. API 서버를 확인해주세요.");
          router.push("/daily-scrum");
          return;
        }

        setScrum(data.data.scrum);
        setParticipants(data.data.participants || []);

        // 현재 진행 중인 참여자 찾기
        const inProgressIdx = data.data.participants.findIndex(
          (p: Participant) => p.status === "in_progress"
        );
        if (inProgressIdx >= 0) {
          setCurrentIndex(inProgressIdx);
          setTodayPlan(data.data.participants[inProgressIdx].today_plan || "");
        } else {
          // 첫 번째 pending 참여자 찾기
          const pendingIdx = data.data.participants.findIndex(
            (p: Participant) => p.status === "pending"
          );
          if (pendingIdx >= 0) {
            setCurrentIndex(pendingIdx);
            updateParticipantStatus(
              data.data.participants[pendingIdx].id,
              "in_progress"
            );
          }
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to fetch scrum:", errorData);
        alert(`스크럼을 불러올 수 없습니다: ${errorData.error || res.statusText}`);
        router.push("/daily-scrum");
      }
    } catch (error) {
      console.error("Failed to fetch scrum:", error);
      alert("스크럼을 불러오는 중 오류가 발생했습니다");
      router.push("/daily-scrum");
    } finally {
      setLoading(false);
    }
  };

  const updateParticipantStatus = async (
    participantId: string,
    status: string
  ) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/daily-scrums/${scrumId}/participants/${participantId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
          },
          body: JSON.stringify({ status }),
        }
      );
    } catch (error) {
      console.error("Failed to update participant status:", error);
    }
  };

  const handleSaveAndNext = async () => {
    const current = participants[currentIndex];
    if (!current) return;

    setSaving(true);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-scrums/${scrumId}/participants/${current.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
        },
        body: JSON.stringify({
          today_plan: todayPlan,
          status: "completed",
        }),
      });

      // 다음 참여자로 이동
      const nextIndex = currentIndex + 1;
      if (nextIndex < participants.length) {
        setCurrentIndex(nextIndex);
        setTodayPlan(participants[nextIndex].today_plan || "");
        await updateParticipantStatus(
          participants[nextIndex].id,
          "in_progress"
        );
        fetchScrumData(); // 데이터 새로고침
      } else {
        // 모든 참여자 완료
        router.push(`/daily-scrum/${scrumId}/complete`);
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    const current = participants[currentIndex];
    if (!current || !scrum?.meeting_date) return;

    setGenerating(true);

    try {
      // 어제 날짜 계산
      const meetingDate = new Date(scrum.meeting_date + 'T00:00:00');
      const yesterday = new Date(meetingDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = format(yesterday, "yyyy-MM-dd");

      console.log('[DailyScrum] Generating summary for', current.user_id, yesterdayStr);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/generate-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
        },
        body: JSON.stringify({
          userId: current.user_id,
          date: yesterdayStr,
          forceRegenerate: true,
        }),
      });

      console.log('[DailyScrum] Summary response:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate summary');
      }

      console.log('[DailyScrum] Summary generated successfully');

      // 생성된 요약을 화면에 표시
      await fetchScrumData(); // 데이터 새로고침
    } catch (error) {
      console.error("Failed to generate summary:", error);
      alert("요약 생성 중 오류가 발생했습니다");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 데일리 스크럼을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/daily-scrums/${scrumId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
          },
        }
      );

      if (response.ok) {
        router.push("/daily-scrum");
      } else {
        const error = await response.json();
        alert(error.error || "삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete scrum:", error);
      alert("삭제 중 오류가 발생했습니다");
    }
  };

  const currentParticipant = participants[currentIndex];
  const progress = participants.filter((p) => p.status === "completed").length;
  const isCompleted = scrum?.status === "completed";

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {loading || !scrum ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isCompleted ? (
          // 완료된 스크럼 보기 모드
          <div className="p-8 space-y-6 max-w-5xl mx-auto">
            <div>
              <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로
              </Button>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">데일리 스크럼 (완료)</h1>
                  <p className="text-muted-foreground mt-1">
                    {scrum.meeting_date
                      ? format(parseISO(scrum.meeting_date), "yyyy년 M월 d일", {
                          locale: ko,
                        })
                      : "날짜 정보 없음"}
                  </p>
                </div>

                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>

            {/* 완료된 참여자 목록 */}
            <div className="space-y-4">
              {participants.map((participant) => (
                <Card key={participant.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={participant.user.avatar_url} />
                      <AvatarFallback>
                        {participant.user.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {participant.user.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          @{participant.user.username}
                        </p>
                      </div>

                      {/* 오늘 할 일 */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          오늘 할 일
                        </h4>
                        {participant.today_plan ? (
                          <Card className="p-4 bg-muted/50">
                            <p className="text-sm whitespace-pre-wrap">
                              {participant.today_plan}
                            </p>
                          </Card>
                        ) : (
                          <Card className="p-4 bg-muted/30">
                            <p className="text-sm text-muted-foreground">
                              작성된 계획이 없습니다
                            </p>
                          </Card>
                        )}
                      </div>

                      {/* 어제 한 일 */}
                      {participant.yesterday_summary && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">
                            어제 한 일
                          </h4>
                          <Card className="p-4 bg-muted/50">
                            {(() => {
                              try {
                                const data = JSON.parse(participant.yesterday_summary);

                                let parsedSummary = {};
                                let workCategories = null;
                                let projectTodos = null;
                                let qualityScore = undefined;
                                let qualityScoreExplanation = "";

                                if (data.summary_text) {
                                  const summaryText = JSON.parse(data.summary_text);
                                  parsedSummary = summaryText.summary || {};
                                  workCategories = data.work_categories || summaryText.work_categories;
                                  projectTodos = data.project_todos || summaryText.project_todos;
                                  qualityScore = data.quality_score ?? summaryText.quality_score;
                                  qualityScoreExplanation = data.quality_score_explanation || summaryText.quality_score_explanation;
                                } else {
                                  parsedSummary = data;
                                }

                                return (
                                  <div className="space-y-4">
                                    {parsedSummary && typeof parsedSummary === 'object' && Object.keys(parsedSummary).length > 0 && (
                                      <section>
                                        <h5 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                          📝 오늘의 업무 요약
                                        </h5>
                                        <div className="space-y-2">
                                          {Object.entries(parsedSummary).map(([projectSlug, projectSummary]) => {
                                            const summaryText = typeof projectSummary === 'string'
                                              ? projectSummary
                                              : JSON.stringify(projectSummary);
                                            return (
                                              <div key={projectSlug} className="bg-background rounded-lg p-3 border">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <Folder className="h-3 w-3 text-primary" />
                                                  <h6 className="font-semibold text-xs text-foreground">
                                                    {projectTodos?.[projectSlug]?.project_name || projectSlug}
                                                  </h6>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                                                  {summaryText}
                                                </p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </section>
                                    )}

                                    {projectTodos && Object.keys(projectTodos).length > 0 && <Separator className="my-3" />}

                                    {projectTodos && Object.keys(projectTodos).length > 0 && (
                                      <section>
                                        <h5 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                          ✅ 프로젝트별 작업 내역
                                        </h5>
                                        <ProjectTodoList projectTodos={projectTodos} locale="ko" />
                                      </section>
                                    )}

                                    {workCategories && <Separator className="my-3" />}

                                    {workCategories && (
                                      <section>
                                        <h5 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                          📊 업무 카테고리 분류
                                        </h5>
                                        <WorkCategoryChart workCategories={workCategories} locale="ko" />
                                      </section>
                                    )}

                                    {qualityScore !== undefined && <Separator className="my-3" />}

                                    {qualityScore !== undefined && (
                                      <section>
                                        <h5 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                          ⭐ 프롬프트 품질 점수
                                        </h5>
                                        <QualityScore
                                          qualityScore={qualityScore}
                                          qualityScoreExplanation={qualityScoreExplanation}
                                          locale="ko"
                                        />
                                      </section>
                                    )}
                                  </div>
                                );
                              } catch (error) {
                                console.error("Failed to parse yesterday_summary:", error);
                                return (
                                  <div className="prose prose-sm max-w-none text-foreground">
                                    {participant.yesterday_summary}
                                  </div>
                                );
                              }
                            })()}
                          </Card>
                        </div>
                      )}
                    </div>

                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">데일리 스크럼</h1>
            <p className="text-muted-foreground mt-1">
              {scrum.meeting_date
                ? format(parseISO(scrum.meeting_date), "yyyy년 M월 d일", {
                    locale: ko,
                  })
                : "날짜 정보 없음"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">진행 상황</div>
              <div className="text-2xl font-bold">
                {progress} / {participants.length}
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>
      </div>

      {/* 참여자 진행 상태 표시 */}
      <div className="flex gap-2">
        {participants.map((p, idx) => (
          <div
            key={p.id}
            className={`flex-1 h-2 rounded-full transition-colors ${
              p.status === "completed"
                ? "bg-green-500"
                : idx === currentIndex
                ? "bg-blue-500"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {currentParticipant && (
        <div className="space-y-6">
          {/* 현재 발표자 */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={currentParticipant.user.avatar_url} />
                <AvatarFallback>
                  {currentParticipant.user.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-bold">
                  {currentParticipant.user.full_name}
                </div>
                <div className="text-muted-foreground">
                  @{currentParticipant.user.username}
                </div>
              </div>
            </div>

            {/* 어제 한 일 (AI 요약) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  어제 한 일
                </h3>
                {!currentParticipant.yesterday_summary && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateSummary}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI 요약 생성
                      </>
                    )}
                  </Button>
                )}
              </div>

              {currentParticipant.yesterday_summary ? (
                <Card className="p-4 bg-muted/50">
                  {(() => {
                    try {
                      const data = JSON.parse(currentParticipant.yesterday_summary);

                      // 새 형식: {summary_text, work_categories, project_todos, quality_score, quality_score_explanation}
                      // 구 형식: {project: "summary", ...}
                      let parsedSummary = {};
                      let workCategories = null;
                      let projectTodos = null;
                      let qualityScore = undefined;
                      let qualityScoreExplanation = "";

                      if (data.summary_text) {
                        // 새 형식
                        const summaryText = JSON.parse(data.summary_text);
                        parsedSummary = summaryText.summary || {};
                        workCategories = data.work_categories || summaryText.work_categories;
                        projectTodos = data.project_todos || summaryText.project_todos;
                        qualityScore = data.quality_score ?? summaryText.quality_score;
                        qualityScoreExplanation = data.quality_score_explanation || summaryText.quality_score_explanation;
                      } else {
                        // 구 형식: 단순 프로젝트별 요약만 있음
                        parsedSummary = data;
                      }

                      return (
                        <div className="space-y-4">
                          {/* 1. 오늘의 업무 요약 */}
                          {parsedSummary && typeof parsedSummary === 'object' && Object.keys(parsedSummary).length > 0 && (
                            <section>
                              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                📝 오늘의 업무 요약
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(parsedSummary).map(([projectSlug, projectSummary]) => {
                                  const summaryText = typeof projectSummary === 'string'
                                    ? projectSummary
                                    : JSON.stringify(projectSummary);
                                  return (
                                    <div key={projectSlug} className="bg-background rounded-lg p-3 border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Folder className="h-3 w-3 text-primary" />
                                        <h5 className="font-semibold text-xs text-foreground">
                                          {projectTodos?.[projectSlug]?.project_name || projectSlug}
                                        </h5>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                                        {summaryText}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          )}

                          {projectTodos && Object.keys(projectTodos).length > 0 && <Separator className="my-3" />}

                          {/* 2. 프로젝트별 Todo 리스트 */}
                          {projectTodos && Object.keys(projectTodos).length > 0 && (
                            <section>
                              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                ✅ 프로젝트별 작업 내역
                              </h4>
                              <ProjectTodoList projectTodos={projectTodos} locale="ko" />
                            </section>
                          )}

                          {workCategories && <Separator className="my-3" />}

                          {/* 3. 업무 카테고리 차트 */}
                          {workCategories && (
                            <section>
                              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                📊 업무 카테고리 분류
                              </h4>
                              <WorkCategoryChart workCategories={workCategories} locale="ko" />
                            </section>
                          )}

                          {qualityScore !== undefined && <Separator className="my-3" />}

                          {/* 4. 품질 점수 */}
                          {qualityScore !== undefined && (
                            <section>
                              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                                ⭐ 프롬프트 품질 점수
                              </h4>
                              <QualityScore
                                qualityScore={qualityScore}
                                qualityScoreExplanation={qualityScoreExplanation}
                                locale="ko"
                              />
                            </section>
                          )}
                        </div>
                      );
                    } catch (error) {
                      console.error("Failed to parse yesterday_summary:", error);
                      return (
                        <div className="prose prose-sm max-w-none text-foreground">
                          {currentParticipant.yesterday_summary}
                        </div>
                      );
                    }
                  })()}
                </Card>
              ) : (
                <Card className="p-4 bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">
                    어제 작업 내용이 없습니다. AI 요약을 생성해보세요.
                  </p>
                </Card>
              )}
            </div>

            {/* 오늘 할 일 */}
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold">오늘 할 일</h3>
              <Textarea
                value={todayPlan}
                onChange={(e) => setTodayPlan(e.target.value)}
                placeholder="오늘 계획한 작업을 간단히 작성하세요..."
                className="min-h-[120px]"
              />
            </div>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              나중에 계속하기
            </Button>
            <Button onClick={handleSaveAndNext} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : currentIndex < participants.length - 1 ? (
                <>
                  다음 참여자
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  회의 완료
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
