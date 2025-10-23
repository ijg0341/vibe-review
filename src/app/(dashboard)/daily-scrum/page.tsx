"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Users, Clock, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface DailyScrumSummary {
  id: string;
  team_id: string;
  meeting_date: string;
  status: "in_progress" | "completed" | "cancelled";
  started_at: string;
  completed_at?: string;
  team_name: string;
  creator_name: string;
  participant_count: number;
  completed_participants: number;
}

export default function DailyScrumListPage() {
  const router = useRouter();
  const [scrums, setScrums] = useState<DailyScrumSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScrums();
  }, []);

  const fetchScrums = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-scrums`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setScrums(data.data.scrums || []);
      } else {
        console.error("Failed to fetch scrums:", await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch scrums:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      in_progress: { label: "진행중", className: "bg-blue-100 text-blue-800" },
      completed: { label: "완료", className: "bg-green-100 text-green-800" },
      cancelled: { label: "취소", className: "bg-gray-100 text-gray-800" },
    };
    const badge = badges[status as keyof typeof badges] || badges.in_progress;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : (
          <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">데일리 스크럼</h1>
          <p className="text-muted-foreground mt-1">
            팀 데일리 스크럼 회의 기록을 관리하세요
          </p>
        </div>
        <Button onClick={() => router.push("/daily-scrum/new")}>
          <Plus className="mr-2 h-4 w-4" />
          새 스크럼 시작
        </Button>
      </div>

      {scrums.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">스크럼 기록이 없습니다</h3>
            <p className="text-muted-foreground">
              첫 번째 데일리 스크럼을 시작해보세요
            </p>
            <Button onClick={() => router.push("/daily-scrum/new")}>
              <Plus className="mr-2 h-4 w-4" />
              새 스크럼 시작
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scrums.map((scrum) => (
            <Card
              key={scrum.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/daily-scrum/${scrum.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-lg">
                      {format(parseISO(scrum.meeting_date), "yyyy년 M월 d일", {
                        locale: ko,
                      })}
                    </span>
                    {getStatusBadge(scrum.status)}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {scrum.participant_count}명 참여 (
                        {scrum.completed_participants}명 완료)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(parseISO(scrum.started_at), "HH:mm")} 시작
                      </span>
                    </div>

                    {scrum.completed_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>
                          {format(parseISO(scrum.completed_at), "HH:mm")} 완료
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">진행자:</span>{" "}
                    <span className="font-medium">{scrum.creator_name}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
