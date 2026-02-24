export interface SearchSuggestion {
  phrase: string
}

export async function fetchSearchSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
  if (!query || query.trim().length === 0) return []
  
  try {
    // DuckDuckGo autocomplete API
    const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`, { signal })
    if (!response.ok) return []
    
    const data = await response.json()
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
    console.error('Failed to fetch search suggestions:', error)
    return []
  }
}
