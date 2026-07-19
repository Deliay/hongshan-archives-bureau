import { useState, useMemo, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { useLocale } from './locale'
import { ASSET_BASE } from './adapter'
import { getCachedData } from './cache'
import { fetchTableAll, fetchTableDictAll } from './api'

const TAG_REGEX = /(<(?=\S)(@|#)?(.*?)>)|(<\/.*?>)|(\n)/g
const ATTR_REGEX = /(\w+)=(?:"([^"]*)"|(\S+))/g

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (;;) {
    const m = ATTR_REGEX.exec(raw)
    if (!m) break
    attrs[m[1]] = m[2] ?? m[3] ?? ''
  }
  return attrs
}

const ORPHAN_TAGS = new Set(['image', 'br'])

function isSpecialImageTag(match: RegExpExecArray): boolean {
  return match[0].startsWith('<image>')
}

function isImageTag(match: RegExpExecArray): boolean {
  return match[0].startsWith('<image')
}

function isOrphanTag(match: RegExpExecArray): boolean {
  if (match[5] !== undefined) return true
  const raw = match[3] ?? ''
  if (ORPHAN_TAGS.has(raw)) return true
  const attrs = parseAttrs(raw)
  const firstKey = Object.keys(attrs)[0] ?? ''
  if (isImageTag(match) && isSpecialImageTag(match)) return false
  return ORPHAN_TAGS.has(firstKey)
}

function getUISprite(path: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/${path.toLowerCase()}.png`
}

interface HyperlinkEntry {
  name?: Record<string, string>
  desc?: Record<string, string>
  iconPath?: string
}

let hyperlinkCache: Record<string, HyperlinkEntry> | null = null
let hyperlinkPromise: Promise<void> | null = null

function resolveRef(ref: any, i18nMap: Record<string, string> | null, locale: string): string {
  if (!ref) return ''
  if (typeof ref === 'string') return ref
  const dict = ref as Record<string, string>
  const id = String((ref as any).id ?? '')
  if (i18nMap && id && i18nMap[id]) return i18nMap[id]
  if (dict[locale]) return dict[locale]
  if (dict.CN) return dict.CN
  return (ref as any).text ?? ''
}

async function ensureHyperlinks(locale: string): Promise<void> {
  if (hyperlinkCache) return
  if (hyperlinkPromise) return hyperlinkPromise
  hyperlinkPromise = (async () => {
    try {
      const [raw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('HyperlinkTextTable', () => fetchTableAll('HyperlinkTextTable')),
        getCachedData<Record<string, string>>('HyperlinkTextTable_i18n_' + locale, () => fetchTableDictAll('HyperlinkTextTable', locale)).catch(() => null) as Promise<Record<string, string> | null>,
      ])
      hyperlinkCache = {}
      for (const [key, entry] of Object.entries(raw)) {
        hyperlinkCache[key] = {
          name: resolveRef(entry.name, i18nMap, locale) ? { [locale]: resolveRef(entry.name, i18nMap, locale) } : undefined,
          desc: resolveRef(entry.desc, i18nMap, locale) ? { [locale]: resolveRef(entry.desc, i18nMap, locale) } : undefined,
          iconPath: entry.iconPath ?? undefined,
        }
      }
    } catch {
      hyperlinkCache = {}
    }
  })()
  return hyperlinkPromise
}

const STYLE_COLORS: Record<string, string> = {
  'ba.natur': '#b4d945',
  'ba.naturalinflict': '#b4d945',
  'ba.fire': '#ff623d',
  'ba.fireinflict': '#ff623d',
  'ba.poise': '#ffbb03',
  'ba.poiseinflict': '#ffbb03',
  'ba.heal': '#26bbfd',
  'ba.shield': '#26bbfd',
  'ba.ice': '#21C6D0',
  'ba.thunder': '#ffc000',
}

interface TextSeg { type: 'text'; text: string }
interface BrSeg { type: 'br' }
interface ImageSeg { type: 'image'; path: string; scale?: number }
interface TagOpenSeg { type: 'tag-open'; tagName: string; attrs: Record<string, string>; prefix: string }
interface TagCloseSeg { type: 'tag-close' }
interface OrphanSeg { type: 'orphan'; tagName: string; attrs: Record<string, string> }
type RawSegment = TextSeg | BrSeg | ImageSeg | TagOpenSeg | TagCloseSeg | OrphanSeg

const COMMENT_OPEN = '/*'
const COMMENT_CLOSE = '*/'

function tokenize(text: string): RawSegment[] {
  const segments: RawSegment[] = []
  let lastIndex = 0
  TAG_REGEX.lastIndex = 0
  for (;;) {
    const nextCommentOpen = text.indexOf(COMMENT_OPEN, lastIndex)
    const nextCommentClose = text.indexOf(COMMENT_CLOSE, lastIndex)
    const match = TAG_REGEX.exec(text)
    const nextTagIndex = match ? match.index : -1
    const candidates: { index: number; type: 'open' | 'close' | 'tag' }[] = []
    if (nextCommentOpen !== -1) candidates.push({ index: nextCommentOpen, type: 'open' })
    if (nextCommentClose !== -1) candidates.push({ index: nextCommentClose, type: 'close' })
    if (nextTagIndex !== -1) candidates.push({ index: nextTagIndex, type: 'tag' })
    if (candidates.length === 0) break
    candidates.sort((a, b) => a.index - b.index)
    const earliest = candidates[0]
    const prefix = text.slice(lastIndex, earliest.index)
    if (prefix) segments.push({ type: 'text', text: prefix })
    if (earliest.type === 'open') {
      segments.push({ type: 'tag-open', tagName: 'comment', attrs: {}, prefix: '' })
      lastIndex = earliest.index + COMMENT_OPEN.length
      TAG_REGEX.lastIndex = lastIndex
    } else if (earliest.type === 'close') {
      segments.push({ type: 'tag-close' })
      lastIndex = earliest.index + COMMENT_CLOSE.length
      TAG_REGEX.lastIndex = lastIndex
    } else {
      lastIndex = match!.index + match![0].length
      if (match![5] !== undefined) {
        segments.push({ type: 'br' })
      } else if (match![0].startsWith('</')) {
        segments.push({ type: 'tag-close' })
      } else {
        const raw = match![3] ?? ''
        const pfx = match![2] ?? ''
        if (isOrphanTag(match!)) {
          const attrs = parseAttrs(raw)
          const firstKey = Object.keys(attrs)[0] ?? raw
          segments.push({ type: 'orphan', tagName: firstKey, attrs })
        } else {
          segments.push({ type: 'tag-open', tagName: raw, attrs: parseAttrs(raw), prefix: pfx })
        }
      }
    }
  }
  const rest = text.slice(lastIndex)
  if (rest) segments.push({ type: 'text', text: rest })
  return segments
}

interface TreeNode {
  type: 'root' | 'text' | 'br' | 'image' | 'tag' | 'hyperlink'
  text?: string
  path?: string
  scale?: number
  tagName?: string
  attrs?: Record<string, string>
  prefix?: string
  children: TreeNode[]
}

function buildTree(segments: RawSegment[]): TreeNode {
  const root: TreeNode = { type: 'root', children: [] }
  const stack: TreeNode[] = [root]
  for (const seg of segments) {
    const parent = stack[stack.length - 1]
    switch (seg.type) {
      case 'text':
        parent.children.push({ type: 'text', text: seg.text, children: [] })
        break
      case 'br':
        parent.children.push({ type: 'br', children: [] })
        break
      case 'orphan':
        if (seg.tagName === 'image') {
          parent.children.push({ type: 'image', path: seg.attrs.image ?? '', scale: seg.attrs.scale ? Number(seg.attrs.scale) : undefined, children: [] })
        } else if (seg.tagName === 'br') {
          parent.children.push({ type: 'br', children: [] })
        }
        break
      case 'tag-open':
        if (seg.prefix === '#' || seg.prefix === '@') {
          const node: TreeNode = { type: 'hyperlink', tagName: seg.tagName, prefix: seg.prefix, children: [] }
          parent.children.push(node)
          stack.push(node)
        } else {
          const tagName = Object.keys(seg.attrs)[0] ?? seg.tagName
          const node: TreeNode = { type: 'tag', tagName, attrs: seg.attrs, children: [] }
          parent.children.push(node)
          stack.push(node)
        }
        break
      case 'tag-close':
        if (stack.length > 1) stack.pop()
        break
    }
  }
  for (let i = stack.length - 1; i > 0; i--) {
    const node = stack[i]
    if (node.type === 'tag' && node.tagName === 'image' && Object.keys(node.attrs ?? {}).length === 0 && node.children.length > 0 && node.children.every(c => c.type === 'text')) {
      const path = node.children.map(c => (c as any).text ?? '').join('')
      root.children = root.children.filter(c => c !== node)
      const imgNode: TreeNode = { type: 'image', path, children: [] }
      const parent = stack[i - 1]
      parent.children = parent.children.map(c => c === node ? imgNode : c)
    }
  }
  return root
}

function wrapTag(tagName: string, attrs: Record<string, string>, children: ReactNode): ReactNode {
  switch (tagName) {
    case 'color': return <span style={{ color: attrs.color }}>{children}</span>
    case 'mark': return <span style={{ backgroundColor: attrs.mark, color: '#0A0A0D' }}>{children}</span>
    case 'b': return <b>{children}</b>
    case 'align': return <span>{children}</span>
    case 'comment': return <span style={{ color: 'var(--color-archive-lead)', fontSize: '0.75rem' }}>{children}</span>
    default: return <span>{children}</span>
  }
}

function renderNode(node: TreeNode, showTips?: boolean): ReactNode {
  switch (node.type) {
    case 'root':
      return node.children.map((child, i) => <span key={i}>{renderNode(child, showTips)}</span>)
    case 'text':
      return node.text
    case 'br':
      return <br />
    case 'image': {
      const scale = node.scale ?? 1
      return (
        <img alt="" src={getUISprite(node.path!)}
          style={{ width: '1rem', transform: scale !== 1 ? `scale(${scale})` : undefined }}
          className="inline-block align-middle"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )
    }
    case 'tag': {
      const children = node.children.map((child, i) => <span key={i}>{renderNode(child, showTips)}</span>)
      if (node.tagName === 'image') return <span>{children}</span>
      return wrapTag(node.tagName!, node.attrs ?? {}, children)
    }
    case 'hyperlink': {
      const children = node.children.map((child, i) => <span key={i}>{renderNode(child, showTips)}</span>)
      if (node.prefix === '#') {
        return <HyperlinkTag tag={node.tagName!} showTips={showTips}><u>{children}</u></HyperlinkTag>
      }
      if (node.tagName && STYLE_COLORS[node.tagName]) {
        return <span style={{ color: STYLE_COLORS[node.tagName] }}>{children}</span>
      }
      return <span>{children}</span>
    }
    default:
      return null
  }
}

function HyperlinkTag({ tag, children, showTips }: { tag: string; children: ReactNode; showTips?: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const handleClick = useCallback(() => setShowTooltip(v => !v), [])
  const handleClose = useCallback(() => setShowTooltip(false), [])
  const realShow = showTips !== false && showTooltip
  return (
    <>
      <button type="button" ref={ref}
        className="inline text-archive-gold underline cursor-pointer hover:text-[#d4b87a] transition-colors bg-transparent border-0 p-0 font-inherit"
        onClick={handleClick}>{children}</button>
      {realShow && <HyperlinkTooltip tag={tag} anchorRef={ref} onClose={handleClose} />}
    </>
  )
}

function HyperlinkTooltip({ tag, anchorRef, onClose }: { tag: string; anchorRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const [data, setData] = useState<{ name?: string; desc?: string; iconPath?: string } | null>(null)
  const { locale } = useLocale()
  const tooltipRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ensureHyperlinks(locale).then(() => {
      if (hyperlinkCache) {
        const entry = hyperlinkCache[tag]
        if (entry) {
          const name = entry.name ? (entry.name[locale] || entry.name.CN || '') : undefined
          const desc = entry.desc ? (entry.desc[locale] || entry.desc.CN || '') : undefined
          setData({ name, desc, iconPath: entry.iconPath })
        } else {
          setData({ name: tag, desc: undefined })
        }
      }
    })
  }, [tag, locale])
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = anchorRef.current
      const tooltip = tooltipRef.current
      if (anchor && tooltip && !anchor.contains(e.target as Node) && !tooltip.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!data || !tooltipRef.current) return
    const el = anchorRef.current
    if (!el) return
    const anchorRect = el.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const gap = 8
    let top = anchorRect.bottom + gap
    let left = anchorRect.left
    if (top + tooltipRect.height > window.innerHeight) {
      top = anchorRect.top - tooltipRect.height - gap
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - gap
    }
    if (left < 0) left = gap
    if (top < 0) top = gap
    setPos({ top, left })
  }, [data, anchorRef])

  if (!data) return null
  return (
    <div ref={tooltipRef} className="fixed z-50 p-3 rounded border border-archive-border bg-archive-file shadow-lg max-w-xs"
      style={{ top: pos.top, left: pos.left, visibility: pos.top === 0 && pos.left === 0 ? 'hidden' : 'visible' }}>
      {data.iconPath && <img src={getUISprite(data.iconPath)} alt="" className="w-6 h-6 mb-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
      {data.name && <div className="text-xs text-archive-gold font-medium mb-1"><RichText text={data.name} /></div>}
      {data.desc && <div className="text-xs text-archive-ivory leading-relaxed"><RichText text={data.desc} /></div>}
      <div className="text-[10px] text-archive-lead mt-1 font-mono truncate">{tag}</div>
    </div>
  )
}

interface RichTextProps {
  text: string
  showTips?: boolean
  formatter?: (text: string) => string
}

export function RichText({ text, formatter }: RichTextProps) {
  const processed = formatter ? formatter(text) : text
  const tree = useMemo(() => {
    const segments = tokenize(processed)
    return buildTree(segments)
  }, [processed])
  return renderNode(tree, true)
}

interface I18NTextProps {
  ref: { id?: number | string; text?: string } | null | undefined
  showTips?: boolean
  formatter?: (text: string) => string
  i18nMap?: Record<string, string>
}

export function I18NText({ ref, formatter, i18nMap }: I18NTextProps) {
  const { locale } = useLocale()
  const text = resolveI18nText(ref, i18nMap, locale)
  if (!text) return null
  return <RichText text={text} formatter={formatter} />
}

function resolveI18nText(ref: { id?: number | string; text?: string } | null | undefined, i18nMap?: Record<string, string>, locale?: string): string {
  if (!ref) return ''
  const id = String(ref.id ?? '')
  if (i18nMap && id && i18nMap[id]) return i18nMap[id]
  if (locale && (ref as any)[locale]) return (ref as any)[locale]
  return ref.text ?? ''
}
