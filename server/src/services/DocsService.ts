import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config.js';
import { DocMetadata } from '../types.js';

export class DocsService {
  private cache: Map<string, DocMetadata> = new Map();

  async listDocs(): Promise<DocMetadata[]> {
    const files = await readdir(CONFIG.docsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    const docs: DocMetadata[] = [];

    for (const file of mdFiles) {
      const slug = file.replace('.md', '');
      let doc = this.cache.get(slug);

      if (!doc) {
        const content = await readFile(join(CONFIG.docsDir, file), 'utf-8');
        const { data, excerpt } = matter(content, { excerpt: true });

        doc = {
          slug,
          title: data.title || this.titleFromFilename(file),
          path: file,
          description: data.description || excerpt || undefined,
        };
        this.cache.set(slug, doc);
      }

      docs.push(doc);
    }

    return docs.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  async getDoc(slug: string): Promise<{ metadata: DocMetadata; content: string } | null> {
    const filePath = join(CONFIG.docsDir, `${slug}.md`);

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const { data, content } = matter(fileContent);

      const metadata: DocMetadata = {
        slug,
        title: data.title || this.titleFromFilename(`${slug}.md`),
        path: `${slug}.md`,
        description: data.description || undefined,
      };

      return { metadata, content };
    } catch (error) {
      return null;
    }
  }

  private titleFromFilename(filename: string): string {
    return filename
      .replace('.md', '')
      .replace(/^\d+-/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
