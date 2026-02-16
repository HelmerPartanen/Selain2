import { BrowserLayout } from '@/components/layout/BrowserLayout'
import { useThemeApplicator } from '@/theme/useThemeApplicator'

export default function App(): React.JSX.Element {
  useThemeApplicator()
  return <BrowserLayout />
}
