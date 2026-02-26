import { logger } from '@/utils/logger'

export interface SearchSuggestion {
  phrase: string
}

export async function fetchSearchSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
  if (!query || query.trim().length === 0) return []

  try {
    // DuckDuckGo autocomplete API via IPC to avert CORS
    const data = await window.electronAPI.fetchSearchSuggestions(query)
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    // DuckDuckGo can return either [{ phrase: string }] or [query, string[]].
    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
      return data[1].filter((item): item is string => typeof item === 'string')
    }
    if (Array.isArray(data)) {
      return data
        .map((item) => (item && typeof item === 'object' && 'phrase' in item ? (item as SearchSuggestion).phrase : ''))
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
    }
    return []
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    logger.error('Failed to fetch search suggestions:', error)
    return []
  }
}
