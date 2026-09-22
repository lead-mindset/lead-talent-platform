import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowLeft } from 'lucide-react'
import { getCompanyById, getCompanyStats } from '@/lib/actions/admin/companies'
import { formatLeadDate } from '@/lib/utils/date-format'
import { ManageCompanyClient } from './manage-company-client'

export default async function CompanyManagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [company, stats] = await Promise.all([getCompanyById(id), getCompanyStats(id)])
  if (!company) notFound()
  const resolvedCompany = company ?? notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={resolvedCompany.name}
        description={`Creado el ${formatLeadDate(resolvedCompany.created_at)} por ${resolvedCompany.created_by_name ?? 'desconocido'}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/companies">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a empresas
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Representantes activos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats.active_recruiters}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Invitaciones pendientes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats.pending_invites}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Vistas de CV</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalViews}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Descargas de CV</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalDownloads}</CardContent>
        </Card>
      </div>

      <ManageCompanyClient company={resolvedCompany} />
    </div>
  )
}
