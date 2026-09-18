"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import LinkExtension from "@tiptap/extension-link"
import ImageResize from "tiptap-extension-resize-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import { TableKit } from "@tiptap/extension-table"
import { compressImage } from "@/lib/compress-image"

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// Format a date/ISO string into the value a <input type="datetime-local"> expects
// (local time, "YYYY-MM-DDTHH:mm"). Returns "" for empty/invalid input.
function toDatetimeLocal(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3, List, ListOrdered,
  Link2, Quote, Code, ImagePlus, Eye, Code2, X,
  Search, Tag, Globe, Upload, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  RotateCcw, RotateCw, Library, CalendarClock, Table as TableIcon, Workflow,
  Rows3, Columns3, Trash2, FileText, Gauge
} from "lucide-react"
import { analyzeSeo, CHANNEL_LABELS, type SeoReport, type CheckStatus } from "@/lib/seo-analysis"
import { useToast } from "@/components/ui/ToastProvider"

interface ArticleEditorProps {
  initialData?: any
  onSave: (data: any) => Promise<void>
  saving?: boolean
}

const CATEGORIES = [
  { id: 'Healthcare Trends', label: 'Healthcare Trends' },
  { id: 'Patient Acquisition', label: 'Patient Acquisition' },
  { id: 'Clinic Management', label: 'Clinic Management' },
  { id: 'Digital Marketing', label: 'Digital Marketing' },
  { id: 'Case Studies', label: 'Case Studies' },
  { id: 'other', label: 'Other' }
]

interface UploadedImage {
  filename: string
  url: string
  size: number
  modified: string
}

export function ArticleEditor({ initialData, onSave, saving }: ArticleEditorProps) {
  const { toast } = useToast()
  const [title, setTitle] = React.useState(initialData?.title || '')
  const [content, setContent] = React.useState(initialData?.content || '')
  const [excerpt, setExcerpt] = React.useState(initialData?.excerpt || '')
  const [category, setCategory] = React.useState(initialData?.category || 'Healthcare Trends')
  const [customCategory, setCustomCategory] = React.useState('')

  const initialTags = initialData?.tags
    ? (typeof initialData.tags === 'string' ? initialData.tags.split(',').map((t: string) => t.trim()) : initialData.tags)
    : []
  const [tags, setTags] = React.useState<string[]>(initialTags)
  const [tagInput, setTagInput] = React.useState('')
  const [published, setPublished] = React.useState(initialData?.published || false)
  const [scheduledFor, setScheduledFor] = React.useState<string>(toDatetimeLocal(initialData?.scheduledFor))
  const [htmlMode, setHtmlMode] = React.useState(false)
  const [previewMode, setPreviewMode] = React.useState(false)
  const [featuredImage, setFeaturedImage] = React.useState(initialData?.featuredImage || '')
  const [slug, setSlug] = React.useState(initialData?.slug || '')
  const [showSeo, setShowSeo] = React.useState(false)
  const [showSeoPanel, setShowSeoPanel] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [featuredImageMode, setFeaturedImageMode] = React.useState<'url' | 'upload'>('url')

  // ── Advanced SEO / social (CMS kit) ──
  const [metaDescription, setMetaDescription] = React.useState(initialData?.metaDescription || '')
  const [focusKeyword, setFocusKeyword] = React.useState(initialData?.focusKeyword || '')
  const [secondaryKeywords, setSecondaryKeywords] = React.useState(initialData?.secondaryKeywords || '')
  const [canonicalUrl, setCanonicalUrl] = React.useState(initialData?.canonicalUrl || '')
  const [ogTitle, setOgTitle] = React.useState(initialData?.ogTitle || '')
  const [ogDescription, setOgDescription] = React.useState(initialData?.ogDescription || '')
  const [ogImage, setOgImage] = React.useState(initialData?.ogImage || '')
  const [noIndex, setNoIndex] = React.useState<boolean>(initialData?.noIndex || false)
  const [showAdvancedSeo, setShowAdvancedSeo] = React.useState(false)

  // Link dialog state (internal linking)
  const [showLinkDialog, setShowLinkDialog] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState('')
  const [linkSearch, setLinkSearch] = React.useState('')
  const [sitePosts, setSitePosts] = React.useState<{ title: string; slug: string }[]>([])
  const [loadingPosts, setLoadingPosts] = React.useState(false)

  // Image dialog state
  const [showImageDialog, setShowImageDialog] = React.useState(false)
  const [imageUrl, setImageUrl] = React.useState('')
  const [imageDialogTab, setImageDialogTab] = React.useState<'upload' | 'url' | 'library'>('upload')
  const [libraryImages, setLibraryImages] = React.useState<UploadedImage[]>([])
  const [loadingLibrary, setLoadingLibrary] = React.useState(false)

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline font-medium",
        },
      }),
      ImageResize.configure({
        inline: false,
      }),
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TableKit.configure({
        table: { resizable: false, HTMLAttributes: { class: "ge-table" } },
      }),
    ],
    content: initialData?.content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate prose-lg max-w-none p-6 focus:outline-none min-h-[400px] prose-img:rounded-[15px] prose-img:border prose-img:border-[var(--a-border)] prose-img:shadow-sm prose-img:cursor-pointer [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-[var(--a-border)] [&_th]:bg-[var(--a-bg)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-[var(--a-border)] [&_td]:px-3 [&_td]:py-2 [&_.selectedCell]:bg-primary/10",
      },
    },
  })

  // Focus mode: hide the admin nav sidebar while writing (restored on unmount)
  React.useEffect(() => {
    document.body.classList.add('editor-focus')
    return () => document.body.classList.remove('editor-focus')
  }, [])

  // Re-render on caret/selection moves so contextual controls (table toolbar,
  // link active state) appear immediately when clicking into a table or link.
  const [, bumpSelection] = React.useReducer((x: number) => x + 1, 0)
  React.useEffect(() => {
    if (!editor) return
    editor.on('selectionUpdate', bumpSelection)
    return () => { editor.off('selectionUpdate', bumpSelection) }
  }, [editor])

  // Sync editor when switching from HTML mode back to visual mode
  React.useEffect(() => {
    if (editor && !htmlMode && !previewMode) {
      const currentEditorHTML = editor.getHTML()
      if (currentEditorHTML !== content) {
        editor.commands.setContent(content)
      }
    }
  }, [htmlMode, previewMode])

  const handleInsertImage = () => {
    setShowImageDialog(true)
    setImageDialogTab('upload')
  }

  // ── Internal linking ──
  const STATIC_PAGES: { title: string; slug: string }[] = [
    { title: 'Home', slug: '/' },
    { title: 'Digital Marketing for Clinics', slug: '/digital-marketing-for-clinics' },
    { title: 'Blog', slug: '/blog' },
    { title: 'About', slug: '/about' },
    { title: 'Case Studies', slug: '/case-studies' },
    { title: 'Testimonials', slug: '/testimonials' },
    { title: 'Contact', slug: '/contact' },
    { title: 'FAQ', slug: '/faq' },
    { title: 'Clinic Growth Audit', slug: '/audit' },
    { title: 'Sync (WhatsApp automation)', slug: '/sync' },
  ]

  const openLinkDialog = async () => {
    // Pre-fill with the current link if the cursor is on one
    setLinkUrl(editor?.getAttributes('link')?.href || '')
    setLinkSearch('')
    setShowLinkDialog(true)
    if (sitePosts.length === 0) {
      setLoadingPosts(true)
      try {
        const res = await fetch('/api/posts')
        if (res.ok) {
          const data = await res.json()
          setSitePosts(
            (Array.isArray(data) ? data : [])
              .filter((p: any) => p.published && p.slug)
              .map((p: any) => ({ title: p.title, slug: `/blog/${p.slug}` }))
          )
        }
      } catch (err) {
        console.error('Failed to load posts for internal links:', err)
      }
      setLoadingPosts(false)
    }
  }

  const applyLink = (href?: string) => {
    const url = (href ?? linkUrl).trim()
    if (!url || !editor) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setShowLinkDialog(false)
    setLinkUrl('')
  }

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    setShowLinkDialog(false)
    setLinkUrl('')
  }

  // ── Table & flowchart inserts ──
  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const insertFlowchart = () => {
    editor?.chain().focus().insertContent({
      type: 'codeBlock',
      attrs: { language: 'mermaid' },
      content: [{
        type: 'text',
        text: 'flowchart TD\n    A[Patient searches on Google] --> B{Finds your clinic?}\n    B -- Yes --> C[Visits your website]\n    B -- No --> D[Goes to a competitor]\n    C --> E[Books an appointment]',
      }],
    }).run()
  }

  const fetchLibraryImages = async () => {
    setLoadingLibrary(true)
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setLibraryImages(data)
      }
    } catch (err) {
      console.error('Failed to load image library:', err)
    }
    setLoadingLibrary(false)
  }

  const insertImageIntoEditor = (url?: string) => {
    const imgUrl = url || imageUrl
    if (!imgUrl || !editor) return
    editor.chain().focus().setImage({ src: imgUrl }).run()
    setShowImageDialog(false)
    setImageUrl('')
  }

  const handleFileUpload = async (file: File, isFeatured = false) => {
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (res.ok && data.url) {
        if (isFeatured) {
          setFeaturedImage(data.url)
        } else {
          setImageUrl(data.url)
        }
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (err) {
      console.error('Upload failed:', err)
      toast('Image upload failed. Please try a smaller image or a different format (JPG/PNG/WebP).', 'error')
    }
    setUploading(false)
  }

  const handleInlineUpload = async (file: File) => {
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      const res = await fetch('/api/admin/media', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.url) {
        insertImageIntoEditor(data.url)
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (err) {
      console.error('Upload failed:', err)
      toast('Image upload failed. Please try a smaller image or a different format (JPG/PNG/WebP).', 'error')
    }
    setUploading(false)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }
  const removeTag = (t: string) => setTags(tags.filter(x => x !== t))

  const handleSlugAutogenerate = () => {
    if (!title) return;
    const generatedSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    setSlug(generatedSlug);
  };

  const handleSave = async (intent: 'draft' | 'publish' | 'schedule' = 'draft') => {
    let finalCategory = category === 'other' && customCategory.trim() ? customCategory.trim() : category;
    const currentHTML = htmlMode ? content : (editor?.getHTML() || content)

    let finalSlug = slug;
    if (!finalSlug && title) {
      finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    }

    // Publish → live now (clears any schedule). Schedule → stays a draft with a
    // future go-live time. Draft → plain draft, schedule cleared.
    const isPublishing = intent === 'publish'
    const scheduledISO =
      intent === 'schedule' && scheduledFor ? new Date(scheduledFor).toISOString() : null

    await onSave({
      title,
      content: currentHTML,
      excerpt,
      category: finalCategory,
      tags: tags.join(","),
      featuredImage,
      slug: finalSlug,
      published: isPublishing,
      scheduledFor: scheduledISO,
      metaDescription,
      focusKeyword,
      secondaryKeywords,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
      noIndex,
    })
  }

  const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  // Schedule/status helpers
  const nowLocalMin = toDatetimeLocal(new Date())
  const scheduledDate = scheduledFor ? new Date(scheduledFor) : null
  const isFutureSchedule = !!scheduledDate && scheduledDate.getTime() > Date.now()
  const isScheduled = !published && isFutureSchedule
  const statusLabel = published ? 'Published' : isScheduled ? 'Scheduled' : 'Draft'

  const seoReport: SeoReport = analyzeSeo({
    title,
    metaTitle: ogTitle,
    metaDesc: metaDescription || ogDescription || excerpt,
    slug,
    excerpt,
    contentHtml: content,
    focusKeyword,
    ogTitle,
    ogDescription,
    ogImage,
    featuredImageUrl: featuredImage,
  })
  const scoreColor = (s: number) => (s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444')

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="relative">
      {/* Floating SEO score button — opens the checklist drawer */}
      <button type="button" onClick={() => setShowSeoPanel(true)} title="Open the live SEO checklist"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--a-panel)] border border-[var(--a-border)] shadow-xl px-4 py-3 hover:shadow-2xl hover:-translate-y-0.5 transition-all">
        <Gauge className="h-4 w-4" style={{ color: scoreColor(seoReport.score) }} />
        <span className="text-lg font-black leading-none" style={{ color: scoreColor(seoReport.score) }}>{seoReport.score}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--a-muted)]">SEO</span>
      </button>

      {/* SEO checklist drawer */}
      {showSeoPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowSeoPanel(false)} />
          <aside className="fixed top-0 right-0 z-50 h-full w-[380px] max-w-[92vw] flex flex-col bg-[var(--a-panel)] border-l border-[var(--a-border)] shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--a-border)]">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--a-muted)]">SEO Live Score</span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black" style={{ color: scoreColor(seoReport.score) }}>{seoReport.score}<span className="text-[var(--a-muted)] text-xs font-bold">/100</span></span>
                <button onClick={() => setShowSeoPanel(false)} className="p-1.5 rounded-lg hover:bg-[var(--a-hover)] text-[var(--a-muted)] hover:text-[var(--a-text)] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-5 gap-1.5">
                {seoReport.channels.map(ch => (
                  <div key={ch.channel} className="rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-1 py-1.5 text-center" title={CHANNEL_LABELS[ch.channel]}>
                    <div className="text-xs font-black" style={{ color: scoreColor(ch.score) }}>{ch.score}</div>
                    <div className="text-[7px] font-bold uppercase tracking-wide text-[var(--a-muted)] leading-tight mt-0.5">{CHANNEL_LABELS[ch.channel].split('·')[0].trim()}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const visible = seoReport.checks.filter(c => !c.skipped)
                const groups: { key: CheckStatus; title: string; accent: string; items: typeof visible }[] = [
                  { key: 'bad', title: 'Needs fixing', accent: 'text-red-500', items: visible.filter(c => c.status === 'bad') },
                  { key: 'warn', title: 'Could improve', accent: 'text-amber-500', items: visible.filter(c => c.status === 'warn') },
                  { key: 'good', title: 'Passing', accent: 'text-emerald-500', items: visible.filter(c => c.status === 'good') },
                ]
                return groups.filter(g => g.items.length > 0).map(g => (
                  <div key={g.key} className="border-t border-[var(--a-border)] pt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", g.accent)}>{g.title}</span>
                      <span className="text-[9px] font-bold text-[var(--a-muted)]">{g.items.length}</span>
                    </div>
                    {g.items.map(c => (
                      <div key={c.id} className="flex items-start gap-2 text-[11px]">
                        <span className="mt-0.5 shrink-0">{c.status === 'good' ? '✅' : c.status === 'warn' ? '🟡' : '🔴'}</span>
                        <span className="text-[var(--a-text)]">{c.label}{c.detail ? <span className="text-[var(--a-muted)]"> — {c.detail}</span> : null}</span>
                      </div>
                    ))}
                  </div>
                ))
              })()}
            </div>
          </aside>
        </>
      )}

      {/* Editor — full width */}
      <div className="w-full space-y-6 bg-[var(--a-panel)] p-8 rounded-[15px] shadow-sm border border-[var(--a-border)]">
      {/* Title */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Article Title..."
        className="w-full text-3xl md:text-4xl font-black text-[var(--a-bright)] bg-transparent border-none outline-none placeholder:text-[var(--a-faint)] tracking-tight"
      />

      {/* Meta Row */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 min-w-[200px] z-20">
          <label className="text-[10px] uppercase font-black tracking-widest text-[var(--a-muted)]">Category</label>
          <SearchableSelect
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            placeholder="Select Category"
            allowCustom={true}
          />
          {category === 'other' && (
            <input
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              placeholder="Enter custom category..."
              autoFocus
              className="mt-1 bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs rounded-xl px-3 py-2 outline-none placeholder:text-[var(--a-muted)] focus:border-primary/50"
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto text-[10px] text-[var(--a-muted)] font-bold">
          <span>{wordCount} words</span>
          <span className="text-slate-200">•</span>
          <span>{readingTime} min read</span>
        </div>
      </div>

      {/* Featured Image */}
      <div className="p-4 rounded-[15px] border border-[var(--a-border)] bg-[var(--a-bg)] space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-[var(--a-muted)] uppercase tracking-widest flex items-center gap-2"><ImagePlus className="h-3.5 w-3.5" />Featured Image</h4>
          <div className="flex gap-1">
            <button onClick={() => setFeaturedImageMode('url')} className={cn("text-[9px] px-2 py-1 rounded-lg font-bold", featuredImageMode === 'url' ? "bg-[var(--a-panel)] text-primary shadow-sm" : "text-[var(--a-muted)]")}>URL</button>
            <button onClick={() => setFeaturedImageMode('upload')} className={cn("text-[9px] px-2 py-1 rounded-lg font-bold", featuredImageMode === 'upload' ? "bg-[var(--a-panel)] text-primary shadow-sm" : "text-[var(--a-muted)]")}>Upload</button>
          </div>
        </div>
        {featuredImageMode === 'url' ? (
          <input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)}
            placeholder="https://example.com/image.jpg" className="w-full bg-[var(--a-panel)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs rounded-xl px-3 py-2 outline-none placeholder:text-[var(--a-faint)] focus:border-primary" />
        ) : (
          <label className="flex items-center justify-center gap-2 py-4 bg-[var(--a-panel)] border border-dashed border-[var(--a-border)] rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="h-4 w-4 text-[var(--a-muted)]" />
            <span className="text-xs text-[var(--a-muted)] font-medium">{uploading ? 'Uploading...' : 'Click to upload (large images are compressed automatically)'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)} />
          </label>
        )}
        {featuredImage && (
          <div className="relative rounded-xl overflow-hidden border border-[var(--a-border)] max-h-48 mt-4 bg-[var(--a-panel)]">
            <img src={featuredImage} alt="Featured" className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 bg-[var(--a-bg)] p-3 rounded-[15px] border border-[var(--a-border)]">
        <Tag className="h-3.5 w-3.5 text-[var(--a-muted)]" />
        {tags.map(t => (
          <span key={t} className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 text-[10px] rounded-lg font-bold flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-200" onClick={() => removeTag(t)}>
            {t} <X className="h-3 w-3" />
          </span>
        ))}
        <input value={tagInput} onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder="Add tag and press Enter..." className="bg-transparent text-xs font-medium text-[var(--a-bright)] outline-none placeholder:text-[var(--a-muted)] w-48" />
      </div>

      {/* Toolbar + contextual table controls — stick to the top while scrolling */}
      <div className="sticky top-0 z-30 space-y-2 bg-[var(--a-panel)] py-2 -my-2">
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-[var(--a-bg)] border border-[var(--a-border)] shadow-sm">
        {!htmlMode && !previewMode && editor && (<>
          <ToolBtn icon={Bold} label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolBtn icon={Italic} label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolBtn icon={UnderlineIcon} label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolBtn icon={Heading2} label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolBtn icon={Heading3} label="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolBtn icon={List} label="Bullets" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolBtn icon={ListOrdered} label="Numbers" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolBtn icon={AlignLeft} label="Align Left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
          <ToolBtn icon={AlignCenter} label="Align Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
          <ToolBtn icon={AlignRight} label="Align Right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
          <ToolBtn icon={AlignJustify} label="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolBtn icon={Link2} label="Link (URL or internal page)" active={editor.isActive('link')} onClick={openLinkDialog} />
          <ToolBtn icon={Quote} label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <ToolBtn icon={Code} label="Code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
          <ToolBtn icon={ImagePlus} label="Image" onClick={handleInsertImage} />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolBtn icon={TableIcon} label="Insert table" active={editor.isActive('table')} onClick={insertTable} />
          <ToolBtn icon={Workflow} label="Insert flowchart (Mermaid)" onClick={insertFlowchart} />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolBtn icon={RotateCcw} label="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <ToolBtn icon={RotateCw} label="Redo" onClick={() => editor.chain().focus().redo().run()} />
        </>)}
        <div className="flex-1" />
        <button onClick={() => { setHtmlMode(!htmlMode); setPreviewMode(false) }} className={cn("px-3 py-1.5 rounded-lg text-size-tiny text-weight-bold uppercase tracking-widest transition-colors", htmlMode ? "bg-amber-100 text-amber-600" : "text-[var(--a-muted)] hover:bg-[var(--a-hover)]")}>
          <Code2 className="h-3.5 w-3.5 inline mr-1" />HTML
        </button>
        <button onClick={() => { setPreviewMode(!previewMode); setHtmlMode(false) }} className={cn("px-3 py-1.5 rounded-lg text-size-tiny text-weight-bold uppercase tracking-widest transition-colors", previewMode ? "bg-emerald-100 text-emerald-600" : "text-[var(--a-muted)] hover:bg-[var(--a-hover)]")}>
          <Eye className="h-3.5 w-3.5 inline mr-1" />Preview
        </button>
      </div>

      {/* Contextual table controls — visible while the cursor is inside a table */}
      {!htmlMode && !previewMode && editor?.isActive('table') && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[var(--a-bg)] border border-primary/20 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary px-1.5">Table</span>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[var(--a-text)] hover:bg-primary/10 transition-colors"><Rows3 className="h-3.5 w-3.5" />+ Row</button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[var(--a-text)] hover:bg-primary/10 transition-colors"><Rows3 className="h-3.5 w-3.5" />− Row</button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[var(--a-text)] hover:bg-primary/10 transition-colors"><Columns3 className="h-3.5 w-3.5" />+ Column</button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[var(--a-text)] hover:bg-primary/10 transition-colors"><Columns3 className="h-3.5 w-3.5" />− Column</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[var(--a-text)] hover:bg-primary/10 transition-colors">Header row</button>
          <div className="flex-1" />
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" />Delete table</button>
        </div>
      )}
      </div>

      {/* Link Insert Dialog — paste a URL or pick an internal page */}
      {showLinkDialog && (
        <div className="p-5 rounded-[15px] border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest">Insert Link</h4>
            <button onClick={() => setShowLinkDialog(false)} className="p-1 rounded-lg hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } }}
              placeholder="https://... or /blog/article-slug"
              className="flex-1 bg-[var(--a-panel)] border border-primary/20 text-[var(--a-bright)] text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary" />
            <Button size="sm" className="text-xs bg-primary hover:bg-primary/90 text-white" onClick={() => applyLink()} disabled={!linkUrl.trim()}>Apply</Button>
            {editor?.isActive('link') && (
              <Button size="sm" variant="outline" className="text-xs border-red-200 text-red-500 hover:bg-red-50" onClick={removeLink}>Remove</Button>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--a-muted)] flex items-center gap-1.5"><FileText className="h-3 w-3" />Internal pages &amp; articles</span>
              <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Filter..."
                className="bg-[var(--a-panel)] border border-[var(--a-border)] text-[var(--a-bright)] text-[11px] rounded-lg px-2.5 py-1.5 outline-none w-40 focus:border-primary/50" />
            </div>
            {loadingPosts ? (
              <div className="flex items-center justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--a-border)] bg-[var(--a-panel)] divide-y divide-[var(--a-border)]">
                {[...sitePosts, ...STATIC_PAGES]
                  .filter(p => !linkSearch.trim() || p.title.toLowerCase().includes(linkSearch.toLowerCase()) || p.slug.toLowerCase().includes(linkSearch.toLowerCase()))
                  .map(p => (
                    <button key={p.slug} type="button" onClick={() => applyLink(p.slug)}
                      className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 hover:bg-primary/5 transition-colors group">
                      <span className="text-xs font-bold text-[var(--a-text)] group-hover:text-primary truncate">{p.title}</span>
                      <span className="text-[10px] text-[var(--a-muted)] font-mono shrink-0">{p.slug}</span>
                    </button>
                  ))}
              </div>
            )}
            <p className="text-[10px] text-[var(--a-muted)] font-medium">Internal links (same site) boost your Google SEO score. Select text first, then apply a link.</p>
          </div>
        </div>
      )}

      {/* Image Insert Dialog */}
      {showImageDialog && (
        <div className="p-5 rounded-[15px] border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest">Insert Image</h4>
            <button onClick={() => setShowImageDialog(false)} className="p-1 rounded-lg hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[var(--a-panel)]/60 rounded-xl">
            {(['upload', 'url', 'library'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setImageDialogTab(tab)
                  if (tab === 'library') fetchLibraryImages()
                }}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-size-tiny text-weight-bold uppercase tracking-widest transition-all",
                  imageDialogTab === tab
                    ? "bg-[var(--a-panel)] text-primary shadow-sm"
                    : "text-[var(--a-muted)] hover:text-[var(--a-text)]"
                )}
              >
                {tab === 'upload' && <Upload className="h-3 w-3 inline mr-1.5" />}
                {tab === 'url' && <Link2 className="h-3 w-3 inline mr-1.5" />}
                {tab === 'library' && <Library className="h-3 w-3 inline mr-1.5" />}
                {tab}
              </button>
            ))}
          </div>

          {/* Upload Tab */}
          {imageDialogTab === 'upload' && (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center gap-3 py-8 bg-[var(--a-panel)] border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                <Upload className="h-8 w-8 text-primary/40" />
                <span className="text-xs text-[var(--a-muted)] font-medium">{uploading ? 'Uploading...' : 'Click to select or drag an image (compressed automatically)'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleInlineUpload(e.target.files[0])} />
              </label>
            </div>
          )}

          {/* URL Tab */}
          {imageDialogTab === 'url' && (
            <div className="space-y-3">
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL..." className="w-full bg-[var(--a-panel)] border border-primary/20 text-[var(--a-bright)] text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary" />
              <div className="flex justify-end">
                <Button size="sm" className="text-xs bg-primary hover:bg-primary/90 text-white" onClick={() => insertImageIntoEditor()} disabled={!imageUrl}>Insert Image</Button>
              </div>
            </div>
          )}

          {/* Library Tab */}
          {imageDialogTab === 'library' && (
            <div className="space-y-3">
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--a-muted)] font-medium">No images uploaded yet.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                  {libraryImages.map((img) => (
                    <button
                      key={img.filename}
                      onClick={() => insertImageIntoEditor(img.url)}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-[var(--a-hover)]"
                    >
                      <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-all flex items-center justify-center">
                        <span className="text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 bg-primary/80 px-2 py-1 rounded-lg transition-opacity">
                          Use
                        </span>
                      </div>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatBytes(img.size)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Editor Area */}
      {htmlMode ? (
        <textarea value={content} onChange={e => setContent(e.target.value)}
          className="w-full min-h-[400px] bg-slate-900 border border-[var(--a-border)] rounded-[15px] p-6 text-sm text-amber-300 font-mono outline-none resize-y shadow-inner" />
      ) : previewMode ? (
        <div className="w-full min-h-[400px] bg-[var(--a-bg)] border border-[var(--a-border)] rounded-[15px] p-6 prose prose-slate max-w-none shadow-inner
          [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[var(--a-bright)] [&_h2]:mt-8 [&_h2]:mb-4
          [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[var(--a-bright)] [&_h3]:mt-6 [&_h3]:mb-3
          [&_p]:text-[var(--a-text)] [&_p]:leading-relaxed [&_p]:mb-5
          [&_a]:text-primary [&_a]:underline
          [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--a-muted)] [&_blockquote]:bg-primary/5 [&_blockquote]:py-1 [&_blockquote]:pr-4 [&_blockquote]:rounded-r-xl
          [&_pre]:bg-slate-900 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:text-sm [&_pre]:text-emerald-400
          [&_img]:rounded-[15px] [&_img]:max-w-full [&_img]:my-6 [&_img]:border [&_img]:border-[var(--a-border)] [&_img]:shadow-sm
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-[var(--a-text)] [&_ul]:mb-5
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-[var(--a-text)] [&_ol]:mb-5
          [&_li]:mb-1.5
          [&_table]:w-full [&_table]:border-collapse [&_table]:my-6
          [&_th]:border [&_th]:border-[var(--a-border)] [&_th]:bg-[var(--a-bg)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold [&_th]:text-[var(--a-bright)]
          [&_td]:border [&_td]:border-[var(--a-border)] [&_td]:px-3 [&_td]:py-2 [&_td]:text-[var(--a-text)]"
          dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <div className="rounded-[15px] border border-[var(--a-border)] overflow-hidden bg-[var(--a-panel)] focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-inner">
          <EditorContent editor={editor} />
        </div>
      )}

      {/* Excerpt */}
      <div>
        <label className="text-[10px] font-black text-[var(--a-muted)] uppercase tracking-widest mb-1.5 block">Excerpt (optional — auto-generated if empty)</label>
        <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
          placeholder="Brief summary for listings and SEO..."
          className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-text)] text-sm rounded-xl px-4 py-3 outline-none resize-none placeholder:text-[var(--a-muted)] focus:border-primary focus:bg-[var(--a-panel)]" />
      </div>

      {/* SEO & Slug Panel */}
      <div className="rounded-[15px] border border-[var(--a-border)] bg-[var(--a-bg)] overflow-hidden">
        <button onClick={() => setShowSeo(!showSeo)} className="w-full flex items-center justify-between p-4 hover:bg-[var(--a-hover)] transition-colors">
          <span className="text-xs font-black text-[var(--a-muted)] uppercase tracking-widest flex items-center gap-2"><Globe className="h-3.5 w-3.5" />SEO & Permalink Settings</span>
          <span className="text-xs text-[var(--a-muted)] font-bold">{showSeo ? '▲' : '▼'}</span>
        </button>
        {showSeo && (
          <div className="p-5 space-y-4 border-t border-[var(--a-border)] bg-[var(--a-panel)]">
            <div>
              <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest mb-1.5">URL Slug</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-[var(--a-border)] rounded-xl text-sm outline-none focus:border-primary"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="custom-article-link"
                />
                <button
                  type="button"
                  onClick={handleSlugAutogenerate}
                  className="px-4 py-2 bg-[var(--a-hover)] hover:bg-slate-200 text-[var(--a-text)] rounded-xl text-size-tiny text-weight-bold uppercase tracking-widest transition"
                >
                  Auto
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest">Meta description (Google search snippet)</label>
                <span className={cn("text-[10px] font-bold", metaDescription.length >= 120 && metaDescription.length <= 160 ? "text-emerald-500" : metaDescription.length > 0 ? "text-amber-500" : "text-[var(--a-faint)]")}>
                  {metaDescription.length}/160 {metaDescription.length >= 120 && metaDescription.length <= 160 ? '✓' : ''}
                </span>
              </div>
              <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={2}
                placeholder="120–160 characters shown under your title in Google. Include the focus keyword. Falls back to the excerpt if empty."
                className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-text)] text-sm rounded-xl px-4 py-3 outline-none resize-none placeholder:text-[var(--a-muted)] focus:border-primary" />
            </div>
            <div className="p-4 bg-[var(--a-bg)] rounded-xl border border-[var(--a-border)]">
              <p className="text-blue-600 text-[15px] font-medium truncate mb-0.5 hover:underline cursor-pointer">{title || 'Your engaging article title will appear here'}</p>
              <p className="text-emerald-700 text-xs truncate mb-1">
                www.growclinic.io/blog/{(slug || title)?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'article-slug'}
              </p>
              <p className="text-[var(--a-muted)] text-sm line-clamp-2">{metaDescription || excerpt || content.replace(/<[^>]*>?/gm, '').substring(0, 160) || 'An automatic SEO-optimized description will be generated from your article excerpt or introductory paragraph to attract readers in Google Search results.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Advanced SEO & Social + Live multi-channel analyzer */}
      <div className="rounded-[15px] border border-[var(--a-border)] bg-[var(--a-bg)] overflow-hidden">
        <button onClick={() => setShowAdvancedSeo(!showAdvancedSeo)} className="w-full flex items-center justify-between p-4 hover:bg-[var(--a-hover)] transition-colors">
          <span className="text-xs font-black text-[var(--a-muted)] uppercase tracking-widest flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />Advanced SEO &amp; Social
          </span>
          <span className="flex items-center gap-3">
            <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: scoreColor(seoReport.score) + '22', color: scoreColor(seoReport.score) }}>
              SEO {seoReport.score}/100
            </span>
            <span className="text-xs text-[var(--a-muted)] font-bold">{showAdvancedSeo ? '▲' : '▼'}</span>
          </span>
        </button>
        {showAdvancedSeo && (
          <div className="p-5 space-y-5 border-t border-[var(--a-border)] bg-[var(--a-panel)]">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest mb-1.5">Focus keyword</label>
                <input value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} placeholder="e.g. dental clinic marketing" className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs rounded-xl px-3 py-2 outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest mb-1.5">Secondary keywords (comma-separated)</label>
                <input value={secondaryKeywords} onChange={e => setSecondaryKeywords(e.target.value)} placeholder="keyword two, keyword three" className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs rounded-xl px-3 py-2 outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest mb-1.5">Canonical URL (optional)</label>
                <input value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} placeholder="https://www.growclinic.io/blog/..." className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs rounded-xl px-3 py-2 outline-none focus:border-primary" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={noIndex} onChange={e => setNoIndex(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-xs font-bold text-[var(--a-text)]">No-index this post (hide from search engines)</span>
                </label>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest mb-1.5">OG title override</label>
                <input value={ogTitle} onChange={e => setOgTitle(e.target.value)} placeholder="Falls back to the post title" className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs rounded-xl px-3 py-2 outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest mb-1.5">OG image override (URL)</label>
                <input value={ogImage} onChange={e => setOgImage(e.target.value)} placeholder="Falls back to the featured image" className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs rounded-xl px-3 py-2 outline-none focus:border-primary" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] text-[var(--a-muted)] font-black uppercase tracking-widest mb-1.5">OG description override</label>
                <textarea value={ogDescription} onChange={e => setOgDescription(e.target.value)} rows={2} placeholder="Falls back to the excerpt" className="w-full bg-[var(--a-bg)] border border-[var(--a-border)] text-[var(--a-text)] text-xs rounded-xl px-3 py-2 outline-none resize-none focus:border-primary" />
              </div>
            </div>

            <p className="text-[11px] text-[var(--a-muted)] font-medium">The live SEO score &amp; checklist update in the left sidebar as you write.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 pt-6 border-t border-[var(--a-border)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
              published ? "bg-emerald-100 text-emerald-600" : isScheduled ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
            )}>{statusLabel}</span>
            {isScheduled && scheduledDate && (
              <span className="text-[11px] font-semibold text-[var(--a-muted)]">
                goes live {scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
            {initialData?.id ? (
              <a href={`/preview/${initialData.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--a-muted)] hover:text-primary transition-colors">
                <Eye className="h-3.5 w-3.5" /> Open preview ↗
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--a-faint)]">
                <Eye className="h-3.5 w-3.5" /> Save once to open full preview
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="scheduleAt" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--a-muted)]">
                <CalendarClock className="h-3.5 w-3.5" /> Schedule
              </label>
              <input
                id="scheduleAt"
                type="datetime-local"
                value={scheduledFor}
                min={nowLocalMin}
                onChange={(e) => setScheduledFor(e.target.value)}
                onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.() } catch { /* picker already open */ } }}
                className="rounded-lg border border-[var(--a-border)] bg-[var(--a-panel-2)] px-2.5 py-1.5 text-[12px] text-[var(--a-text)] outline-none focus:border-primary/50 cursor-pointer"
              />
              {scheduledFor && (
                <button type="button" onClick={() => setScheduledFor('')} title="Clear schedule" className="text-[var(--a-faint)] hover:text-red-500 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button variant="outline" className="text-size-tiny text-weight-bold uppercase tracking-widest border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-hover)] rounded-xl px-6" onClick={() => handleSave('draft')} disabled={saving || !title}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button variant="outline" className="text-size-tiny text-weight-bold uppercase tracking-widest border-blue-300 text-blue-600 hover:bg-blue-50 rounded-xl px-6"
              onClick={() => {
                if (!isFutureSchedule) {
                  // No future date picked yet — open the date picker instead of doing nothing
                  const el = document.getElementById('scheduleAt') as HTMLInputElement | null
                  el?.focus()
                  try { el?.showPicker?.() } catch { /* picker already open */ }
                  return
                }
                handleSave('schedule')
              }}
              disabled={saving || !title || !content}
              title={!isFutureSchedule ? 'Opens the date picker — pick a future date & time' : undefined}>
              {saving ? 'Saving...' : 'Schedule'}
            </Button>
            <Button className="text-size-tiny text-weight-bold uppercase tracking-widest bg-primary hover:bg-primary-dark text-white rounded-xl px-8 shadow-md" onClick={() => handleSave('publish')} disabled={saving || !title || !content}>
              {saving ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

function ToolBtn({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={label}
      className={cn(
        "p-2.5 rounded-xl transition-colors",
        active ? "text-primary bg-primary/10" : "text-[var(--a-muted)] hover:text-primary hover:bg-primary/10"
      )}>
      <Icon className="h-4 w-4" />
    </button>
  )
}

function SearchableSelect({
  options, value, onChange, placeholder, allowCustom = false
}: {
  options: { id: string, label: string }[], value: string, onChange: (val: string) => void, placeholder: string, allowCustom?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selectedLabel = options.find(o => o.id === value)?.label || value

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-[var(--a-panel)] border border-[var(--a-border)] hover:bg-[var(--a-hover)] transition-colors text-[var(--a-text)] text-xs font-medium rounded-xl px-4 py-2 outline-none h-[42px] cursor-pointer shadow-sm">
        <span className="truncate">{selectedLabel || placeholder}</span>
        <span className="text-[var(--a-muted)] text-[10px] ml-2 font-bold">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-2 w-full min-w-[200px] bg-[var(--a-panel)] border border-[var(--a-border)] shadow-2xl rounded-[15px] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-[var(--a-border)] bg-[var(--a-bg)]">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or type..."
              className="w-full bg-[var(--a-panel)] border border-[var(--a-border)] text-[var(--a-bright)] text-xs font-medium rounded-xl px-3 py-2 outline-none placeholder:text-[var(--a-muted)] focus:border-primary/50"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar">
            {filtered.map(o => (
              <button key={o.id} type="button"
                onClick={() => { onChange(o.id); setIsOpen(false); setSearch("") }}
                className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium truncate hover:bg-[var(--a-hover)] text-[var(--a-text)] transition-colors", value === o.id && "bg-primary/10 text-primary font-bold")}>
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && !allowCustom && (
              <div className="px-3 py-4 text-center text-[10px] font-black tracking-widest text-[var(--a-muted)] uppercase">No results found</div>
            )}
            {allowCustom && search.trim() && !options.find(o => o.label.toLowerCase() === search.trim().toLowerCase()) && (
              <button type="button"
                onClick={() => { onChange(search.trim().toLowerCase()); setIsOpen(false); setSearch("") }}
                className="w-full flex items-center gap-2 text-left px-3 py-2 mt-1 rounded-xl text-xs font-bold truncate bg-primary/5 hover:bg-primary/10 text-primary transition-colors border border-dashed border-primary/20">
                <PlusIcon className="h-3 w-3" /> Create &quot;{search.trim()}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PlusIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
}
