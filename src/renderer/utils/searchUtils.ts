export interface SearchSuggestion {
  phrase: string
}

export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.trim().length === 0) return []
  
  try {
    // DuckDuckGo autocomplete API
    const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`)
    if (!response.ok) return []
    
    const data = await response.json()
    // DuckDuckGo returns an array where the second element is an array of suggestions
    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
      return data[1]
    }
    return []
  } catch (error) {
    console.error('Failed to fetch search suggestions:', error)
    return []
  }
}
