"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity, 
  FolderOpen, 
  MessageSquare, 
  Upload,
  Clock,
  TrendingUp,
  Users,
  FileText
} from "lucide-react"

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Projects",
      value: "12",
      description: "Active projects",
      icon: FolderOpen,
      trend: "+2 from last week"
    },
    {
      title: "Sessions",
      value: "248",
      description: "Total sessions uploaded",
      icon: FileText,
      trend: "+48 this week"
    },
    {
      title: "Reviews",
      value: "36",
      description: "Pending reviews",
      icon: MessageSquare,
      trend: "8 new today"
    },
    {
      title: "Collaborators",
      value: "8",
      description: "Active team members",
      icon: Users,
      trend: "+1 this month"
    }
  ]

  const recentProjects = [
    { name: "secondteam-agent", sessions: 45, lastUpdated: "2 hours ago", status: "active" },
    { name: "vibework-base", sessions: 23, lastUpdated: "5 hours ago", status: "active" },
    { name: "careerly-v2", sessions: 67, lastUpdated: "1 day ago", status: "idle" },
    { name: "shadowcabinet", sessions: 12, lastUpdated: "3 days ago", status: "archived" },
  ]

  const recentActivity = [
    { type: "upload", user: "You", action: "uploaded 3 sessions", project: "secondteam-agent", time: "10 min ago" },
    { type: "review", user: "John Doe", action: "reviewed your code", project: "vibework-base", time: "1 hour ago" },
    { type: "comment", user: "Jane Smith", action: "commented on session", project: "careerly-v2", time: "2 hours ago" },
    { type: "upload", user: "You", action: "uploaded new session", project: "secondteam-agent", time: "3 hours ago" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening with your projects.</p>
          </div>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Session
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
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
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your most recently updated projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.sessions} sessions • {project.lastUpdated}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      project.status === "active" ? "default" : 
                      project.status === "idle" ? "secondary" : 
                      "outline"
                    }>
                      {project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 border-border/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {activity.type === "upload" && <Upload className="h-3 w-3" />}
                      {activity.type === "review" && <MessageSquare className="h-3 w-3" />}
                      {activity.type === "comment" && <MessageSquare className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span>{" "}
                        {activity.action} in{" "}
                        <span className="font-medium">{activity.project}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="mr-1 inline-block h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Session Overview</CardTitle>
            <CardDescription>Analyze your Claude Code sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="week" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="day">Today</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
              </TabsList>
              <TabsContent value="day" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">8 Sessions</p>
                    <p className="text-xs text-muted-foreground">Today's activity</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </TabsContent>
              <TabsContent value="week" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">48 Sessions</p>
                    <p className="text-xs text-muted-foreground">This week's activity</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </TabsContent>
              <TabsContent value="month" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">248 Sessions</p>
                    <p className="text-xs text-muted-foreground">This month's activity</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
