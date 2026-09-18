// Multi-channel content analysis engine.
//
// Pure, deterministic, dependency-free so it runs identically in the browser
// (live in the admin editor) and on the server. Scores a post across FIVE
// channels, not just one:
//   google   - classic search SEO (Rank Math / seoreviewtools style)
//   aeo      - Answer Engine Optimization (featured snippets, PAA, voice, FAQ)
//   geo      - Generative Engine Optimization (ChatGPT / Perplexity / AI Overviews)
//   linkedin - LinkedIn newsletter / post performance
//   social   - Open Graph / shareable card quality
//
// Each channel gets its own 0-100 score; `score` is the weighted overall.

export type CheckStatus = 'good' | 'warn' | 'bad';
export type Channel = 'google' | 'aeo' | 'geo' | 'linkedin' | 'social';

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  /** Score weight inside its channel. Excluded from totals when `skipped`. */
  weight: number;
  channel: Channel;
  /** Optional dynamic detail, e.g. "1.4% (12x)". */
  detail?: string;
  /** Neutral, ignored by the score (e.g. no focus keyword set). */
  skipped?: boolean;
}

export interface SeoInput {
  title?: string;
  metaTitle?: string;
  metaDesc?: string;
  slug?: string;
  excerpt?: string;
  contentHtml?: string;
  focusKeyword?: string;
  // social / OG inputs
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  featuredImageUrl?: string;
}

export interface SeoStats {
  wordCount: number;
  readingTimeMin: number;
  keywordCount: number;
  keywordDensity: number;
  fleschScore: number;
  fleschLabel: string;
  sentenceCount: number;
  avgWordsPerSentence: number;
  longestParagraphWords: number;
  h2Count: number;
  questionHeadingCount: number;
  linkCount: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  imagesWithAlt: number;
  statCount: number;
  titleLength: number;
  metaDescLength: number;
}

export interface ChannelScore {
  channel: Channel;
  score: number;
  grade: 'bad' | 'ok' | 'good';
}

export interface SeoReport {
  score: number; // weighted overall 0-100
  grade: 'bad' | 'ok' | 'good';
  channels: ChannelScore[];
  checks: SeoCheck[];
  stats: SeoStats;
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  google: 'Google SEO',
  aeo: 'AEO · Answer engines',
  geo: 'GEO · AI engines',
  linkedin: 'LinkedIn',
  social: 'Social / OG',
};

const CHANNEL_WEIGHTS: Record<Channel, number> = {
  google: 0.28, aeo: 0.2, geo: 0.2, linkedin: 0.16, social: 0.16,
};

const POWER_WORDS = [
  'best', 'free', 'guide', 'how', 'why', 'tips', 'proven', 'fast', 'easy', 'ultimate',
  'new', 'now', 'top', 'secret', 'boost', 'grow', 'win', 'avoid', 'stop', 'mistake',
  'results', 'strategy', 'playbook', 'framework', 'data', 'real',
];
const QUESTION_STARTS = /^(who|what|why|how|when|where|which|can|does|do|is|are|should|will|did)\b/i;

// ---------- text utilities ----------

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–',
};

export function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
}

export function countKeyword(text: string, keyword: string): number {
  const kw = keyword.trim();
  if (!kw || !text) return 0;
  const lower = text.toLowerCase();
  const lkw = kw.toLowerCase();
  let count = 0, idx = 0;
  while (true) {
    const found = lower.indexOf(lkw, idx);
    if (found === -1) break;
    const before = found === 0 ? ' ' : lower[found - 1];
    const after = found + lkw.length >= lower.length ? ' ' : lower[found + lkw.length];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) count++;
    idx = found + lkw.length;
  }
  return count;
}

function hasKeyword(text: string, keyword: string): boolean {
  return countKeyword(text, keyword) > 0;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function splitSentences(text: string): string[] {
  return text.split(/[.!?]+\s/).map((s) => s.trim()).filter(Boolean);
}

export function fleschReadingEase(text: string): number {
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const sentences = splitSentences(text);
  if (words.length === 0 || sentences.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

function fleschLabel(score: number): string {
  if (score >= 70) return 'Easy to read';
  if (score >= 60) return 'Fairly easy';
  if (score >= 50) return 'Fairly difficult';
  if (score >= 30) return 'Difficult';
  return 'Very difficult';
}

// ---------- extraction ----------

function paragraphTexts(html: string): string[] {
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(htmlToText(m[1]));
  if (!out.length) { const t = htmlToText(html); if (t) out.push(t); }
  return out;
}

function firstChunkText(html: string): string {
  const ps = paragraphTexts(html);
  if (ps.length) return ps.slice(0, 2).join(' ');
  return htmlToText(html).slice(0, 320);
}

function headingTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(htmlToText(m[1]));
  return out;
}

function isQuestion(text: string): boolean {
  const t = text.trim();
  return t.endsWith('?') || QUESTION_STARTS.test(t);
}

function images(html: string): { src: string; alt: string }[] {
  const out: { src: string; alt: string }[] = [];
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    out.push({
      src: tag.match(/\bsrc=["']([^"']*)["']/i)?.[1] || '',
      alt: tag.match(/\balt=["']([^"']*)["']/i)?.[1] || '',
    });
  }
  return out;
}

function links(html: string): { href: string; internal: boolean; social: boolean }[] {
  const out: { href: string; internal: boolean; social: boolean }[] = [];
  const re = /<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (!href || href.startsWith('#') || href.startsWith('tel:')) continue;
    const isAbsolute = /^https?:\/\//i.test(href);
    const internal = (!isAbsolute && !href.startsWith('mailto:')) || /(?:^|\/\/)(?:www\.)?growclinic\.io/i.test(href);
    const social = /linkedin\.com|instagram\.com|twitter\.com|x\.com|facebook\.com|youtube\.com|t\.me|tiktok\.com|mailto:/i.test(href);
    out.push({ href, internal, social });
  }
  return out;
}

function countStats(text: string): number {
  // Numbers that read like data: percentages, money, multipliers, magnitudes, plain figures.
  const matches = text.match(/(\$\s?\d[\d,.]*|\d[\d,.]*\s?(%|percent|x|k|m|bn|billion|million|users|installs|downloads|hours|days|years|\$))|(?:^|\s)\d{2,}(?:\s|$)/gi);
  return matches ? matches.length : 0;
}

// ---------- main ----------

export function analyzeSeo(input: SeoInput): SeoReport {
  const html = input.contentHtml || '';
  const text = htmlToText(html);
  const kw = (input.focusKeyword || '').trim();
  const hasKw = kw.length > 0;
  const seoTitle = (input.metaTitle || input.title || '').trim();
  const metaDesc = (input.metaDesc || '').trim();
  const slug = (input.slug || '').trim();
  const socialTitle = (input.ogTitle || input.metaTitle || input.title || '').trim();
  const socialDesc = (input.ogDescription || metaDesc || input.excerpt || '').trim();
  const socialImage = (input.ogImage || input.featuredImageUrl || '').trim();

  const paras = paragraphTexts(html);
  const paraCounts = paras.map(countWords);
  const wordCount = countWords(text);
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;
  const longestParagraphWords = paraCounts.length ? Math.max(...paraCounts) : 0;
  const flesch = fleschReadingEase(text);
  const firstChunk = firstChunkText(html);

  const heads = headingTexts(html);
  const questionHeadings = heads.filter(isQuestion);
  const imgs = images(html);
  const lnks = links(html);
  const internalLinks = lnks.filter((l) => l.internal).length;
  const externalLinks = lnks.filter((l) => !l.internal && !l.href.startsWith('mailto:')).length;
  const socialLinks = lnks.filter((l) => l.social).length;
  const imagesWithAlt = imgs.filter((i) => i.alt.trim().length > 0).length;
  const statCount = countStats(text);
  const hasListOrTable = /<(ul|ol|table)\b/i.test(html);
  const hasBlockquote = /<blockquote\b/i.test(html);
  const snippetParas = paraCounts.filter((w) => w >= 35 && w <= 65).length;
  const scannableRatio = paraCounts.length ? paraCounts.filter((w) => w <= 50).length / paraCounts.length : 0;
  const mentionsYear = /\b20[2-3]\d\b/.test(text);
  const takeawayBlock = heads.some((h) => /key takeaways|tl;?dr|summary|in short|bottom line|takeaway/i.test(h))
    || /\b(key takeaways|tl;?dr|in short|bottom line)\b/i.test(text.slice(0, 600));
  const answerUpfront = paras.slice(0, 2).some((p) => { const c = p.length; return c >= 40 && c <= 360; });
  const definitionUpfront = hasKw && new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b\\s+(is|are|means|refers to|stands for)\\b`, 'i').test(firstChunk);

  const keywordCount = hasKw ? countKeyword(text, kw) : 0;
  const keywordDensity = hasKw && wordCount ? Math.round((keywordCount / wordCount) * 1000) / 10 : 0;

  // LinkedIn signals
  const firstBlock = (paras[0] || '').trim();
  const hasHook = firstBlock.length >= 20 && firstBlock.length <= 240;
  const lastChunk = text.slice(-220);
  const hasCTA = /\?\s*$/.test(text.trim()) || /\?/.test(lastChunk)
    || /\b(comment|reply|drop a|tell me|your turn|what(?:'s| is) your|let me know|agree)\b/i.test(lastChunk);
  const hasConnectBlock = socialLinks >= 2 || /\b(connect with me|follow along|stay in touch|let'?s connect)\b/i.test(text);
  const visibleDashes = /[—–]|(?:^|\s)-(?:\s)/.test(text);

  const stats: SeoStats = {
    wordCount,
    readingTimeMin: Math.max(1, Math.round(wordCount / 220)),
    keywordCount,
    keywordDensity,
    fleschScore: flesch,
    fleschLabel: fleschLabel(flesch),
    sentenceCount,
    avgWordsPerSentence,
    longestParagraphWords,
    h2Count: heads.length,
    questionHeadingCount: questionHeadings.length,
    linkCount: lnks.length,
    internalLinks,
    externalLinks,
    imageCount: imgs.length,
    imagesWithAlt,
    statCount,
    titleLength: seoTitle.length,
    metaDescLength: metaDesc.length,
  };

  const checks: SeoCheck[] = [];
  const add = (
    channel: Channel, id: string, label: string, status: CheckStatus, weight: number,
    detail?: string, skipped = false,
  ) => checks.push({ channel, id, label, status, weight, detail, skipped });

  // ============ GOOGLE ============
  add('google', 'kw_title', 'Focus keyword in SEO title',
    hasKw ? (hasKeyword(seoTitle, kw) ? 'good' : 'bad') : 'warn', 8, hasKw ? undefined : 'Set a focus keyword', !hasKw);
  add('google', 'kw_meta', 'Focus keyword in meta description',
    hasKw ? (hasKeyword(metaDesc, kw) ? 'good' : 'bad') : 'warn', 5, undefined, !hasKw);
  add('google', 'kw_url', 'Focus keyword in URL slug',
    hasKw ? (hasKeyword(slug.replace(/[-_]/g, ' '), kw) ? 'good' : 'bad') : 'warn', 5, undefined, !hasKw);
  add('google', 'kw_intro', 'Focus keyword in first paragraph',
    hasKw ? (hasKeyword(firstChunk, kw) ? 'good' : 'bad') : 'warn', 5, undefined, !hasKw);
  const densityStatus: CheckStatus = !hasKw ? 'warn' : keywordCount === 0 ? 'bad'
    : keywordDensity >= 0.5 && keywordDensity <= 2.5 ? 'good' : 'warn';
  add('google', 'kw_density', 'Keyword density 0.5–2.5%', densityStatus, 6,
    hasKw ? `${keywordDensity}% (${keywordCount}x)` : 'Set a focus keyword', !hasKw);
  add('google', 'content_length', 'Content length (600+ words)',
    wordCount >= 600 ? 'good' : wordCount >= 300 ? 'warn' : 'bad', 7, `${wordCount} words`);
  add('google', 'kw_subheading', 'Keyword in a subheading',
    hasKw ? (heads.some((h) => hasKeyword(h, kw)) ? 'good' : 'warn') : 'warn', 4, `${heads.length} headings`, !hasKw);
  add('google', 'kw_image_alt', 'Keyword in image alt text',
    !hasKw ? 'warn' : imgs.length === 0 ? 'warn' : imgs.some((i) => hasKeyword(i.alt, kw)) ? 'good' : 'warn', 3,
    `${imagesWithAlt}/${imgs.length} alts`, !hasKw);
  add('google', 'has_internal', 'Has an internal link', internalLinks > 0 ? 'good' : 'warn', 4, `${internalLinks} internal`);
  add('google', 'has_external', 'Has an external link', externalLinks > 0 ? 'good' : 'warn', 3, `${externalLinks} external`);
  const slugWords = slug.split(/[-_]/).filter(Boolean).length;
  add('google', 'short_slug', 'Short, clean URL slug',
    slug.length === 0 ? 'bad' : slug.length <= 75 && slugWords <= 6 ? 'good' : 'warn', 2, slug ? `${slug.length} chars` : 'No slug');
  const tl = seoTitle.length;
  add('google', 'title_length', 'Title length 50–60 chars',
    tl >= 50 && tl <= 60 ? 'good' : tl >= 40 && tl <= 65 ? 'warn' : 'bad', 5, `${tl} chars`);
  add('google', 'title_hook', 'Title has a number or power word',
    /\d/.test(seoTitle) || POWER_WORDS.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(seoTitle)) ? 'good' : 'warn', 2);
  add('google', 'flesch', 'Readability (Flesch 60+)',
    flesch >= 60 ? 'good' : flesch >= 40 ? 'warn' : 'bad', 4, `${flesch} · ${fleschLabel(flesch)}`);
  add('google', 'has_subheadings', 'Uses H2/H3 subheadings',
    heads.length >= 2 ? 'good' : heads.length === 1 ? 'warn' : 'bad', 4, `${heads.length} found`);
  add('google', 'has_images', 'Includes at least one image', imgs.length > 0 ? 'good' : 'bad', 3, `${imgs.length} images`);
  add('google', 'meta_desc', 'Meta description 120–160 chars',
    metaDesc.length >= 120 && metaDesc.length <= 160 ? 'good' : metaDesc.length >= 80 && metaDesc.length <= 175 ? 'warn' : 'bad', 5, `${metaDesc.length} chars`);

  // ============ AEO — Answer Engine Optimization ============
  add('aeo', 'aeo_answer', 'Direct answer in the first 2 paragraphs',
    answerUpfront ? 'good' : 'warn', 7, answerUpfront ? 'concise answer found' : 'lead with a 40–60 word answer');
  add('aeo', 'aeo_question_heading', 'A question-style heading (matches "People Also Ask")',
    questionHeadings.length >= 1 ? 'good' : 'warn', 5, `${questionHeadings.length} question headings`);
  add('aeo', 'aeo_faq', 'FAQ-style Q&A section',
    questionHeadings.length >= 2 ? 'good' : questionHeadings.length === 1 ? 'warn' : 'bad', 5, `${questionHeadings.length} Q headings`);
  add('aeo', 'aeo_lists', 'Has a list or table (snippet-friendly)', hasListOrTable ? 'good' : 'warn', 4, hasListOrTable ? 'found' : 'add a list/table');
  add('aeo', 'aeo_snippet_para', 'Short, extractable paragraphs (35–65 words)',
    snippetParas >= 2 ? 'good' : snippetParas === 1 ? 'warn' : 'bad', 4, `${snippetParas} snippet paras`);
  add('aeo', 'aeo_definition', 'Defines the focus term clearly up top',
    !hasKw ? 'warn' : definitionUpfront ? 'good' : 'warn', 4, hasKw ? undefined : 'Set a focus keyword', !hasKw);

  // ============ GEO — Generative Engine Optimization ============
  add('geo', 'geo_stats', 'Cites concrete statistics / numbers',
    statCount >= 3 ? 'good' : statCount >= 1 ? 'warn' : 'bad', 6, `${statCount} data points`);
  add('geo', 'geo_citations', 'Links to authoritative sources',
    externalLinks >= 2 ? 'good' : externalLinks === 1 ? 'warn' : 'bad', 6, `${externalLinks} external links`);
  add('geo', 'geo_quotable', 'Has a quotable, standalone line',
    hasBlockquote ? 'good' : 'warn', 4, hasBlockquote ? 'blockquote found' : 'add a pull quote');
  add('geo', 'geo_takeaways', 'Key takeaways / TL;DR block', takeawayBlock ? 'good' : 'warn', 5, takeawayBlock ? 'found' : 'add a summary block');
  add('geo', 'geo_freshness', 'Signals freshness (year / recency)', mentionsYear ? 'good' : 'warn', 4, mentionsYear ? 'year mentioned' : 'add the current year');
  add('geo', 'geo_entity', 'Entity mentioned consistently',
    !hasKw ? 'warn' : keywordCount >= 3 ? 'good' : 'warn', 4, hasKw ? `${keywordCount}x` : 'Set a focus keyword', !hasKw);

  // ============ LINKEDIN ============
  add('linkedin', 'li_hook', 'Opens with a short, punchy hook', hasHook ? 'good' : 'warn', 6, `${firstBlock.length} chars`);
  add('linkedin', 'li_cta', 'Ends with a question / comment CTA', hasCTA ? 'good' : 'warn', 6);
  add('linkedin', 'li_connect', 'Has a "connect" / social links block', hasConnectBlock ? 'good' : 'warn', 4, `${socialLinks} social links`);
  add('linkedin', 'li_no_dashes', 'No punctuation dashes (house style)', visibleDashes ? 'warn' : 'good', 4);
  add('linkedin', 'li_scannable', 'Scannable, short paragraphs',
    scannableRatio >= 0.7 ? 'good' : scannableRatio >= 0.4 ? 'warn' : 'bad', 4, `${Math.round(scannableRatio * 100)}% short`);
  add('linkedin', 'li_length', 'Substantial enough to publish', wordCount >= 150 ? 'good' : 'warn', 3, `${wordCount} words`);

  // ============ SOCIAL / OG ============
  add('social', 'social_image', 'Social / OG image set', socialImage ? 'good' : 'bad', 6, socialImage ? 'set' : 'missing');
  const stl = socialTitle.length;
  add('social', 'social_title', 'Social title ≤ 88 chars', stl >= 10 && stl <= 88 ? 'good' : stl > 0 ? 'warn' : 'bad', 5, `${stl} chars`);
  const sdl = socialDesc.length;
  add('social', 'social_desc', 'Social description 50–160 chars', sdl >= 50 && sdl <= 160 ? 'good' : sdl > 0 ? 'warn' : 'bad', 5, `${sdl} chars`);
  add('social', 'social_links', 'Includes social / profile links', socialLinks >= 1 ? 'good' : 'warn', 4, `${socialLinks} links`);
  add('social', 'social_title_kw', 'Focus keyword in social title',
    !hasKw ? 'warn' : hasKeyword(socialTitle, kw) ? 'good' : 'warn', 3, hasKw ? undefined : 'Set a focus keyword', !hasKw);

  // Empty draft guard: with no real body content nothing is genuinely passing,
  // so don't hand out half-credit "warn" points. Everything fails → score 0.
  const isEmpty = wordCount === 0;
  if (isEmpty) {
    for (const c of checks) {
      if (!c.skipped) c.status = 'bad';
    }
  }

  // ---------- scoring ----------
  const channelScore = (channel: Channel): ChannelScore => {
    const scored = checks.filter((c) => c.channel === channel && !c.skipped);
    const max = scored.reduce((s, c) => s + c.weight, 0) || 1;
    const got = scored.reduce((s, c) => s + (c.status === 'good' ? c.weight : c.status === 'warn' ? c.weight * 0.5 : 0), 0);
    const score = Math.round((got / max) * 100);
    return { channel, score, grade: score >= 80 ? 'good' : score >= 50 ? 'ok' : 'bad' };
  };
  const channels = (Object.keys(CHANNEL_WEIGHTS) as Channel[]).map(channelScore);
  const overall = Math.round(channels.reduce((s, c) => s + c.score * CHANNEL_WEIGHTS[c.channel], 0));
  const grade: SeoReport['grade'] = overall >= 80 ? 'good' : overall >= 50 ? 'ok' : 'bad';

  return { score: overall, grade, channels, checks, stats };
}
