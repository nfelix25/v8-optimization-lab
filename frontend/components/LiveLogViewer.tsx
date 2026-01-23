'use client'

import { useEffect, useState, useRef } from 'react'

interface LogViewerProps {
  runId: string
  initialStatus: string
}

export default function LiveLogViewer({ runId, initialStatus }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState(initialStatus)
  const [isLive, setIsLive] = useState(initialStatus === 'queued' || initialStatus === 'running')
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (!isLive) return

    const eventSource = new EventSource(`/api/runs/${runId}/stream`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'status':
            setStatus(data.data)
            break

          case 'stdout':
          case 'stderr':
            setLogs((prev) => [...prev, data.data])
            break

          case 'complete':
            setStatus(data.data.status)
            setIsLive(false)
            eventSource.close()
            break

          case 'error':
            setLogs((prev) => [...prev, `ERROR: ${data.data}`])
            break
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = () => {
      setIsLive(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [runId, isLive])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join(''))
  }

  const statusColors = {
    queued: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 animate-pulse',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${statusColors[status as keyof typeof statusColors] || statusColors.queued}`}>
          {status.toUpperCase()}
        </span>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Auto-scroll</span>
          </label>

          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded transition-colors"
          >
            Copy logs
          </button>
        </div>
      </div>

      {/* Log output */}
      <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto terminal">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-sm">
            {status === 'queued' ? 'Waiting in queue...' : 'Waiting for output...'}
          </div>
        ) : (
          <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
            {logs.join('')}
          </pre>
        )}
        <div ref={logsEndRef} />
      </div>

      {!isLive && logs.length === 0 && status !== 'queued' && (
        <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
          No logs captured for this run
        </p>
      )}
    </div>
  )
}
