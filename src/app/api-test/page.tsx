'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ApiTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testHealthCheck = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      const data = await response.json()
      setResult({ endpoint: '/health', data, status: response.status })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testAuth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getSession()
      setResult({ endpoint: '/api/auth/session', response })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testProjects = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getProjects()
      setResult({ endpoint: '/api/projects', response })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Connectivity Test</h1>
        <p className="text-muted-foreground">
          Testing connection to: {process.env.NEXT_PUBLIC_API_URL}
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={testHealthCheck} disabled={loading}>
          Test Health Check
        </Button>
        <Button onClick={testAuth} disabled={loading}>
          Test Auth Session
        </Button>
        <Button onClick={testProjects} disabled={loading}>
          Test Projects API
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-4">
            <p>Loading...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Result: {result.endpoint}
              <Badge variant={result.status >= 400 ? 'destructive' : 'default'}>
                {result.status || (result.response?.success ? 'Success' : 'Failed')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}