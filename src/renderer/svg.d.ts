declare module '*.svg?raw' {
  const content: string
  export default content
}

declare module '*.svg' {
  const url: string
  export default url
}

declare module '*.png' {
  const url: string
  export default url
}

declare module '*.jpg' {
  const url: string
  export default url
}

declare module '*.jpeg' {
  const url: string
  export default url
}

declare module '*.webp' {
  const url: string
  export default url
}
