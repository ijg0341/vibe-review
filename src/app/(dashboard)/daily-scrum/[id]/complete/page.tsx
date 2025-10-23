"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Home, List } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface Participant {
  id: string;
  user_id: string;
  today_plan?: string;
  status: string;
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
  status: string;
  started_at: string;
  completed_at?: string;
}

const motivationalMessages = [
  "오늘도 화이팅! 🚀",
  "멋진 하루 되세요! ✨",
  "함께 성장하는 팀! 💪",
  "오늘도 최고의 팀워크! 🎯",
  "좋은 하루 시작하세요! ☀️",
];

export default function DailyScrumCompletePage() {
  const router = useRouter();
  const params = useParams();
  const scrumId = params.id as string;

  const [scrum, setScrum] = useState<DailyScrum | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [completing, setCompleting] = useState(false);
  const [message] = useState(
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );

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

        if (!data.data?.scrum) {
          console.error("Scrum not found in response");
          alert("스크럼을 찾을 수 없습니다");
          router.push("/daily-scrum");
          return;
        }

        setScrum(data.data.scrum);
        setParticipants(data.data.participants || []);
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
    }
  };

  const handleComplete = async () => {
    setCompleting(true);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-scrums/${scrumId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
        },
        body: JSON.stringify({
          status: "completed",
        }),
      });

      router.push("/daily-scrum");
    } catch (error) {
      console.error("Failed to complete scrum:", error);
      alert("완료 처리 중 오류가 발생했습니다");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {!scrum ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : (
          <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-6 py-8">
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>

        <div>
          <h1 className="text-4xl font-bold mb-2">데일리 스크럼 완료!</h1>
          <p className="text-xl text-muted-foreground">{message}</p>
        </div>

        <div className="text-lg">
          <span className="text-muted-foreground">
            {scrum.meeting_date
              ? format(parseISO(scrum.meeting_date), "yyyy년 M월 d일", {
                  locale: ko,
                })
              : "날짜 정보 없음"}
          </span>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">참여자 목록</h2>
        <div className="space-y-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
            >
              <Avatar>
                <AvatarImage src={participant.user.avatar_url} />
                <AvatarFallback>
                  {participant.user.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="font-medium">{participant.user.full_name}</div>
                {participant.today_plan && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {participant.today_plan}
                  </div>
                )}
              </div>

              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3 justify-center pt-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <Home className="mr-2 h-4 w-4" />
          대시보드로
        </Button>
        <Button onClick={handleComplete} disabled={completing}>
          <List className="mr-2 h-4 w-4" />
          {completing ? "처리 중..." : "목록으로"}
        </Button>
      </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
