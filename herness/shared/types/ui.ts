export type HernessUIType =
  | 'screen' | 'container' | 'card' | 'form' | 'table' | 'grid'
  | 'button' | 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'switch'
  | 'heading' | 'paragraph' | 'label' | 'link' | 'text'
  | 'image' | 'icon' | 'divider' | 'spacer' | 'avatar' | 'badge' | 'tag'
  | 'navbar' | 'sidebar' | 'footer' | 'menu' | 'tabs'
  | 'list' | 'list_item' | 'dropdown' | 'modal' | 'tooltip'

export interface HernessNode {
  type: HernessUIType
  name?: string
  props: Record<string, unknown>
  children?: HernessNode[]
  layout?: {
    direction?: 'row' | 'column' | 'grid'
    gap?: number
    padding?: number | { top: number; right: number; bottom: number; left: number }
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
    wrap?: boolean
    columns?: number
  }
  style?: {
    width?: number | string
    height?: number | string
    maxWidth?: number | string
    backgroundColor?: string
    borderColor?: string
    borderRadius?: number
    borderWidth?: number
    shadow?: string
    margin?: number | { top: number; right: number; bottom: number; left: number }
    fontSize?: number
    fontWeight?: number | string
    color?: string
    textAlign?: 'left' | 'center' | 'right'
  }
}

export interface HernessScreen {
  name: string
  title?: string
  layout: 'centered' | 'fullscreen' | 'sidebar' | 'header-content' | 'custom'
  maxWidth?: number
  children: HernessNode[]
}

export type OctoNodeType = 'RECTANGLE' | 'TEXT' | 'LINE' | 'VECTOR' | 'FRAME' | 'GROUP'
  | 'IMAGE' | 'ELLIPSE' | 'POLYGON' | 'STAR' | 'COMPONENT' | 'INSTANCE'
  | 'SLICE' | 'CANVAS' | 'DOCUMENT'

export interface OctoNode {
  id?: string
  name?: string
  type: string
  x?: number
  y?: number
  w?: number
  h?: number
  width?: number
  height?: number
  fill?: string | { r: number; g: number; b: number; a?: number }
  stroke?: string | { r: number; g: number; b: number; a?: number }
  strokeWeight?: number
  strokeWidth?: number
  cornerRadius?: number
  borderRadius?: number
  opacity?: number
  visible?: boolean
  locked?: boolean
  text?: string
  characters?: string
  fontSize?: number
  fontWeight?: string | number
  fontFamily?: string
  textAlign?: string
  textColor?: string
  fills?: Array<string | { r: number; g: number; b: number; a?: number }>
  strokes?: Array<string | { r: number; g: number; b: number; a?: number }>
  children?: OctoNode[]
  childNodes?: OctoNode[]
  [key: string]: unknown
}

export interface OctoParseOptions {
  namingHints?: Record<string, HernessUIType>
  defaultLayout?: HernessNode['layout']
  componentHeightThreshold?: number
  headingFontSizeThreshold?: number
  headingBoldThreshold?: number
  textAsLabelThreshold?: number
  ignoreHidden?: boolean
  ignoreLocked?: boolean
  logUnknown?: boolean
}

export interface DSLValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export interface DSLValidationResult {
  valid: boolean
  errors: DSLValidationError[]
}
