'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Folder, ChevronDown, ChevronRight } from 'lucide-react'

interface TodoItem {
  text: string
  category: 'planning' | 'frontend' | 'backend' | 'qa' | 'devops' | 'research' | 'other'
}

interface ProjectTodo {
  project_id: string | null
  project_name: string
  todos: TodoItem[]
}

interface ProjectTodos {
  [projectSlug: string]: ProjectTodo
}

interface ProjectTodoListProps {
  projectTodos: ProjectTodos
  locale?: 'ko' | 'en'
}

const CATEGORY_CONFIG = {
  planning: { ko: '기획', en: 'Planning', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  frontend: { ko: '프론트', en: 'Frontend', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  backend: { ko: '백엔드', en: 'Backend', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  qa: { ko: 'QA', en: 'QA', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  devops: { ko: 'DevOps', en: 'DevOps', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  research: { ko: '리서치', en: 'Research', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  other: { ko: '기타', en: 'Other', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' }
}

export const ProjectTodoList: React.FC<ProjectTodoListProps> = ({
  projectTodos,
  locale = 'ko'
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(Object.keys(projectTodos))
  )

  const toggleProject = (projectSlug: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectSlug)) {
      newExpanded.delete(projectSlug)
    } else {
      newExpanded.add(projectSlug)
    }
    setExpandedProjects(newExpanded)
  }

  // 데이터가 없는 경우
  if (Object.keys(projectTodos).length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {locale === 'ko' ? '데이터가 없습니다' : 'No data available'}
      </p>
    )
  }

  return (
    <div className="space-y-3">
        {Object.entries(projectTodos).map(([projectSlug, project]) => {
          const isExpanded = expandedProjects.has(projectSlug)

          return (
            <div key={projectSlug} className="border rounded-lg overflow-hidden">
              {/* 프로젝트 헤더 */}
              <div
                className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => toggleProject(projectSlug)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Folder className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">
                    {project.project_name}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {project.todos.length} {locale === 'ko' ? '개' : 'items'}
                </Badge>
              </div>

              {/* Todo 리스트 */}
              {isExpanded && (
                <div className="p-3 space-y-2">
                  {project.todos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {locale === 'ko' ? '작업 내역이 없습니다' : 'No todos'}
                    </p>
                  ) : (
                    project.todos.map((todo, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 rounded hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-muted-foreground/50 flex-shrink-0"
                            disabled
                            readOnly
                          />
                          <span className="text-sm text-foreground flex-1">
                            {todo.text}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${CATEGORY_CONFIG[todo.category].color}`}
                        >
                          {CATEGORY_CONFIG[todo.category][locale]}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}

export default ProjectTodoList
