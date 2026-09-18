import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { specialties } from '@/lib/specialties'

// Regenerated at most hourly (ISR) rather than on every crawler hit, so bots
// can't hammer the DB. The build never fails when DATABASE_URL is absent
// because the query is wrapped in try/catch below.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.growclinic.io'

  // Get all blog posts (DB-resilient: empty list if the database is unavailable)
  let posts: { slug: string; updatedAt: Date; category: string | null }[] = []
  let caseStudies: { slug: string; updatedAt: Date }[] = []
  try {
    posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, category: true }
    })
    caseStudies = await prisma.caseStudy.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true }
    })
  } catch {
    posts = []
    caseStudies = []
  }

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

  const caseStudyUrls = caseStudies.map((cs) => ({
    url: `${baseUrl}/case-studies/${cs.slug}`,
    lastModified: cs.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const staticUrls = [
    '',
    '/about',
    '/digital-marketing-for-clinics',
    '/audit',
    '/sync',
    '/testimonials',
    '/case-studies',
    '/faq',
    '/contact',
    '/privacy',
    '/terms',
    '/refund',
    '/blog',
    '/specialties',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  const specialtyUrls = specialties.map((s) => ({
    url: `${baseUrl}/specialties/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticUrls, ...specialtyUrls, ...blogUrls, ...categoryUrls, ...caseStudyUrls]
}
