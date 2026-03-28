import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://growclinic.io'

  // Get all blog posts
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true, category: true }
  })

  // Get all projects
  const projects = await prisma.project.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true }
  })

  const blogUrls = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const categoryUrls = [...new Set(posts.map(post => post.category).filter(Boolean))].map((cat) => ({
    url: `${baseUrl}/blog/category/${encodeURIComponent(cat!.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  const projectUrls = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: project.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const staticUrls = [
    '',
    '/sync',
    '/testimonials',
    '/projects',
    '/faq',
    '/contact',
    '/privacy',
    '/terms',
    '/blog',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  return [...staticUrls, ...blogUrls, ...categoryUrls, ...projectUrls]
}
