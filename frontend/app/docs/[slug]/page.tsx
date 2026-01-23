import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import Link from 'next/link'
import 'highlight.js/styles/github-dark.css'

interface Doc {
  metadata: {
    slug: string
    title: string
    description?: string
  }
  content: string
}

async function getDoc(slug: string): Promise<Doc | null> {
  try {
    const res = await fetch(`http://localhost:4000/api/docs/${slug}`, {
      cache: 'no-store'
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    return null
  }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await getDoc(slug)

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Document not found
          </h1>
          <Link
            href="/docs"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to docs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/docs"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to docs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {doc.metadata.title}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="markdown prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {doc.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
