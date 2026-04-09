export type VarSource = 'override' | 'env' | 'temp' | 'none'

export function getVarAtCursor(text: string, pos: number): string | null {
  const re = /\{\{(\w*)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (pos > m.index && pos < m.index + m[0].length) return m[1] || null
  }
  return null
}

export function renderHighlightedUrl(
  text: string,
  onHoverEnter?: (name: string) => void,
  onHoverLeave?: () => void,
  onVarMouseDown?: (e: React.MouseEvent) => void,
): React.ReactNode {
  const re = /\{\{(\w*)\}\}|(?<!\{)\{(\w+)\}(?!\})/g
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const isDouble = m[1] !== undefined
    const varName = isDouble ? m[1] : m[2]
    if (m.index > last) parts.push(<span key={`t${m.index}`} className="pointer-events-none">{text.slice(last, m.index)}</span>)
    if (isDouble) {
      parts.push(
        <span
          key={`v${m.index}`}
          className="bg-orange-500/15 text-orange-400 rounded-sm pointer-events-auto cursor-default"
          onMouseEnter={varName && onHoverEnter ? () => onHoverEnter(varName) : undefined}
          onMouseLeave={varName ? onHoverLeave : undefined}
          onMouseDown={onVarMouseDown}
        >{m[0]}</span>
      )
    } else {
      parts.push(
        <span key={`e${m.index}`} className="bg-blue-500/10 text-blue-400 rounded-sm pointer-events-none">{m[0]}</span>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key="tail" className="pointer-events-none">{text.slice(last)}</span>)
  return parts.length ? <>{parts}</> : null
}

export function extractVars(text: string): string[] {
  const re = /\{\{(\w+)\}\}/g
  const seen: Record<string, boolean> = {}
  const result: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!seen[m[1]]) { seen[m[1]] = true; result.push(m[1]) }
  }
  return result
}

export function resolveVar(
  name: string,
  tempVars: Record<string, string>,
  overrides: Record<string, string>,
): { value: string; source: VarSource } {
  if (name in overrides) return { value: overrides[name], source: 'override' }
  if (name in tempVars) return { value: tempVars[name], source: 'temp' }
  return { value: '', source: 'none' }
}
