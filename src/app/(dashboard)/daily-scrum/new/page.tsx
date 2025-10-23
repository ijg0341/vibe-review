"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface TeamMember {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  role: string;
}

export default function NewDailyScrumPage() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [teamId, setTeamId] = useState<string>("");

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/current/members`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMembers(data.data.members || []);
        setTeamId(data.data.team.id);
      } else {
        console.error("Failed to fetch team members:", await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedIds(newSelected);
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0) {
      alert("최소 1명 이상의 참여자를 선택해주세요");
      return;
    }

    setCreating(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daily-scrums`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("vibereview_token")}`,
        },
        body: JSON.stringify({
          team_id: teamId,
          meeting_date: today,
          participant_ids: Array.from(selectedIds),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/daily-scrum/${data.data.scrum_id}`);
      } else {
        const error = await res.json();
        alert(error.error || "스크럼 생성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create scrum:", error);
      alert("스크럼 생성 중 오류가 발생했습니다");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : (
          <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <h1 className="text-3xl font-bold">새 데일리 스크럼 시작</h1>
        <p className="text-muted-foreground mt-1">
          오늘 회의에 참여할 팀 멤버를 선택하세요
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">팀 멤버</h2>
            <div className="text-sm text-muted-foreground">
              {selectedIds.size}명 선택
            </div>
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => toggleMember(member.id)}
              >
                <Checkbox
                  checked={selectedIds.has(member.id)}
                  onCheckedChange={() => toggleMember(member.id)}
                />

                <Avatar>
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>
                    {member.full_name?.charAt(0) || member.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="font-medium">{member.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    @{member.username}
                  </div>
                </div>

                <div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button
          onClick={handleCreate}
          disabled={selectedIds.size === 0 || creating}
        >
          <Users className="mr-2 h-4 w-4" />
          {creating ? "생성 중..." : `스크럼 시작 (${selectedIds.size}명)`}
        </Button>
      </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
