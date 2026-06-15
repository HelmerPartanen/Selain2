import type { Tab } from '@/store/tabStore'

export function normalizeTabUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    parsed.hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()
    return parsed.toString()
  } catch {
    return url.trim().toLowerCase()
  }
}

export function getTabDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Internal'
  }
}

export function findDuplicateTabIds(tabOrder: string[], tabs: Record<string, Tab>): Set<string> {
  const firstByUrl = new Map<string, string>()
  const duplicates = new Set<string>()
  for (const id of tabOrder) {
    const tab = tabs[id]
    if (!tab || tab.url === 'browser://newtab' || tab.url === 'about:blank') continue
    const key = normalizeTabUrl(tab.url)
    const first = firstByUrl.get(key)
    if (first) {
      duplicates.add(id)
    } else {
      firstByUrl.set(key, id)
    }
  }
  return duplicates
}

export function countDuplicateGroups(tabOrder: string[], tabs: Record<string, Tab>): number {
  const counts = new Map<string, number>()
  for (const id of tabOrder) {
    const tab = tabs[id]
    if (!tab || tab.url === 'browser://newtab' || tab.url === 'about:blank') continue
    const key = normalizeTabUrl(tab.url)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.values()).filter((count) => count > 1).length
}
