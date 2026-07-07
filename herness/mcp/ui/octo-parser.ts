import {
  OctoNode,
  OctoParseOptions,
  HernessNode,
  HernessScreen,
  HernessUIType,
} from '../../shared/types/ui'

const DEFAULT_OPTIONS: Required<OctoParseOptions> = {
  namingHints: {},
  defaultLayout: { direction: 'column' },
  componentHeightThreshold: 44,
  headingFontSizeThreshold: 18,
  headingBoldThreshold: 600,
  textAsLabelThreshold: 4,
  ignoreHidden: true,
  ignoreLocked: false,
  logUnknown: false,
}

type ResolvedFill = { color: string; opacity: number }

function resolveColor(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  const c = raw as { r: number; g: number; b: number; a?: number }
  const a = c.a ?? 1
  if (a < 1) return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`
  return `#${hex(c.r)},${hex(c.g)},${hex(c.b)}`
    .replace(/,/g, '')
    .replace(/^#/, '#')
    .replace(/#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3')
}

function hex(v: number): string {
  return Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase()
}

function resolveFills(fills: unknown[] | undefined): ResolvedFill[] {
  if (!fills || !Array.isArray(fills)) return []
  return fills.map(f => ({
    color: resolveColor(f),
    opacity: typeof f === 'object' && (f as Record<string, unknown>).a !== undefined
      ? (f as Record<string, unknown>).a as number
      : 1,
  }))
}

function getW(node: OctoNode): number {
  return (node.w ?? node.width ?? 0) as number
}
function getH(node: OctoNode): number {
  return (node.h ?? node.height ?? 0) as number
}
function getX(node: OctoNode): number {
  return (node.x ?? 0) as number
}
function getY(node: OctoNode): number {
  return (node.y ?? 0) as number
}

function getChildren(node: OctoNode): OctoNode[] {
  const c = (node.children ?? node.childNodes) as OctoNode[] | undefined
  return Array.isArray(c) ? c : []
}

function getBackgroundFill(node: OctoNode): string | null {
  const fills = resolveFills((node.fills ?? []) as unknown[])
  if (!fills.length) {
    if (node.fill) return resolveColor(node.fill)
    return null
  }
  if (fills.length === 1) return fills[0].color
  for (const f of fills) {
    if (f.opacity >= 0.9) return f.color
  }
  return fills[0].color
}

function getBorderColor(node: OctoNode): string | null {
  const strokes = resolveFills((node.strokes ?? []) as unknown[])
  if (!strokes.length) {
    if (node.stroke) return resolveColor(node.stroke)
    return null
  }
  return strokes[0].color
}

function getBorderWidth(node: OctoNode): number {
  return ((node.strokeWeight ?? node.strokeWidth ?? 0) as number)
}

function getCornerRadius(node: OctoNode): number {
  return ((node.cornerRadius ?? node.borderRadius ?? 0) as number)
}

function isVisible(node: OctoNode, opts: Required<OctoParseOptions>): boolean {
  if (opts.ignoreHidden && node.visible === false) return false
  if (opts.ignoreLocked && node.locked === true) return false
  return true
}

function hasRectangularShape(node: OctoNode): boolean {
  const t = node.type?.toUpperCase?.() ?? ''
  return ['RECTANGLE', 'FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'].includes(t)
    || t === 'SLICE'
}

function getWidth(node: OctoNode): number | string {
  const w = getW(node)
  return w > 0 ? w : '100%'
}
function getHeight(node: OctoNode): number | string {
  const h = getH(node)
  return h > 0 ? h : 'auto'
}

export function parseOctoJSON(root: OctoNode, options?: OctoParseOptions): HernessScreen {
  const opts: Required<OctoParseOptions> = { ...DEFAULT_OPTIONS, ...options }
  if (options?.namingHints) opts.namingHints = options.namingHints
  if (options?.defaultLayout) opts.defaultLayout = options.defaultLayout

  const children = getChildren(root).filter(n => isVisible(n, opts))
  const parsed = children.map(n => parseNode(n, opts))

  const rawName: string = (root.name ?? root.text ?? root.characters ?? 'untitled') as string
  const pageName = rawName.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '') || 'untitled'

  return {
    name: pageName,
    title: pageName,
    layout: 'fullscreen',
    children: parsed,
  }
}

function parseNode(node: OctoNode, opts: Required<OctoParseOptions>): HernessNode {
  const t = node.type?.toUpperCase?.() ?? ''
  const name = (node.name?.toLowerCase() ?? '')
  const childNodes = getChildren(node).filter(n => isVisible(n, opts))

  const hint = detectNamingHint(name, opts.namingHints)
  if (hint) return buildNode(hint, node, childNodes, opts)

  if (t === 'TEXT') return parseText(node, opts)
  if (t === 'LINE') return parseLine(node, opts)
  if (t === 'IMAGE' || t === 'VECTOR' || t === 'ELLIPSE' || t === 'POLYGON' || t === 'STAR') {
    return parseImageLike(node, opts)
  }
  if (t === 'FRAME' || t === 'GROUP' || t === 'COMPONENT' || t === 'INSTANCE') {
    return parseFrame(node, childNodes, opts)
  }
  if (t === 'RECTANGLE') {
    return parseRectangle(node, childNodes, opts)
  }
  if (t === 'SLICE') {
    return { type: 'container', props: {}, children: [] }
  }

  if (opts.logUnknown) {
    process.stderr.write(`[octo-parser] Unknown node type: ${t}\n`)
  }
  return {
    type: 'container',
    name: node.name,
    props: { _octoType: t },
    children: childNodes.length > 0 ? childNodes.map(n => parseNode(n, opts)) : [],
    layout: opts.defaultLayout,
  }
}

function detectNamingHint(name: string, hints: Record<string, HernessUIType>): HernessUIType | null {
  if (!name) return null
  for (const [pattern, type] of Object.entries(hints)) {
    if (name.includes(pattern)) return type
  }
  return null
}

function buildNode(type: HernessUIType, node: OctoNode, children: OctoNode[], opts: Required<OctoParseOptions>): HernessNode {
  const bg = getBackgroundFill(node)
  return {
    type,
    name: node.name,
    props: buildProps(node, type),
    children: children.length > 0 ? children.map(n => parseNode(n, opts)) : [],
    layout: opts.defaultLayout,
    style: bg ? { backgroundColor: bg, borderRadius: getCornerRadius(node) } : undefined,
  }
}

function parseRectangle(node: OctoNode, children: OctoNode[], opts: Required<OctoParseOptions>): HernessNode {
  const w = getW(node)
  const h = getH(node)
  const bg = getBackgroundFill(node)
  const borderColor = getBorderColor(node)
  const borderWidth = getBorderWidth(node)
  const radius = getCornerRadius(node)

  if (children.length === 1) {
    const child = children[0]
    const childType = child.type?.toUpperCase?.() ?? ''

    if (childType === 'TEXT') {
      const text = child.text ?? child.characters ?? ''
      const fontSize = child.fontSize

      if (h > 0 && h < opts.componentHeightThreshold * 1.5 && bg && w > 0 && text.length > 0 && (!fontSize || fontSize < opts.headingFontSizeThreshold)) {
        return {
          type: text.length <= opts.textAsLabelThreshold ? 'badge' : 'button',
          name: node.name,
          props: { text },
          style: {
            backgroundColor: bg,
            borderRadius: radius > 0 ? radius : undefined,
            borderColor: borderColor || undefined,
            borderWidth: borderWidth || undefined,
            width: getWidth(node),
            height: getHeight(node),
          },
        }
      }

      return {
        type: 'card',
        name: node.name,
        props: {},
        children: [{ type: 'text', props: { content: text }, style: { fontSize, fontWeight: child.fontWeight } }],
        style: {
          backgroundColor: bg || undefined,
          borderRadius: radius || undefined,
          borderColor: borderColor || undefined,
          borderWidth: borderWidth || undefined,
          width: getWidth(node),
          height: getHeight(node),
        },
        layout: opts.defaultLayout,
      }
    }
  }

  const hasBorder = borderWidth > 0 && borderColor
  const noFill = !bg || bg === 'transparent' || bg === 'rgba(0,0,0,0)'

  if (hasBorder && noFill && children.length <= 1 && w > 60) {
    const textChildren = children.filter(c => (c.type?.toUpperCase?.() ?? '') === 'TEXT')
    if (textChildren.length === 1) {
      return {
        type: 'input',
        name: node.name,
        props: { placeholder: textChildren[0].text ?? textChildren[0].characters ?? '', name: node.name ?? '' },
        style: {
          borderRadius: radius || undefined,
          borderColor: borderColor || undefined,
          borderWidth,
          width: getWidth(node),
          height: getHeight(node),
        },
      }
    }
  }

  const layout: HernessNode['layout'] = { direction: 'column' }
  if (children.length >= 3) {
    const rows = detectTable(children)
    if (rows > 1) {
      return {
        type: 'table',
        name: node.name,
        props: { rows },
        children: children.map(n => parseNode(n, opts)),
        style: {
          backgroundColor: bg || undefined,
          borderRadius: radius || undefined,
          borderColor: borderColor || undefined,
          borderWidth: borderWidth || undefined,
          width: getWidth(node),
        },
      }
    }
  }

  return {
    type: children.length > 0 ? 'container' : 'spacer',
    name: node.name,
    props: {},
    children: children.map(n => parseNode(n, opts)),
    layout,
    style: {
      backgroundColor: bg || undefined,
      borderRadius: radius || undefined,
      borderColor: borderColor || undefined,
      borderWidth: borderWidth || undefined,
      width: getWidth(node),
      height: getHeight(node),
    },
  }
}

function parseText(node: OctoNode, opts: Required<OctoParseOptions>): HernessNode {
  const text = (node.text ?? node.characters ?? '') as string
  const fontSize = (node.fontSize ?? 14) as number
  const fontWeight = (node.fontWeight ?? 400) as number
  const align = (node.textAlign ?? 'left') as string

  if (fontSize >= opts.headingFontSizeThreshold && (fontWeight >= opts.headingBoldThreshold || fontSize >= 24)) {
    const level = fontSize >= 28 ? 1 : fontSize >= 22 ? 2 : 3
    return {
      type: 'heading',
      name: node.name,
      props: { text, level },
      style: { fontSize, fontWeight, textAlign: align as 'left' | 'center' | 'right' },
    }
  }

  if (text.length <= opts.textAsLabelThreshold) {
    return {
      type: 'label',
      name: node.name,
      props: { text },
      style: { fontSize, fontWeight, textAlign: align as 'left' | 'center' | 'right' },
    }
  }

  return {
    type: 'text',
    name: node.name,
    props: { content: text },
    style: { fontSize, fontWeight, textAlign: align as 'left' | 'center' | 'right' },
  }
}

function parseLine(node: OctoNode, _opts: Required<OctoParseOptions>): HernessNode {
  return {
    type: 'divider',
    name: node.name,
    props: {},
    style: { width: getWidth(node) },
  }
}

function parseImageLike(node: OctoNode, _opts: Required<OctoParseOptions>): HernessNode {
  const t = node.type?.toUpperCase?.() ?? ''
  return {
    type: t === 'VECTOR' || t === 'ELLIPSE' || t === 'POLYGON' || t === 'STAR' ? 'icon' : 'image',
    name: node.name,
    props: { src: '', alt: node.name ?? '' },
    style: { width: getWidth(node), height: getHeight(node) },
  }
}

function parseFrame(node: OctoNode, children: OctoNode[], opts: Required<OctoParseOptions>): HernessNode {
  const bg = getBackgroundFill(node)
  const radius = getCornerRadius(node)
  const borderColor = getBorderColor(node)
  const borderWidth = getBorderWidth(node)
  const name = (node.name?.toLowerCase() ?? '')

  const layout: HernessNode['layout'] = detectLayout(children)

  if (name.includes('nav') || name.includes('header') || name.includes('top') || name.includes('bar')) {
    return {
      type: 'navbar',
      name: node.name,
      props: {},
      children: children.map(n => parseNode(n, opts)),
      layout: { direction: 'row', align: 'center', gap: 8 },
      style: {
        backgroundColor: bg || '#fff',
        borderRadius: radius || undefined,
        borderColor: borderColor || undefined,
        borderWidth: borderWidth || undefined,
        width: getWidth(node),
        height: getHeight(node),
      },
    }
  }
  if (name.includes('side') || name.includes('aside')) {
    return {
      type: 'sidebar',
      name: node.name,
      props: {},
      children: children.map(n => parseNode(n, opts)),
      layout: { direction: 'column' },
      style: {
        backgroundColor: bg || undefined,
        width: getWidth(node),
        height: getHeight(node),
      },
    }
  }
  if (name.includes('footer') || name.includes('bottom')) {
    return {
      type: 'footer',
      name: node.name,
      props: {},
      children: children.map(n => parseNode(n, opts)),
      layout: { direction: 'row' },
      style: {
        backgroundColor: bg || '#f5f5f5',
        width: getWidth(node),
        height: getHeight(node),
      },
    }
  }
  if (name.includes('modal') || name.includes('dialog') || name.includes('popup')) {
    return {
      type: 'modal',
      name: node.name,
      props: {},
      children: children.map(n => parseNode(n, opts)),
      layout: { direction: 'column', padding: 16 },
      style: {
        backgroundColor: bg || '#fff',
        borderRadius: radius || 8,
        width: getWidth(node),
      },
    }
  }
  if (name.includes('form')) {
    return {
      type: 'form',
      name: node.name,
      props: {},
      children: children.map(n => parseNode(n, opts)),
      layout: { direction: 'column', gap: 12 },
      style: {
        backgroundColor: bg || undefined,
        borderRadius: radius || undefined,
        width: getWidth(node),
      },
    }
  }
  if (name.includes('tabs') || name.includes('tab')) {
    return {
      type: 'tabs',
      name: node.name,
      props: {},
      children: children.map(n => parseNode(n, opts)),
      layout: { direction: 'row', gap: 0 },
      style: { backgroundColor: bg || undefined, width: getWidth(node) },
    }
  }

  return {
    type: 'container',
    name: node.name,
    props: {},
    children: children.map(n => parseNode(n, opts)),
    layout,
    style: {
      backgroundColor: bg || undefined,
      borderRadius: radius || undefined,
      borderColor: borderColor || undefined,
      borderWidth: borderWidth || undefined,
      width: getWidth(node),
      height: getHeight(node),
    },
  }
}

function detectLayout(children: OctoNode[]): HernessNode['layout'] | undefined {
  if (children.length < 2) return { direction: 'column' }
  const xs = children.filter(n => (n.x ?? 0) as number > 0).map(n => getX(n))
  const ys = children.filter(n => (n.y ?? 0) as number > 0).map(n => getY(n))

  if (xs.length >= 2) {
    const sortedX = [...xs].sort((a, b) => a - b)
    const sameRowCount = xs.filter(x => Math.abs(x - sortedX[0]) < 5).length
    if (sameRowCount < xs.length) {
      const avgGap = sortedX.slice(1).reduce((s, x, i) => s + (x - sortedX[i]), 0) / (sortedX.length - 1)
      return { direction: 'row', gap: Math.round(avgGap) || undefined }
    }
  }
  if (ys.length >= 2) {
    const sortedY = [...ys].sort((a, b) => a - b)
    const sameColCount = ys.filter(y => Math.abs(y - sortedY[0]) < 5).length
    if (sameColCount < ys.length) {
      const avgGap = sortedY.slice(1).reduce((s, y, i) => s + (y - sortedY[i]), 0) / (sortedY.length - 1)
      return { direction: 'column', gap: Math.round(avgGap) || undefined }
    }
  }
  return { direction: 'column' }
}

function detectTable(children: OctoNode[]): number {
  if (children.length < 4) return 0
  const ys = children.filter(n => (n.y ?? 0) as number > 0).map(n => getY(n))
  if (ys.length < 4) return 0
  const clusters = new Set<number>()
  for (const y of ys) {
    let found = false
    for (const c of clusters) {
      if (Math.abs(y - c) < 8) { found = true; break }
    }
    if (!found) clusters.add(y)
  }
  return clusters.size
}

function buildProps(node: OctoNode, _type: HernessUIType): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  const text = node.text ?? node.characters
  if (text) props.text = text
  if (node.name) props.name = node.name
  return props
}
