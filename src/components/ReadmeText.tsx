import type { ReactNode } from 'react'

// A repository's README, shown without ever becoming HTML: it comes from GitHub, written by
// whoever owns the repository, and the renderer is no trust boundary to hand markup to
// (conventions.md). So this reads the few Markdown forms a plugin README is made of - headings,
// paragraphs, lists, fenced code, tables, inline code, bold and links - into React elements, and
// drops what it does not read: raw HTML tags lose their brackets, an image says its alt text.

/** Where a relative link in the README points: the file in the repository on github.com. */
function resolveHref(href: string, repoUrl: string): string | null {
  if (/^https?:\/\//i.test(href)) return href
  if (href.startsWith('#') || /^[a-z]+:/i.test(href)) return null
  return `${repoUrl.replace(/\/$/, '')}/blob/HEAD/${href.replace(/^\.?\//, '')}`
}

// Longer than this, a paragraph is shown as plain text. Each `[` can make the link pattern read to
// the end of the paragraph, so a paragraph of nothing but unclosed links costs its length squared:
// 120 KB of `[a](b ` held the window for over a second, and a README may be 256 KB. Below the limit,
// the worst a whole README of such paragraphs costs is about 160 ms (measured in Node); a real
// paragraph is far shorter, and one that is not loses only its links and bold, not its words.
const INLINE_LIMIT = 4000

function inline(text: string, repoUrl: string, key: string): ReactNode[] {
  if (text.length > INLINE_LIMIT) return [text]
  const out: ReactNode[] = []
  // Images first (their alt text stays), then code, links and bold, left to right. A link's title
  // starts after whitespace: `[^)\s]+[^)]*` let the two parts split the same run of characters every
  // way there is, and one unclosed link of 128 KB took 7.5 s (41st review, finding 4).
  const pattern = /!\[([^\]]*)\]\([^)]*\)|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)(?:\s[^)]*)?\)|\*\*([^*]+)\*\*|__([^_]+)__/g
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${key}-${n++}`
    if (m[1] !== undefined) {
      if (m[1]) out.push(<span key={k} className="text-text-muted">[{m[1]}]</span>)
    } else if (m[2] !== undefined) {
      out.push(
        <code key={k} className="rounded bg-ink/[0.06] px-1 font-mono text-[0.9em] dark:bg-ink/10">
          {m[2]}
        </code>
      )
    } else if (m[3] !== undefined) {
      const href = resolveHref(m[4], repoUrl)
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noreferrer" className="text-accent-text underline underline-offset-2 hover:no-underline">
            {inline(m[3], repoUrl, k)}
          </a>
        ) : (
          <span key={k}>{inline(m[3], repoUrl, k)}</span>
        )
      )
    } else {
      out.push(
        <strong key={k} className="font-semibold">
          {m[5] ?? m[6]}
        </strong>
      )
    }
    last = pattern.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// The two HTML strippers below are what `.replace(/<!--[\s\S]*?-->/g, '')` and
// `.replace(/<[^>\n]+>/g, '')` did, but in one pass: each regex read to the end of the text (or
// line) once per unclosed `<!--` or `<`, and 256 KB of either held the window for 5 and 13 s.
// Checked against both regexes on 200 000 random strings, no difference.
/** `text.replace(/<!--[\s\S]*?-->/g, '')`, without reading to the end once per unclosed `<!--`. */
function stripComments(text: string): string {
  let out = ''
  let i = 0
  for (;;) {
    const open = text.indexOf('<!--', i)
    if (open < 0) break
    const close = text.indexOf('-->', open + 4)
    if (close < 0) break
    out += text.slice(i, open)
    i = close + 3
  }
  return out + text.slice(i)
}

/** `text.replace(/<[^>\n]+>/g, '')`, the same way: a `<` whose line has no `>` after it skips the line. */
function stripTags(text: string): string {
  let out = ''
  let i = 0
  let close = -1
  for (;;) {
    const open = text.indexOf('<', i)
    if (open < 0) break
    if (close <= open) close = text.indexOf('>', open + 1)
    if (close < 0) break
    const eol = text.indexOf('\n', open + 1)
    if (eol >= 0 && eol < close) {
      out += text.slice(i, eol + 1)
      i = eol + 1
    } else if (close === open + 1) {
      out += text.slice(i, open + 1)
      i = open + 1
    } else {
      out += text.slice(i, open)
      i = close + 1
    }
  }
  return out + text.slice(i)
}

export default function ReadmeText({ text, repoUrl }: { text: string; repoUrl: string }): JSX.Element {
  const blocks: ReactNode[] = []
  // HTML comments and tags go before anything is read; what was between the tags stays.
  const lines = stripTags(stripComments(text))
    .replace(/\r\n?/g, '\n')
    .split('\n')
  let i = 0
  let paragraph: string[] = []
  const flush = (): void => {
    if (!paragraph.length) return
    const k = `p${blocks.length}`
    blocks.push(
      <p key={k} className="text-ui text-text-secondary">
        {inline(paragraph.join(' '), repoUrl, k)}
      </p>
    )
    paragraph = []
  }
  while (i < lines.length) {
    const line = lines[i]
    const fence = /^\s*(```|~~~)/.exec(line)
    if (fence) {
      flush()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith(fence[1])) code.push(lines[i++])
      i++
      blocks.push(
        <pre key={`c${blocks.length}`} className="overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
          {code.join('\n')}
        </pre>
      )
      continue
    }
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      flush()
      const k = `h${blocks.length}`
      blocks.push(
        <p key={k} className={heading[1].length <= 2 ? 'mt-1 text-heading font-semibold text-text' : 'mt-1 text-ui font-semibold text-text'}>
          {inline(heading[2], repoUrl, k)}
        </p>
      )
      i++
      continue
    }
    if (/^\s*\|/.test(line)) {
      flush()
      const rows: string[] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        if (!/^\s*\|[\s:|-]+\|?\s*$/.test(lines[i])) rows.push(lines[i].trim())
        i++
      }
      blocks.push(
        <pre key={`t${blocks.length}`} className="overflow-x-auto rounded-md border border-ink/[0.06] p-2 font-mono text-micro text-text-secondary dark:border-ink/10">
          {rows.join('\n')}
        </pre>
      )
      continue
    }
    const item = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (item) {
      flush()
      const ordered = /\d/.test(item[1])
      const items: string[] = []
      while (i < lines.length) {
        const next = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i])
        if (next) items.push(next[2])
        else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) items[items.length - 1] += ` ${lines[i].trim()}`
        else break
        i++
      }
      const k = `l${blocks.length}`
      const List = ordered ? 'ol' : 'ul'
      blocks.push(
        <List key={k} className={`${ordered ? 'list-decimal' : 'list-disc'} flex flex-col gap-0.5 pl-5 text-ui text-text-secondary`}>
          {items.map((entry, n) => (
            <li key={n}>{inline(entry, repoUrl, `${k}-${n}`)}</li>
          ))}
        </List>
      )
      continue
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line) || !line.trim()) {
      flush()
      i++
      continue
    }
    paragraph.push(line.replace(/^\s*>\s?/, '').trim())
    i++
  }
  flush()
  return <div className="flex min-w-0 flex-col gap-2 break-words">{blocks}</div>
}
