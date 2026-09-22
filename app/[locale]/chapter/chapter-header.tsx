'use client'

import { BoardGuideDialog } from '@/components/board-guide-dialog'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import type { ChapterRoleLevel } from '@/lib/services/chapter-permission.service'

export function ChapterHeader({
  roleLevel,
  title,
  subtitle,
  children,
}: {
  roleLevel: ChapterRoleLevel | null
  title: string
  subtitle: string
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          roleLevel ? (
            <BoardGuideDialog roleLevel={roleLevel}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                <Icons.HelpCircle className="h-5 w-5" />
              </Button>
            </BoardGuideDialog>
          ) : null
        }
      />
      {children}
    </div>
  )
}