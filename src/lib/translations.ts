export const translations = {
  en: {
    common: {
      dashboard: "Dashboard",
      upload: "Upload",
      settings: "Settings",
      team: "Team",
      reviews: "Reviews",
      projects: "Projects",
      search: "Search projects, sessions...",
      profile: "Profile",
      logout: "Log out",
      viewMore: "View more",
      viewPrompt: "View prompt",
      viewAndRespond: "View & Respond",
      new: "New"
    },
    sidebar: {
      title: "Vibe Review",
      dashboard: "Dashboard",
      myPrompts: "My Prompts",
      teamProjects: "Team Projects",
      reviews: "Reviews",
      upload: "Upload",
      team: "Team",
      settings: "Settings",
      uploadHistory: "Upload History"
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Your prompt engineering workspace and team collaboration hub",
      uploadHistory: "Upload History",
      stats: {
        thisWeek: "This Week",
        thisMonth: "This Month",
        reviewsGiven: "Reviews Given",
        reviewsReceived: "Reviews Received",
        promptsCreated: "Prompts created",
        totalPrompts: "Total prompts",
        toTeamMembers: "To team members",
        onYourPrompts: "On your prompts",
        completionRate: "completion rate",
        fromLastWeek: "from last week",
        thisWeekCount: "this week",
        pendingResponse: "pending response"
      },
      teamProjects: {
        title: "Recent Team Projects",
        subtitle: "Explore and review your team's Claude Code prompts",
        openForReview: "Open for review",
        prompts: "prompts",
        by: "by"
      },
      reviewsForYou: {
        title: "Reviews for You",
        subtitle: "Feedback on your prompts",
        new: "new"
      },
      recentPrompts: {
        title: "Recent Prompts from Team",
        subtitle: "Latest prompts shared for review",
        tabs: {
          all: "All Prompts",
          reviewed: "Most Reviewed",
          mine: "My Prompts"
        },
        reviews: "reviews"
      }
    }
  },
  ko: {
    common: {
      dashboard: "대시보드",
      upload: "업로드",
      settings: "설정",
      team: "팀",
      reviews: "리뷰",
      projects: "프로젝트",
      search: "프로젝트, 세션 검색...",
      profile: "프로필",
      logout: "로그아웃",
      viewMore: "더보기",
      viewPrompt: "프롬프트 보기",
      viewAndRespond: "보기 & 답변",
      new: "신규"
    },
    sidebar: {
      title: "바이브 리뷰",
      dashboard: "대시보드",
      myPrompts: "내 프롬프트",
      teamProjects: "팀 프로젝트",
      reviews: "리뷰",
      upload: "업로드",
      team: "팀",
      settings: "설정",
      uploadHistory: "히스토리 업로드"
    },
    dashboard: {
      title: "대시보드",
      subtitle: "프롬프트 엔지니어링 워크스페이스 및 팀 협업 허브",
      uploadHistory: "히스토리 업로드",
      stats: {
        thisWeek: "이번 주",
        thisMonth: "이번 달",
        reviewsGiven: "작성한 리뷰",
        reviewsReceived: "받은 리뷰",
        promptsCreated: "작성한 프롬프트",
        totalPrompts: "총 프롬프트",
        toTeamMembers: "팀원에게",
        onYourPrompts: "내 프롬프트에",
        completionRate: "완료율",
        fromLastWeek: "지난주 대비",
        thisWeekCount: "이번 주",
        pendingResponse: "응답 대기 중"
      },
      teamProjects: {
        title: "최근 팀 프로젝트",
        subtitle: "팀의 Claude Code 프롬프트를 탐색하고 리뷰하세요",
        openForReview: "리뷰 가능",
        prompts: "프롬프트",
        by: "작성자"
      },
      reviewsForYou: {
        title: "받은 리뷰",
        subtitle: "내 프롬프트에 대한 피드백",
        new: "신규"
      },
      recentPrompts: {
        title: "팀의 최근 프롬프트",
        subtitle: "리뷰를 위해 공유된 최신 프롬프트",
        tabs: {
          all: "전체 프롬프트",
          reviewed: "리뷰 많은 순",
          mine: "내 프롬프트"
        },
        reviews: "리뷰"
      }
    }
  }
}

export type TranslationKey = typeof translations.en

export function useTranslation(locale: 'en' | 'ko') {
  return translations[locale]
}