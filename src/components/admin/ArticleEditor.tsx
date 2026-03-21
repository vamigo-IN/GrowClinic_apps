"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import LinkExtension from "@tiptap/extension-link"
import ImageResize from "tiptap-extension-resize-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3, List, ListOrdered,
  Link2, Quote, Code, ImagePlus, Eye, Code2, X,
  Search, Tag, Globe, Upload, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  RotateCcw, RotateCw, Library
} from "lucide-react"

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
  const [htmlMode, setHtmlMode] = React.useState(false)
  const [previewMode, setPreviewMode] = React.useState(false)
  const [featuredImage, setFeaturedImage] = React.useState(initialData?.featuredImage || '')
  const [slug, setSlug] = React.useState(initialData?.slug || '')
  const [showSeo, setShowSeo] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [featuredImageMode, setFeaturedImageMode] = React.useState<'url' | 'upload'>('url')

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
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialData?.content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate prose-lg max-w-none p-6 focus:outline-none min-h-[400px] prose-img:rounded-2xl prose-img:border prose-img:border-slate-100 prose-img:shadow-sm prose-img:cursor-pointer",
      },
    },
  })

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

  const fetchLibraryImages = async () => {
    setLoadingLibrary(true)
    try {
      const res = await fetch('/api/uploads')
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
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', {
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
      alert('Image upload failed. Max 2MB, images only.')
    }
    setUploading(false)
  }

  const handleInlineUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.url) {
        insertImageIntoEditor(data.url)
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Image upload failed. Max 2MB, images only.')
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

  const handleSave = async (isPublishing?: boolean) => {
    let finalCategory = category === 'other' && customCategory.trim() ? customCategory.trim() : category;
    const currentHTML = htmlMode ? content : (editor?.getHTML() || content)

    let finalSlug = slug;
    if (!finalSlug && title) {
      finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    }

    await onSave({
      title,
      content: currentHTML,
      excerpt,
      category: finalCategory,
      tags: tags.join(","),
      featuredImage,
      slug: finalSlug,
      published: isPublishing !== undefined ? isPublishing : published
    })
  }

  const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      {/* Title */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Article Title..."
        className="w-full text-3xl md:text-4xl font-black text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 tracking-tight"
      />

      {/* Meta Row */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 min-w-[200px] z-20">
          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Category</label>
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
              className="mt-1 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2 outline-none placeholder:text-slate-400 focus:border-primary/50"
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto text-[10px] text-slate-400 font-bold">
          <span>{wordCount} words</span>
          <span className="text-slate-200">•</span>
          <span>{readingTime} min read</span>
        </div>
      </div>

      {/* Featured Image */}
      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImagePlus className="h-3.5 w-3.5" />Featured Image</h4>
          <div className="flex gap-1">
            <button onClick={() => setFeaturedImageMode('url')} className={cn("text-[9px] px-2 py-1 rounded-lg font-bold", featuredImageMode === 'url' ? "bg-white text-primary shadow-sm" : "text-slate-400")}>URL</button>
            <button onClick={() => setFeaturedImageMode('upload')} className={cn("text-[9px] px-2 py-1 rounded-lg font-bold", featuredImageMode === 'upload' ? "bg-white text-primary shadow-sm" : "text-slate-400")}>Upload</button>
          </div>
        </div>
        {featuredImageMode === 'url' ? (
          <input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)}
            placeholder="https://example.com/image.jpg" className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2 outline-none placeholder:text-slate-300 focus:border-primary" />
        ) : (
          <label className="flex items-center justify-center gap-2 py-4 bg-white border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">{uploading ? 'Uploading...' : 'Click to upload (max 2MB)'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)} />
          </label>
        )}
        {featuredImage && (
          <div className="relative rounded-xl overflow-hidden border border-slate-100 max-h-48 mt-4 bg-white">
            <img src={featuredImage} alt="Featured" className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <Tag className="h-3.5 w-3.5 text-slate-400" />
        {tags.map(t => (
          <span key={t} className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 text-[10px] rounded-lg font-bold flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-200" onClick={() => removeTag(t)}>
            {t} <X className="h-3 w-3" />
          </span>
        ))}
        <input value={tagInput} onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder="Add tag and press Enter..." className="bg-transparent text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 w-48" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200">
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
          <ToolBtn icon={Link2} label="Link" onClick={() => {
            const url = prompt('Enter URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }} />
          <ToolBtn icon={Quote} label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <ToolBtn icon={Code} label="Code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
          <ToolBtn icon={ImagePlus} label="Image" onClick={handleInsertImage} />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolBtn icon={RotateCcw} label="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <ToolBtn icon={RotateCw} label="Redo" onClick={() => editor.chain().focus().redo().run()} />
        </>)}
        <div className="flex-1" />
        <button onClick={() => { setHtmlMode(!htmlMode); setPreviewMode(false) }} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors", htmlMode ? "bg-amber-100 text-amber-600" : "text-slate-500 hover:bg-slate-100")}>
          <Code2 className="h-3.5 w-3.5 inline mr-1" />HTML
        </button>
        <button onClick={() => { setPreviewMode(!previewMode); setHtmlMode(false) }} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors", previewMode ? "bg-emerald-100 text-emerald-600" : "text-slate-500 hover:bg-slate-100")}>
          <Eye className="h-3.5 w-3.5 inline mr-1" />Preview
        </button>
      </div>

      {/* Image Insert Dialog */}
      {showImageDialog && (
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest">Insert Image</h4>
            <button onClick={() => setShowImageDialog(false)} className="p-1 rounded-lg hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/60 rounded-xl">
            {(['upload', 'url', 'library'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setImageDialogTab(tab)
                  if (tab === 'library') fetchLibraryImages()
                }}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  imageDialogTab === tab
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
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
              <label className="flex flex-col items-center justify-center gap-3 py-8 bg-white border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                <Upload className="h-8 w-8 text-primary/40" />
                <span className="text-xs text-slate-500 font-medium">{uploading ? 'Uploading...' : 'Click to select or drag an image (max 2MB)'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleInlineUpload(e.target.files[0])} />
              </label>
            </div>
          )}

          {/* URL Tab */}
          {imageDialogTab === 'url' && (
            <div className="space-y-3">
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL..." className="w-full bg-white border border-primary/20 text-slate-900 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary" />
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
                <div className="text-center py-8 text-xs text-slate-400 font-medium">No images uploaded yet.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                  {libraryImages.map((img) => (
                    <button
                      key={img.filename}
                      onClick={() => insertImageIntoEditor(img.url)}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-slate-100"
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
          className="w-full min-h-[400px] bg-slate-900 border border-slate-200 rounded-2xl p-6 text-sm text-amber-300 font-mono outline-none resize-y shadow-inner" />
      ) : previewMode ? (
        <div className="w-full min-h-[400px] bg-slate-50 border border-slate-200 rounded-2xl p-6 prose prose-slate max-w-none shadow-inner
          [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-4
          [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-3
          [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-5
          [&_a]:text-primary [&_a]:underline
          [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:bg-primary/5 [&_blockquote]:py-1 [&_blockquote]:pr-4 [&_blockquote]:rounded-r-xl
          [&_pre]:bg-slate-900 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:text-sm [&_pre]:text-emerald-400
          [&_img]:rounded-2xl [&_img]:max-w-full [&_img]:my-6 [&_img]:border [&_img]:border-slate-100 [&_img]:shadow-sm
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-slate-600 [&_ul]:mb-5
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-slate-600 [&_ol]:mb-5
          [&_li]:mb-1.5"
          dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-inner">
          <EditorContent editor={editor} />
        </div>
      )}

      {/* Excerpt */}
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Excerpt (optional — auto-generated if empty)</label>
        <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
          placeholder="Brief summary for listings and SEO..."
          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 outline-none resize-none placeholder:text-slate-400 focus:border-primary focus:bg-white" />
      </div>

      {/* SEO & Slug Panel */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
        <button onClick={() => setShowSeo(!showSeo)} className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Globe className="h-3.5 w-3.5" />SEO & Permalink Settings</span>
          <span className="text-xs text-slate-400 font-bold">{showSeo ? '▲' : '▼'}</span>
        </button>
        {showSeo && (
          <div className="p-5 space-y-4 border-t border-slate-200 bg-white">
            <div>
              <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">URL Slug</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="custom-article-link"
                />
                <button
                  type="button"
                  onClick={handleSlugAutogenerate}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition"
                >
                  Auto
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-blue-600 text-[15px] font-medium truncate mb-0.5 hover:underline cursor-pointer">{title || 'Your engaging article title will appear here'}</p>
              <p className="text-emerald-700 text-xs truncate mb-1">
                growclinic.com/blog/{(slug || title)?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'article-slug'}
              </p>
              <p className="text-slate-500 text-sm line-clamp-2">{excerpt || content.replace(/<[^>]*>?/gm, '').substring(0, 160) || 'An automatic SEO-optimized description will be generated from your article excerpt or introductory paragraph to attract readers in Google Search results.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
            published ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          )}>{published ? 'Published' : 'Draft'}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-xs font-black uppercase tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-6" onClick={() => handleSave(false)} disabled={saving || !title}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button className="text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary-dark text-white rounded-xl px-8 shadow-md" onClick={() => handleSave(true)} disabled={saving || !title || !content}>
            {saving ? 'Publishing...' : 'Publish'}
          </Button>
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
        active ? "text-primary bg-primary/10" : "text-slate-500 hover:text-primary hover:bg-primary/10"
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
        className="flex items-center justify-between w-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 text-xs font-medium rounded-xl px-4 py-2 outline-none h-[42px] cursor-pointer shadow-sm">
        <span className="truncate">{selectedLabel || placeholder}</span>
        <span className="text-slate-400 text-[10px] ml-2 font-bold">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-2 w-full min-w-[200px] bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or type..."
              className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2 outline-none placeholder:text-slate-400 focus:border-primary/50"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar">
            {filtered.map(o => (
              <button key={o.id} type="button"
                onClick={() => { onChange(o.id); setIsOpen(false); setSearch("") }}
                className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium truncate hover:bg-slate-50 text-slate-700 transition-colors", value === o.id && "bg-primary/10 text-primary font-bold")}>
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && !allowCustom && (
              <div className="px-3 py-4 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase">No results found</div>
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
