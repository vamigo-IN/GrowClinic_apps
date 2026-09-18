import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        // AI / LLM & answer-engine crawlers — explicitly welcomed for discovery & citation.
        userAgent: [
          'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
          'ClaudeBot', 'Claude-Web', 'anthropic-ai',
          'PerplexityBot', 'Perplexity-User',
          'Google-Extended', 'Applebot-Extended',
          'meta-externalagent', 'Amazonbot', 'Bytespider', 'CCBot',
        ],
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        // Google Ads landing-page crawler — keep every ad destination reachable
        // so landing-page checks / quality evaluation never fail.
        userAgent: ['AdsBot-Google', 'AdsBot-Google-Mobile'],
        allow: '/',
      },
      {
        // Bing / Microsoft — organic crawler.
        userAgent: ['bingbot', 'msnbot'],
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        // Microsoft / Bing Ads landing-page crawler.
        userAgent: 'adidxbot',
        allow: '/',
      }
    ],
    sitemap: 'https://www.growclinic.io/sitemap.xml',
  }
}
