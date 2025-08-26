"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Activity, 
  FolderOpen, 
  MessageSquare, 
  Clock,
  TrendingUp,
  Users,
  FileText,
  Eye,
  ArrowRight
} from "lucide-react"
import { useLocaleStore } from "@/lib/locale-store"
import { useTranslation } from "@/lib/translations"

export default function DashboardPage() {
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  
  const myStats = [
    {
      title: t.dashboard.stats.thisWeek,
      value: "24",
      description: t.dashboard.stats.promptsCreated,
      icon: FileText,
      trend: locale === 'ko' ? "+8 지난주 대비" : "+8 from last week"
    },
    {
      title: t.dashboard.stats.thisMonth,
      value: "156",
      description: t.dashboard.stats.totalPrompts,
      icon: Activity,
      trend: `92% ${t.dashboard.stats.completionRate}`
    },
    {
      title: t.dashboard.stats.reviewsGiven,
      value: "18",
      description: t.dashboard.stats.toTeamMembers,
      icon: MessageSquare,
      trend: `5 ${t.dashboard.stats.thisWeekCount}`
    },
    {
      title: t.dashboard.stats.reviewsReceived,
      value: "12",
      description: t.dashboard.stats.onYourPrompts,
      icon: Users,
      trend: `3 ${t.dashboard.stats.pendingResponse}`
    }
  ]

  const recentTeamProjects = [
    { 
      user: locale === 'ko' ? "김철수" : "Alex Kim", 
      project: locale === 'ko' ? "이커머스 플랫폼" : "E-commerce Platform", 
      description: locale === 'ko' ? "Stripe 연동 결제 프로세스 구축" : "Building checkout flow with Stripe integration",
      prompts: 45, 
      lastUpdate: locale === 'ko' ? "2시간 전" : "2 hours ago",
      reviewable: true 
    },
    { 
      user: locale === 'ko' ? "이영희" : "Sarah Chen", 
      project: locale === 'ko' ? "AI 챗봇" : "AI Chatbot", 
      description: locale === 'ko' ? "고객 지원용 LLM 응답 최적화" : "Fine-tuning LLM responses for customer support",
      prompts: 23, 
      lastUpdate: locale === 'ko' ? "5시간 전" : "5 hours ago",
      reviewable: true 
    },
    { 
      user: locale === 'ko' ? "박민수" : "Mike Johnson", 
      project: locale === 'ko' ? "데이터 파이프라인" : "Data Pipeline", 
      description: locale === 'ko' ? "Python을 활용한 ETL 프로세스 최적화" : "ETL process optimization with Python",
      prompts: 67, 
      lastUpdate: locale === 'ko' ? "1일 전" : "1 day ago",
      reviewable: false 
    },
    { 
      user: locale === 'ko' ? "정수진" : "Emma Wilson", 
      project: locale === 'ko' ? "모바일 앱" : "Mobile App", 
      description: locale === 'ko' ? "React Native 성능 개선" : "React Native performance improvements",
      prompts: 12, 
      lastUpdate: locale === 'ko' ? "2일 전" : "2 days ago",
      reviewable: true 
    },
  ]

  const pendingReviews = [
    { 
      reviewer: locale === 'ko' ? "김철수" : "Alex Kim", 
      prompt: locale === 'ko' ? "React에서 Error Boundary를 올바르게 구현하는 방법?" : "How to implement proper error boundaries in React?", 
      project: locale === 'ko' ? "이커머스 플랫폼" : "E-commerce Platform",
      time: locale === 'ko' ? "10분 전" : "10 min ago",
      comment: locale === 'ko' ? "fallback UI가 포함된 ErrorBoundary 컴포넌트 사용을 고려해보세요..." : "Consider using ErrorBoundary component with fallback UI..."
    },
    { 
      reviewer: locale === 'ko' ? "이영희" : "Sarah Chen", 
      prompt: locale === 'ko' ? "Next.js 14에서 상태 관리 베스트 프랙티스?" : "Best practices for state management in Next.js 14?", 
      project: locale === 'ko' ? "대시보드 리디자인" : "Dashboard Redesign",
      time: locale === 'ko' ? "1시간 전" : "1 hour ago",
      comment: locale === 'ko' ? "Zustand를 사용해보셨나요? Redux보다 가볍습니다..." : "Have you tried Zustand? It's lighter than Redux..."
    },
    { 
      reviewer: locale === 'ko' ? "박민수" : "Mike Johnson", 
      prompt: locale === 'ko' ? "map 함수에서 async/await가 작동하지 않는 문제 디버깅" : "Debug async/await not working in map function", 
      project: locale === 'ko' ? "API 통합" : "API Integration",
      time: locale === 'ko' ? "3시간 전" : "3 hours ago",
      comment: locale === 'ko' ? "map과 함께 비동기 작업을 하려면 Promise.all()을 사용해야 합니다..." : "You need to use Promise.all() with map for async operations..."
    },
  ]

  const recentPrompts = [
    {
      user: locale === 'ko' ? "나" : "You",
      prompt: locale === 'ko' ? "디바운스된 검색 입력을 위한 커스텀 훅 생성" : "Create a custom hook for debounced search input",
      project: locale === 'ko' ? "검색 기능" : "Search Feature",
      time: locale === 'ko' ? "1시간 전" : "1 hour ago",
      reviews: 2
    },
    {
      user: locale === 'ko' ? "김철수" : "Alex Kim",
      prompt: locale === 'ko' ? "Intersection Observer로 무한 스크롤 구현" : "Implement infinite scroll with intersection observer",
      project: locale === 'ko' ? "제품 갤러리" : "Product Gallery",
      time: locale === 'ko' ? "2시간 전" : "2 hours ago",
      reviews: 3
    },
    {
      user: locale === 'ko' ? "이영희" : "Sarah Chen",
      prompt: locale === 'ko' ? "GitHub Actions로 CI/CD 파이프라인 구축" : "Set up CI/CD pipeline with GitHub Actions",
      project: locale === 'ko' ? "DevOps 설정" : "DevOps Setup",
      time: locale === 'ko' ? "3시간 전" : "3 hours ago",
      reviews: 1
    },
    {
      user: locale === 'ko' ? "정수진" : "Emma Wilson",
      prompt: locale === 'ko' ? "React Native FlatList 성능 최적화" : "Optimize React Native FlatList performance",
      project: locale === 'ko' ? "모바일 앱" : "Mobile App",
      time: locale === 'ko' ? "5시간 전" : "5 hours ago",
      reviews: 4
    },
  ]

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
            <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {myStats.map((stat) => (
            <Card key={stat.title} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-border/50">
            <CardHeader>
              <CardTitle>{t.dashboard.teamProjects.title}</CardTitle>
              <CardDescription>{t.dashboard.teamProjects.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTeamProjects.map((project, index) => (
                  <div key={index} className="flex items-start justify-between pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">
                          {project.user.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{project.project}</p>
                          {project.reviewable && (
                            <Badge variant="outline" className="text-xs">{t.dashboard.teamProjects.openForReview}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {project.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.prompts} {t.dashboard.teamProjects.prompts} • {project.lastUpdate} • {t.dashboard.teamProjects.by} {project.user}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t.dashboard.reviewsForYou.title}</CardTitle>
                <CardDescription>{t.dashboard.reviewsForYou.subtitle}</CardDescription>
              </div>
              <Badge variant="destructive" className="text-xs">3 {t.dashboard.reviewsForYou.new}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingReviews.map((review, index) => (
                  <div key={index} className="space-y-2 pb-3 border-b last:border-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {review.reviewer.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">{review.reviewer}</p>
                          <p className="text-xs text-muted-foreground">{review.time}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-medium line-clamp-1">"{review.prompt}"</p>
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      {review.comment}
                    </p>
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full">
                      {t.common.viewAndRespond}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>{t.dashboard.recentPrompts.title}</CardTitle>
            <CardDescription>{t.dashboard.recentPrompts.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all">{t.dashboard.recentPrompts.tabs.all}</TabsTrigger>
                <TabsTrigger value="reviewed">{t.dashboard.recentPrompts.tabs.reviewed}</TabsTrigger>
                <TabsTrigger value="mine">{t.dashboard.recentPrompts.tabs.mine}</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {recentPrompts.map((prompt, index) => (
                    <div key={index} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {prompt.user === "나" || prompt.user === "You" ? "ME" : prompt.user.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium line-clamp-2">{prompt.prompt}</p>
                          <p className="text-xs text-muted-foreground">
                            {prompt.project} • {prompt.time}
                          </p>
                          <div className="flex items-center gap-3">
                            {prompt.reviews > 0 && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span className="text-xs">{prompt.reviews} {t.dashboard.recentPrompts.reviews}</span>
                              </div>
                            )}
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                              {t.common.viewPrompt} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="reviewed" className="space-y-4">
                <div className="space-y-3">
                  {recentPrompts
                    .sort((a, b) => b.reviews - a.reviews)
                    .slice(0, 3)
                    .map((prompt, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge className="text-xs">{prompt.reviews}</Badge>
                          <div>
                            <p className="text-sm font-medium line-clamp-1">{prompt.prompt}</p>
                            <p className="text-xs text-muted-foreground">
                              {prompt.user} • {prompt.project}
                            </p>
                          </div>
                        </div>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="mine" className="space-y-4">
                <div className="space-y-3">
                  {recentPrompts
                    .filter(p => p.user === "나" || p.user === "You")
                    .map((prompt, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{prompt.prompt}</p>
                          <p className="text-xs text-muted-foreground">
                            {prompt.project} • {prompt.time}
                          </p>
                        </div>
                        <Badge variant={prompt.reviews > 0 ? "default" : "outline"} className="text-xs">
                          {prompt.reviews} {t.dashboard.recentPrompts.reviews}
                        </Badge>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}