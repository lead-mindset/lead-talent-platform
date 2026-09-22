import { BookOpenCheck } from 'lucide-react'
import { MainContainer } from '@/components/global/main-container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Textarea } from '@/components/ui/textarea'
import { submitGrowthReflection } from '@/lib/actions/student/growth-reflection'
import { requireUser } from '@/lib/auth'

export default async function GrowthReflectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    eventId?: string
    eventTitle?: string
    recommendationId?: string
    recommendationTitle?: string
  }>
}) {
  await requireUser()
  const params = await searchParams
  const eventTitle = params.eventTitle ? decodeURIComponent(params.eventTitle) : ''
  const recommendationTitle = params.recommendationTitle
    ? decodeURIComponent(params.recommendationTitle)
    : ''
  const participatedInDefault = eventTitle || recommendationTitle

  return (
    <MainContainer maxWidth="3xl" className="space-y-6 py-6 pb-24 sm:py-8">
      <PageHeader
        eyebrow="Mi LEAD"
        title="Reflexión de crecimiento"
        description="Convierte una experiencia LEAD en evidencia privada de aprendizaje. Tú decides después si la usas para tu perfil, CV o entrevistas."
        badge={
          <Badge variant="secondary" className="gap-1.5">
            <BookOpenCheck className="h-4 w-4" />
            Privado por defecto
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tu reflexión</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitGrowthReflection} className="space-y-5">
            {params.eventId ? <input type="hidden" name="event_id" value={params.eventId} /> : null}
            {params.recommendationId ? (
              <input type="hidden" name="recommendation_id" value={params.recommendationId} />
            ) : null}
            <Input
              name="participated_in"
              defaultValue={participatedInDefault}
              required
              label="¿Qué experiencia de LEAD quieres capturar?"
              placeholder="Ej. IBM Explore Day, una mentoría, un taller de IA..."
            />
            <div className="space-y-2">
              <Label htmlFor="learned">¿Qué aprendiste?</Label>
              <Textarea
                id="learned"
                name="learned"
                required
                placeholder="Escribe una idea, habilidad o decisión que ahora entiendes mejor."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill_or_mindset">¿Qué habilidad o mentalidad practicaste?</Label>
              <Textarea
                id="skill_or_mindset"
                name="skill_or_mindset"
                required
                placeholder="Ej. comunicación, curiosidad, liderazgo, pensamiento técnico..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal_connection">¿Cómo conecta esto con tus metas?</Label>
              <Textarea
                id="goal_connection"
                name="goal_connection"
                required
                placeholder="Conecta la experiencia con el camino que quieres construir."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_move">¿Cuál es tu siguiente movimiento?</Label>
              <Textarea
                id="next_move"
                name="next_move"
                required
                placeholder="Una acción pequeña y concreta para seguir avanzando."
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" name="status" value="completed" className="w-full sm:w-auto">
                Guardar reflexión
              </Button>
              <Button
                type="submit"
                name="status"
                value="draft"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Guardar borrador
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MainContainer>
  )
}