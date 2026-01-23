import Link from 'next/link'

interface Doc {
  slug: string
  title: string
  description?: string
}

async function getDocs(): Promise<Doc[]> {
  const res = await fetch('http://localhost:4000/api/docs', {
    cache: 'no-store'
  })
  if (!res.ok) return []
  return res.json()
}

export default async function DocsPage() {
  const docs = await getDocs()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Documentation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive guides for V8 optimization and deoptimization patterns
        </p>
      </div>

      <div className="space-y-4">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            href={`/docs/${doc.slug}`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              {doc.title}
            </h2>
            {doc.description && (
              <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                {doc.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
