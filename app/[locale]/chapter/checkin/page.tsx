import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { getChapterEvents } from '@/lib/actions/events/get-data'
import { getCheckInCounter } from '@/lib/actions/events/checkin'
import { CheckinScanner } from '../events/_components/checkin-scanner'
import { MainContainer } from '@/components/global/main-container'
import { PageHeader } from '@/components/ui/page-header'
import { ComingSoon } from '@/components/ui/coming-soon'


function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-PE', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function CheckInSummary({
  checkedIn,
  total,
}: {
  checkedIn: number
  total: number
}) {
  const percentage = total > 0 ? Math.min(100, Math.round((checkedIn / total) * 100)) : 0

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium text-muted-foreground">Asistieron</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-success">{checkedIn}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium text-muted-foreground">Registrados</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{total}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium text-muted-foreground">Progreso</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{percentage}%</p>
      </div>
    </div>
  )
}

export default async function ChapterCheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>
}) {
  const { eventId } = await searchParams
  const now = new Date()
  const events = await getChapterEvents('chapter.events.check_in')
  const upcomingOrLive = events.filter((event) => new Date(event.end_at) >= now)
  const selectedEvent =
    upcomingOrLive.find((event) => event.id === eventId) ??
    upcomingOrLive[0] ??
    null
  const counter = selectedEvent ? await getCheckInCounter(selectedEvent.id) : null

  return (
    <ComingSoon
      title="Algo grande se está cocinando"
      description="Check-in exprés para eventos de capítulo con escaneo de QR en vivo."
    >
      <MainContainer className="w-full max-w-full py-8 space-y-8">
        <PageHeader
          title="Check-in"
          description="Escanea códigos QR o busca asistentes para el evento seleccionado."
          actions={
            <Button asChild variant="outline">
            <Link href="/chapter/events">Eventos del capítulo</Link>
          </Button>
          }
        />

        {selectedEvent ? (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
                <Badge variant={selectedEvent.is_published ? 'success' : 'outline'}>
                  {selectedEvent.is_published ? 'Publicado' : 'Borrador'}
                </Badge>
              </div>
              <CheckInSummary
                checkedIn={counter?.checkedIn ?? 0}
                total={counter?.total ?? selectedEvent._count.registrations}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <CheckinScanner
                eventId={selectedEvent.id}
                initialCheckedIn={counter?.checkedIn ?? 0}
                initialTotal={counter?.total ?? selectedEvent._count.registrations}
              />

              <aside className="space-y-3">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold">Selector de evento</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cambia rápidamente si estás operando varios eventos del capítulo.
                  </p>
                </div>
                <div className="divide-y overflow-hidden rounded-lg border bg-card">
                  {upcomingOrLive.slice(0, 8).map((event) => (
                    <div key={event.id} className="p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{event.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.start_at)}</p>
                          <p className="text-xs text-muted-foreground">{event._count.registrations} registrados</p>
                        </div>
                        <Button asChild size="sm" variant={event.id === selectedEvent.id ? 'default' : 'outline'} className="w-full sm:w-auto">
                          <Link href={`/chapter/checkin?eventId=${event.id}`}>
                            {event.id === selectedEvent.id ? 'En uso' : 'Usar'}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Icons.Calendar}
            title="No hay eventos activos para check-in"
            description="Crea o publica un evento próximo antes de abrir el check-in."
            action={
              <Button asChild className="mt-2">
                <Link href="/chapter/events">Gestionar eventos</Link>
              </Button>
            }
          />
        )}
      </MainContainer>
    </ComingSoon>
  )
}
