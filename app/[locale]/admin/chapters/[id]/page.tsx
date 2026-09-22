import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/routing'
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { getProtectedLeadershipInviteState } from '@/lib/actions/admin/chapter-invites'
import { getChapterById } from '@/lib/actions/admin/chapters'
import { getChapterMembers } from '@/lib/actions/admin/get-data'
import { formatLeadDate } from '@/lib/utils/date-format'
import { ProtectedLeadershipInvites } from './protected-leadership-invites'
import { OnboardPresidentPanel } from './onboard-president-panel'

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params
  const chapter = await getChapterById(id)

  if (!chapter) notFound()
  const resolvedChapter = chapter ?? notFound()
  const members = await getChapterMembers(resolvedChapter.id)
  const protectedLeadership = await getProtectedLeadershipInviteState(resolvedChapter.id)
  const approved_members  = members.filter(m => m.chapter_membership?.status === 'approved')
  const pending_members   = members.filter(m => m.person_profile && m.chapter_membership?.status === 'pending')
  const rejected_members  = members.filter(m => m.chapter_membership?.status === 'rejected')
  const incomplete_members = members.filter(m => !m.person_profile)

  return (
    <div className="space-y-8">
      <PageHeader
        title={resolvedChapter.name}
        description={resolvedChapter.university}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/chapters">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a capítulos
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Miembros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Miembros del chapter</p>
            </CardContent>
          </Card>

          {(resolvedChapter.city || resolvedChapter.region) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ubicacion</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resolvedChapter.city || resolvedChapter.region}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resolvedChapter.city && resolvedChapter.region ? resolvedChapter.region : 'Ubicacion del chapter'}
                </p>
              </CardContent>
            </Card>
          )}

          {resolvedChapter.created_at && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Creado</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatLeadDate(resolvedChapter.created_at)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Chapter registrado</p>
              </CardContent>
            </Card>
          )}
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Información del chapter</h3>
          <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID del chapter</p>
              <p className="text-sm font-mono mt-1">{resolvedChapter.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ultima actualizacion</p>
              <p className="text-sm mt-1">
                {formatLeadDate(resolvedChapter.updated_at)}
              </p>
            </div>
          </div>
        </section>

        <ProtectedLeadershipInvites
          chapterId={resolvedChapter.id}
          activeLeaders={protectedLeadership.activeLeaders}
          invites={protectedLeadership.invites}
        />

        <OnboardPresidentPanel chapterId={resolvedChapter.id} />

        {/* ── Member sections ── */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Miembros ({members.length})</h2>

          {pending_members.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5 text-warning" />
                Pendientes de aprobación ({pending_members.length})
              </h3>
              <div className="space-y-3">
                {pending_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge
                          variant="outline"
                          className="border-warning text-warning"
                        >
                          Pendiente
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/admin/users/${member.id}`}>Revisar</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {approved_members.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle className="h-5 w-5 text-success" />
                Miembros aprobados ({approved_members.length})
              </h3>
              <div className="space-y-3">
                {approved_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge
                          variant="outline"
                          className="border-success text-success"
                        >
                          Aprobado
                        </Badge>
                        {member.person_profile?.is_recruiter_visible && (
                          <Badge variant="secondary">Visible para empresas</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/users/${member.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {rejected_members.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <XCircle className="h-5 w-5 text-destructive" />
                Rechazados ({rejected_members.length})
              </h3>
              <div className="space-y-3">
                {rejected_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge variant="outline" className="border-destructive text-destructive">
                          Rechazado
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/users/${member.id}`}>Revisar</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {incomplete_members.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                Perfiles incompletos ({incomplete_members.length})
              </h3>
              <div className="space-y-3">
                {incomplete_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge variant="outline" className="text-muted-foreground">
                          Incompleto
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/users/${member.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {members.length === 0 && (
            <EmptyState
              icon={Users}
              title="Aún no hay miembros"
              description="Este chapter todavía no tiene miembros registrados."
            />
          )}
        </div>
      </div>
    </div>
  )
}
