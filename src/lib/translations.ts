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
    },
    upload: {
      modal: {
        title: "Upload Claude History",
        subtitle: "Upload your Claude Code session history for team collaboration and review",
        select: {
          title: "Select your .claude folder",
          description: "We'll scan for projects and session files automatically",
          button: "Choose .claude Folder",
          scanning: "Scanning...",
          instructions: {
            title: "How to find your .claude folder:",
            windows: "Windows: Type %USERPROFILE%\\.claude in Explorer address bar",
            mac: "Mac: Press Cmd+Shift+. in Finder to show hidden files, then go to ~/.claude",
            alternative: "Alternative: Copy your .claude/projects folder to Desktop first"
          },
          dragDrop: {
            title: "Or drag & drop files here",
            description: "Drop .jsonl files or folders containing .jsonl files",
            active: "Drop files here to upload"
          },
          or: "OR"
        },
        preview: {
          title: "Found {count} projects",
          description: "Select which projects to upload",
          selectAll: "Select All",
          unselectAll: "Unselect All",
          sessions: "sessions",
          readyToUpload: "Ready to upload",
          projects: "projects",
          sessionFiles: "session files",
          startUpload: "Start Upload"
        },
        uploading: {
          title: "Uploading your projects...",
          description: "Please don't close this window",
          progress: "Progress",
          uploadedFiles: "Uploaded {count} of {total} files"
        },
        complete: {
          title: "Upload Complete!",
          description: "Your Claude Code history has been uploaded successfully",
          projects: "Projects",
          sessions: "Sessions",
          close: "Close"
        },
        errors: {
          browserNotSupported: "This browser does not support directory selection. Please use Chrome or Edge.",
          projectsFolderNotFound: "Could not find projects folder in selected directory. Please select the .claude folder.",
          selectionFailed: "Failed to select directory. Please try again.",
          noProjectsSelected: "Please select at least one project to upload."
        }
      }
    },
    auth: {
      login: {
        title: "Vibe Review",
        subtitle: "Sign in to your account to continue",
        email: "Email",
        password: "Password",
        rememberMe: "Remember me",
        forgotPassword: "Forgot password?",
        signIn: "Sign in",
        noAccount: "Don't have an account?",
        signUp: "Sign up",
        loginError: "Invalid email or password"
      },
      signup: {
        title: "Create an account",
        subtitle: "Start collaborating with your team",
        name: "Full name",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm password",
        createAccount: "Create account",
        haveAccount: "Already have an account?",
        signIn: "Sign in",
        passwordMismatch: "Passwords do not match",
        signupError: "Failed to create account",
        termsAgree: "By signing up, you agree to our",
        terms: "Terms of Service",
        and: "and",
        privacy: "Privacy Policy"
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
    },
    upload: {
      modal: {
        title: "클로드 히스토리 업로드",
        subtitle: "팀 협업과 리뷰를 위해 Claude Code 세션 히스토리를 업로드하세요",
        select: {
          title: ".claude 폴더를 선택하세요",
          description: "프로젝트와 세션 파일을 자동으로 스캔합니다",
          button: ".claude 폴더 선택",
          scanning: "스캔 중...",
          instructions: {
            title: ".claude 폴더 찾는 방법:",
            windows: "윈도우: 탐색기 주소창에 %USERPROFILE%\\.claude 입력",
            mac: "맥: Finder에서 Cmd+Shift+. 눌러 숨김파일 표시 후 ~/.claude 이동",
            alternative: "또는: .claude/projects 폴더를 바탕화면에 복사한 후 선택"
          },
          dragDrop: {
            title: "또는 여기로 파일을 드래그하세요",
            description: ".jsonl 파일이나 .jsonl 파일이 포함된 폴더를 드롭하세요",
            active: "여기에 파일을 드롭하여 업로드"
          },
          or: "또는"
        },
        preview: {
          title: "{count}개의 프로젝트를 찾았습니다",
          description: "업로드할 프로젝트를 선택하세요",
          selectAll: "모두 선택",
          unselectAll: "모두 해제",
          sessions: "세션",
          readyToUpload: "업로드 준비",
          projects: "프로젝트",
          sessionFiles: "세션 파일",
          startUpload: "업로드 시작"
        },
        uploading: {
          title: "프로젝트를 업로드 중입니다...",
          description: "창을 닫지 마세요",
          progress: "진행률",
          uploadedFiles: "{total}개 중 {count}개 파일 업로드됨"
        },
        complete: {
          title: "업로드 완료!",
          description: "Claude Code 히스토리가 성공적으로 업로드되었습니다",
          projects: "프로젝트",
          sessions: "세션",
          close: "닫기"
        },
        errors: {
          browserNotSupported: "이 브라우저는 폴더 선택을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.",
          projectsFolderNotFound: "선택한 디렉토리에서 projects 폴더를 찾을 수 없습니다. .claude 폴더를 선택해주세요.",
          selectionFailed: "디렉토리 선택에 실패했습니다. 다시 시도해주세요.",
          noProjectsSelected: "업로드할 프로젝트를 최소 하나는 선택해주세요."
        }
      }
    },
    auth: {
      login: {
        title: "Vibe Review",
        subtitle: "계속하려면 계정에 로그인하세요",
        email: "이메일",
        password: "비밀번호",
        rememberMe: "로그인 상태 유지",
        forgotPassword: "비밀번호를 잊으셨나요?",
        signIn: "로그인",
        noAccount: "계정이 없으신가요?",
        signUp: "회원가입",
        loginError: "이메일 또는 비밀번호가 올바르지 않습니다"
      },
      signup: {
        title: "계정 만들기",
        subtitle: "팀과 협업을 시작하세요",
        name: "이름",
        email: "이메일",
        password: "비밀번호",
        confirmPassword: "비밀번호 확인",
        createAccount: "계정 만들기",
        haveAccount: "이미 계정이 있으신가요?",
        signIn: "로그인",
        passwordMismatch: "비밀번호가 일치하지 않습니다",
        signupError: "계정 생성에 실패했습니다",
        termsAgree: "회원가입 시",
        terms: "이용약관",
        and: "및",
        privacy: "개인정보처리방침"
      }
    }
  }
}

export type TranslationKey = typeof translations.en

export function useTranslation(locale: 'en' | 'ko') {
  return translations[locale]
}