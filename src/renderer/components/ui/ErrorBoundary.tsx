import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { logger } from '@/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('[ErrorBoundary] Caught rendering error:', error, info.componentStack)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40">
          <Card variant="elevated" padding="lg" className="max-w-sm text-center">
            <div className="mb-3 text-3xl">!</div>
            <Text as="h3" size="title" tone="primary" className="mb-2">
              Something went wrong
            </Text>
            <Text size="body" tone="muted" className="mb-5">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </Text>
            <Button variant="primary" size="md" onClick={this.handleRetry}>
              Try Again
            </Button>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
