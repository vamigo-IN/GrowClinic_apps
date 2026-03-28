import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/admin/',
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'Anthropic-ai', 'Google-Extended'],
        allow: '/',
        disallow: '/admin/',
      }
    ],
    sitemap: 'https://growclinic.io/sitemap.xml',
  }
}
