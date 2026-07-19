import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { ArchiveSeal } from '../ui/ArchiveSeal'

interface PlaceholderPageProps {
  title: string
  code: string
}

export function PlaceholderPage({ title, code }: PlaceholderPageProps) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <Card className="text-center py-16">
        <ArchiveSeal size={64} className="mx-auto mb-6 opacity-60" />
        <h1 className="font-display text-2xl font-bold text-archive-ivory mb-2">{title}</h1>
        <p className="text-sm text-archive-dust mb-4">该卷宗正在整理中</p>
        <Badge variant="ghost">{code}</Badge>
      </Card>
    </div>
  )
}
