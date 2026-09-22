'use client'

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createEvent, type CreateEventInput } from '@/lib/actions/events/create-event'
import { updateEvent, type UpdateEventInput } from '@/lib/actions/events/update-event'
import { deleteEvent } from '@/lib/actions/events/delete-event'
import { addEventCollaborators } from '@/lib/actions/events/add-event-collaborators'
import type {
  EventRow,
  EventType,
  EventAccessModel,
  ChapterRow,
  EventApplicationQuestionRow,
  EventApplicationQuestionType,
} from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { uploadEventCover } from '@/lib/actions/events/upload-cover'
import { ImagePlus, UploadCloud, MapPin, Video, MonitorSmartphone, UserCheck, QrCode, Save, Trash2, Plus, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { CollaboratorManager } from './collaborator-manager'
import { LocationAutocomplete } from '@/components/events/location-autocomplete'

type Mode = 'create' | 'edit'
type EditableApplicationQuestion = {
  id?: string
  questionText: string
  questionType: EventApplicationQuestionType
  optionsText: string
  isRequired: boolean
}

const questionTypeOptions: Array<{ value: EventApplicationQuestionType; label: string }> = [
  { value: 'short_text', label: 'Respuesta corta' },
  { value: 'long_text', label: 'Respuesta larga' },
  { value: 'single_select', label: 'Selección única' },
  { value: 'checkbox', label: 'Casillas' },
  { value: 'url', label: 'URL' },
]

const EVENT_ACCESS_OPTIONS: Array<{ value: EventAccessModel; label: string; description: string }> = [
  {
    value: 'open',
    label: 'Registro abierto',
    description: 'Los estudiantes se registran al instante y reciben su QR de inmediato.',
  },
  {
    value: 'application',
    label: 'Postulación requerida',
    description: 'Los participantes postulan y el chapter revisa las solicitudes antes de aprobarlas.',
  },
]

const eventTypeOptions: Array<{ value: EventType; label: string; icon: typeof MapPin }> = [
  { value: 'in_person', label: 'Presencial', icon: MapPin },
  { value: 'online', label: 'Virtual', icon: Video },
  { value: 'hybrid', label: 'Híbrido', icon: MonitorSmartphone },
]

const EMPTY_APPLICATION_QUESTIONS: EventApplicationQuestionRow[] = []

function toEditableQuestion(question: EventApplicationQuestionRow): EditableApplicationQuestion {
  return {
    id: question.id,
    questionText: question.question_text,
    questionType: question.question_type,
    optionsText: question.options?.join('\n') ?? '',
    isRequired: question.is_required,
  }
}

function toQuestionPayload(question: EditableApplicationQuestion) {
  const options = question.optionsText
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean)

  return {
    id: question.id,
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    options: ['single_select', 'checkbox'].includes(question.questionType) ? options : null,
    isRequired: question.isRequired,
  }
}

function toDateTimeLocal(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDateTimeLocal(value: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString()
}

export function EventForm({
  mode,
  initial,
  editorChapter,
  canArchiveEvents = false,
  applicationQuestions = EMPTY_APPLICATION_QUESTIONS,
}: {
  mode: Mode
  initial?: EventRow | null
  editorChapter?: ChapterRow | null
  canArchiveEvents?: boolean
  applicationQuestions?: EventApplicationQuestionRow[]
}) {
  const router = useRouter()
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const defaults = useMemo(() => {
    const e = initial
    return {
      title: e?.title ?? '',
      description: e?.description ?? '',
      coverImage: e?.cover_image ?? '',
      startAt: toDateTimeLocal(e?.start_at),
      endAt: toDateTimeLocal(e?.end_at),
      location: e?.location ?? '',
      locationName: e?.location_name ?? '',
      locationAddress: e?.location_address ?? '',
      locationCity: e?.location_city ?? '',
      locationRegion: e?.location_region ?? '',
      locationLatitude: e?.location_latitude ?? null,
      locationLongitude: e?.location_longitude ?? null,
      meetingUrl: e?.meeting_url ?? '',
      eventType: (e?.event_type ?? 'in_person') as EventType,
      capacity: e?.capacity?.toString?.() ?? '',
      isPublished: e?.is_published ?? false,
      accessModel: (e?.access_model ?? 'open') as EventAccessModel,
      applicationFormUrl: e?.application_form_url ?? '',
    }
  }, [initial])

  const [title, setTitle] = useState(defaults.title)
  const [description, setDescription] = useState(defaults.description)
  const [coverImage, setCoverImage] = useState(defaults.coverImage)
  const [startAt, setStartAt] = useState(defaults.startAt)
  const [endAt, setEndAt] = useState(defaults.endAt)
  const [location, setLocation] = useState(defaults.location)
  const [locationName, setLocationName] = useState(defaults.locationName)
  const [locationAddress, setLocationAddress] = useState(defaults.locationAddress)
  const [locationCity, setLocationCity] = useState(defaults.locationCity)
  const [locationRegion, setLocationRegion] = useState(defaults.locationRegion)
  const [locationLatitude, setLocationLatitude] = useState<number | null>(defaults.locationLatitude)
  const [locationLongitude, setLocationLongitude] = useState<number | null>(defaults.locationLongitude)
  const [meetingUrl, setMeetingUrl] = useState(defaults.meetingUrl)
  const [eventType, setEventType] = useState<EventType>(defaults.eventType)
  const [capacity, setCapacity] = useState(defaults.capacity)
  const [isPublished, setIsPublished] = useState(defaults.isPublished)
  const [accessModel, setAccessModel] = useState<EventAccessModel>(defaults.accessModel)
  const [applicationFormUrl, setApplicationFormUrl] = useState(defaults.applicationFormUrl)
  const [applicationQuestionsState, setApplicationQuestionsState] = useState<EditableApplicationQuestion[]>(
    applicationQuestions.map(toEditableQuestion)
  )
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [isDraggingCover, setIsDraggingCover] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingCollaboratorIds, setPendingCollaboratorIds] = useState<string[]>([])

  useEffect(() => {
    if (initial) {
      setTitle(initial.title ?? '')
      setDescription(initial.description ?? '')
      setCoverImage(initial.cover_image ?? '')
      setStartAt(toDateTimeLocal(initial.start_at))
      setEndAt(toDateTimeLocal(initial.end_at))
      setLocation(initial.location ?? '')
      setLocationName(initial.location_name ?? '')
      setLocationAddress(initial.location_address ?? '')
      setLocationCity(initial.location_city ?? '')
      setLocationRegion(initial.location_region ?? '')
      setLocationLatitude(initial.location_latitude ?? null)
      setLocationLongitude(initial.location_longitude ?? null)
      setMeetingUrl(initial.meeting_url ?? '')
      setEventType((initial.event_type ?? 'in_person') as EventType)
      setCapacity(initial.capacity?.toString() ?? '')
      setIsPublished(initial.is_published ?? false)
      setAccessModel((initial.access_model ?? 'open') as EventAccessModel)
      setApplicationFormUrl(initial.application_form_url ?? '')
    }
    setApplicationQuestionsState(applicationQuestions.map(toEditableQuestion))
  }, [initial, applicationQuestions])

  async function handleCoverFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCoverError('Solo se permiten archivos de imagen')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setCoverError('La imagen de portada debe pesar 2 MB o menos')
      return
    }

    setCoverError(null)
    const formData = new FormData()
    formData.set('cover', file)
    const toastId = toast.loading('Subiendo imagen...')
    try {
      const result = await uploadEventCover(formData)
      setCoverImage(result.publicUrl)
      toast.success('Imagen subida correctamente', { id: toastId })
    } catch (uploadError) {
      setCoverError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen')
      toast.error('No se pudo subir la imagen', { id: toastId })
    }
  }

  const validateFields = (targetPublished = true) => {
    setFieldErrors({})
    let isValid = true
    const errors: Record<string, string> = {}

    if (!title.trim()) { errors.title = 'El título es obligatorio'; isValid = false }
    if (title.length > 100) { errors.title = 'El título debe tener menos de 100 caracteres'; isValid = false }
    if (description.length > 2000) { errors.description = 'La descripción debe tener menos de 2000 caracteres'; isValid = false }
    if (coverImage && !coverImage.startsWith('http')) { errors.cover_image = 'La URL de imagen no es valida'; isValid = false }

    if (!startAt) { errors.start_at = 'La fecha y hora de inicio son obligatorias'; isValid = false }
    if (!endAt) { errors.end_at = 'La fecha y hora de fin son obligatorias'; isValid = false }
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      errors.end_at = 'La fecha de fin debe ser posterior al inicio'
      isValid = false
    }
    if (targetPublished && eventType === 'in_person' && !location?.trim()) {
      errors.location = 'La ubicación es obligatoria para eventos presenciales'
      isValid = false
    }
    if (targetPublished && eventType === 'online' && !meetingUrl?.trim()) {
      errors.meeting_url = 'El enlace de reunión es obligatorio para eventos virtuales'
      isValid = false
    }
    if (targetPublished && eventType === 'hybrid') {
      if (!location?.trim()) { errors.location = 'La ubicación es obligatoria para eventos híbridos'; isValid = false }
      if (!meetingUrl?.trim()) { errors.meeting_url = 'El enlace de reunión es obligatorio para eventos híbridos'; isValid = false }
    }

    if (capacity && (isNaN(Number(capacity)) || Number(capacity) <= 0)) {
      errors.capacity = 'La capacidad debe ser un número mayor que 0'
      isValid = false
    }
    if (targetPublished && accessModel === 'application') {
      const hasQuestions = applicationQuestionsState.some((question) => question.questionText.trim())
      if (!hasQuestions) {
        errors.application_questions = 'Agrega al menos una pregunta de postulación'
        isValid = false
      }

      applicationQuestionsState.forEach((question, index) => {
        if (!question.questionText.trim()) {
          errors.application_questions = `La pregunta ${index + 1} necesita texto`
          isValid = false
        }

        if (
          ['single_select', 'checkbox'].includes(question.questionType) &&
          !question.optionsText.split('\n').some((option) => option.trim())
        ) {
          errors.application_questions = `La pregunta ${index + 1} necesita al menos una opción`
          isValid = false
        }
      })
    }

    if (!isValid) {
      setFieldErrors(errors)
      toast.error(targetPublished ? 'Corrige los campos obligatorios antes de publicar' : 'Corrige los campos mínimos antes de guardar el borrador')
    }
    return isValid
  }

  async function submitEvent(targetPublished: boolean) {
    if (!validateFields(targetPublished)) {
      return
    }

    setError(null)

    startTransition(async () => {
      const payload = {
        title,
        description: description.trim() || undefined,
        coverImage: coverImage || undefined,
        startAt: fromDateTimeLocal(startAt),
        endAt: fromDateTimeLocal(endAt),
        location: location || undefined,
        locationName: locationName || undefined,
        locationAddress: locationAddress || undefined,
        locationCity: locationCity || undefined,
        locationRegion: locationRegion || undefined,
        locationLatitude,
        locationLongitude,
        meetingUrl: meetingUrl || undefined,
        eventType,
        capacity: capacity === '' ? undefined : Number(capacity),
        isPublished: targetPublished,
        accessModel,
        applicationFormUrl: undefined,
        applicationQuestions:
          accessModel === 'application'
            ? applicationQuestionsState.map(toQuestionPayload).filter((question) => question.questionText)
            : undefined,
      }

      try {
        const res =
          mode === 'create'
            ? await createEvent(payload as CreateEventInput)
            : await updateEvent({ id: initial!.id, ...payload } as UpdateEventInput)

        if ('error' in res) {
          toast.error(res.error)
          return
        }

        if (mode === 'edit' && pendingCollaboratorIds.length > 0) {
          const collaboratorResult = await addEventCollaborators(res.event.id, pendingCollaboratorIds)
          if ('error' in collaboratorResult) {
            toast.error(`El evento se actualizó, pero no se pudieron agregar colaboradores: ${collaboratorResult.error}`)
          }
        }
        toast.success(mode === 'create' ? 'Evento creado correctamente' : 'Evento actualizado correctamente')
        setLastSavedAt(new Date().toLocaleTimeString('es-PE'))
        setIsPublished(res.event.is_published)

        if (mode === 'create') {
          router.push(`/${locale}/chapter/events/${res.event.id}`)
        } else {
          router.refresh()
        }
      } catch {
        toast.error('Ocurrió un error inesperado. Inténtalo nuevamente.')
      }
    })
  }

  // Auto-save drafts while editing an unpublished event
  useEffect(() => {
    if (mode !== 'edit' || isPublished) return

    const interval = window.setInterval(async () => {
      setIsAutoSaving(true)
      const payload = {
        id: initial!.id,
        title,
        description: description.trim() || null,
        coverImage: coverImage || null,
        startAt: fromDateTimeLocal(startAt),
        endAt: fromDateTimeLocal(endAt),
        location: location || null,
        locationName: locationName || null,
        locationAddress: locationAddress || null,
        locationCity: locationCity || null,
        locationRegion: locationRegion || null,
        locationLatitude,
        locationLongitude,
        meetingUrl: meetingUrl || null,
        eventType,
        capacity: capacity === '' ? null : Number(capacity),
        isPublished: false,
        accessModel,
        applicationFormUrl: null,
        applicationQuestions:
          accessModel === 'application'
            ? applicationQuestionsState.map(toQuestionPayload).filter((question) => question.questionText)
            : undefined,
      }
      const res = await updateEvent(payload as UpdateEventInput)
      if (!('error' in res)) {
        setLastSavedAt(new Date().toLocaleTimeString('es-PE'))
      }
      setIsAutoSaving(false)
    }, 30000)

    return () => window.clearInterval(interval)
  }, [mode, isPublished, initial, title, description, coverImage, startAt, endAt, location, locationName, locationAddress, locationCity, locationRegion, locationLatitude, locationLongitude, meetingUrl, eventType, capacity, accessModel, applicationFormUrl, applicationQuestionsState])

  async function onDelete() {
    if (!initial?.id) return
    setError(null)
    startTransition(async () => {
      const res = await deleteEvent(initial.id)
      if ('error' in res) {
        setError(res.error)
        return
      }
      router.push(`/${locale}/chapter/events`)
    })
  }

  function addApplicationQuestion() {
    setApplicationQuestionsState((questions) => [
      ...questions,
      {
        questionText: '',
        questionType: 'short_text',
        optionsText: '',
        isRequired: true,
      },
    ])
  }

  function updateApplicationQuestion(
    index: number,
    updates: Partial<EditableApplicationQuestion>
  ) {
    setApplicationQuestionsState((questions) =>
      questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...updates } : question
      )
    )
  }

  function removeApplicationQuestion(index: number) {
    setApplicationQuestionsState((questions) =>
      questions.filter((_, questionIndex) => questionIndex !== index)
    )
  }

  function moveApplicationQuestion(index: number, direction: -1 | 1) {
    setApplicationQuestionsState((questions) => {
      const next = [...questions]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return questions
      const [question] = next.splice(index, 1)
      next.splice(targetIndex, 0, question)
      return next
    })
  }

  const fieldErrorEntries = Object.entries(fieldErrors).filter(([, message]) => message)

  const renderErrorSummary = () => {
    if (!error && fieldErrorEntries.length === 0) return null

    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error && <div className="font-medium">{error}</div>}
        {fieldErrorEntries.length > 0 && (
          <ul className={error ? 'mt-2 list-disc space-y-1 pl-5' : 'list-disc space-y-1 pl-5'}>
            {fieldErrorEntries.slice(0, 4).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 pb-32">
      {renderErrorSummary()}

      {/* Datos del evento */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Datos del evento</h2>
          <p className="text-sm text-muted-foreground">Nombre y descripción del evento.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-foreground">
            Título del evento <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }))
            }}
            placeholder="Ej. LEAD Spark: Tech & Careers"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'title-error' : undefined}
          />
          {fieldErrors.title && <p id="title-error" className="text-xs text-destructive">{fieldErrors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-foreground">
            Descripción
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explica el propósito, la audiencia y qué deben esperar los participantes."
            className="min-h-32"
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? 'description-error' : undefined}
          />
          {fieldErrors.description && <p id="description-error" className="text-xs text-destructive">{fieldErrors.description}</p>}
        </div>
      </section>

      {/* Imagen de portada */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Imagen de portada</h2>
          <p className="text-sm text-muted-foreground">Sube una imagen o pega una URL.</p>
        </div>
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setIsDraggingCover(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDraggingCover(false)
          }}
          onDrop={async (event) => {
            event.preventDefault()
            setIsDraggingCover(false)
            await handleCoverFile(event.dataTransfer.files[0] ?? null)
          }}
          className={`relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border border-dashed transition-all group ${isDraggingCover ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/60'}`}
          onClick={() => !coverImage && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Subir imagen de portada del evento"
            className="sr-only"
            onChange={async (event) => handleCoverFile(event.target.files?.[0] ?? null)}
          />

          {coverImage ? (
            <>
              <Image
                src={coverImage}
                alt="Vista previa de la portada"
                fill
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <ImagePlus className="w-4 h-4 mr-2" /> Cambiar portada
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="text-center px-4">
                <div className="mb-1 text-lg font-semibold">Arrastra la portada aquí</div>
                <div className="text-sm text-muted-foreground">Recomendado: 1920 x 1080 px. Máximo 2 MB.</div>
              </div>
            </>
          )}
        </div>
        {coverError && <p className="text-xs text-destructive">{coverError}</p>}
        {fieldErrors.cover_image && <p className="text-xs text-destructive">{fieldErrors.cover_image}</p>}

        <div className="space-y-2">
          <Label htmlFor="coverImageUrl" className="text-sm font-medium text-foreground">
            O pega una URL de imagen
          </Label>
          <Input
            id="coverImageUrl"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </section>

      {/* Formato y logística */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Formato y logística</h2>
          <p className="text-sm text-muted-foreground">Cómo y cuándo se realizará el evento.</p>
        </div>

        <div role="radiogroup" aria-label="Formato de asistencia" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {eventTypeOptions.map((type) => (
            <label
              key={type.value}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center transition-colors has-[input:checked]:border-primary has-[input:checked]:bg-primary/10 ${eventType === type.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
            >
              <input
                type="radio"
                name="attendance_type"
                value={type.value}
                checked={eventType === type.value}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="peer sr-only"
              />
              <type.icon className="h-8 w-8" />
              <span className="font-semibold">{type.label}</span>
            </label>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startAt" className="text-sm font-medium text-foreground">
              Inicio <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startAt"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              aria-invalid={Boolean(fieldErrors.start_at)}
              aria-describedby={fieldErrors.start_at ? 'startAt-error' : undefined}
            />
            {fieldErrors.start_at && <p id="startAt-error" className="text-xs text-destructive">{fieldErrors.start_at}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endAt" className="text-sm font-medium text-foreground">
              Fin <span className="text-destructive">*</span>
            </Label>
            <Input
              id="endAt"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              aria-invalid={Boolean(fieldErrors.end_at)}
              aria-describedby={fieldErrors.end_at ? 'endAt-error' : undefined}
            />
            {fieldErrors.end_at && <p id="endAt-error" className="text-xs text-destructive">{fieldErrors.end_at}</p>}
          </div>
        </div>

        {(eventType === 'in_person' || eventType === 'hybrid') && (
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-foreground">
              Ubicación / dirección {eventType === 'hybrid' ? '' : <span className="text-destructive">*</span>}
            </Label>
            <LocationAutocomplete
              value={location}
              onChange={(data) => {
                setLocation(data.address || '')
                setLocationName(data.name || data.address?.split(',')[0]?.trim() || '')
                setLocationAddress(data.address || '')
                setLocationCity(data.city || '')
                setLocationRegion(data.region || '')
                setLocationLatitude(data.latitude ?? null)
                setLocationLongitude(data.longitude ?? null)
              }}
              onClear={() => {
                setLocation('')
                setLocationName('')
                setLocationAddress('')
                setLocationCity('')
                setLocationRegion('')
                setLocationLatitude(null)
                setLocationLongitude(null)
              }}
              placeholder="Busca el lugar con Google Places..."
              className={`w-full ${fieldErrors.location ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {fieldErrors.location && <p id="location-error" className="text-xs text-destructive">{fieldErrors.location}</p>}

            {(locationCity || locationRegion) && (
              <div className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>Datos detectados:</span>
                {locationCity && <span className="font-semibold text-foreground">{locationCity}</span>}
                {locationCity && locationRegion && <span>,</span>}
                {locationRegion && <span className="font-semibold text-foreground">{locationRegion}</span>}
              </div>
            )}
          </div>
        )}

        {(eventType === 'online' || eventType === 'hybrid') && (
          <div className="space-y-2">
            <Label htmlFor="meetingUrl" className="text-sm font-medium text-foreground">
              Enlace de reunión {eventType === 'hybrid' ? '' : <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="meetingUrl"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              aria-invalid={Boolean(fieldErrors.meeting_url)}
              aria-describedby={fieldErrors.meeting_url ? 'meetingUrl-error' : undefined}
            />
            <p className="text-xs text-muted-foreground">El enlace se compartira solo con asistentes aprobados.</p>
            {fieldErrors.meeting_url && <p id="meetingUrl-error" className="text-xs text-destructive">{fieldErrors.meeting_url}</p>}
          </div>
        )}

        <div className="space-y-2 max-w-md">
          <Label htmlFor="capacity" className="text-sm font-medium text-foreground">
            Cupos disponibles
          </Label>
          <Input
            id="capacity"
            inputMode="numeric"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Ej. 150"
            aria-invalid={Boolean(fieldErrors.capacity)}
            aria-describedby={fieldErrors.capacity ? 'capacity-error' : undefined}
          />
          <p className="text-sm text-muted-foreground">Déjalo en blanco si no hay límite de cupos.</p>
          {fieldErrors.capacity && <p id="capacity-error" className="text-xs text-destructive">{fieldErrors.capacity}</p>}
        </div>
      </section>

      {/* Acceso */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Acceso</h2>
          <p className="text-sm text-muted-foreground">Cómo se registran los participantes.</p>
        </div>

        <div role="radiogroup" aria-label="Modelo de registro" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EVENT_ACCESS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-4 rounded-lg border p-5 transition-colors has-[input:checked]:border-primary has-[input:checked]:bg-primary/10 ${accessModel === option.value ? 'border-primary bg-primary/10' : 'border-border/60 bg-muted/20 hover:bg-muted/40'}`}
            >
              <input
                type="radio"
                name="accessModel"
                value={option.value}
                checked={accessModel === option.value}
                onChange={(e) => setAccessModel(e.target.value as EventAccessModel)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 rounded-full border border-input transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
              />
              <span>
                <span className={`block font-semibold ${accessModel === option.value ? 'text-primary' : 'text-foreground'}`}>{option.label}</span>
                <span className="text-sm text-muted-foreground mt-1 block leading-relaxed">{option.description}</span>
              </span>
            </label>
          ))}
        </div>

        {accessModel === 'application' && (
          <div className="rounded-lg border bg-muted/30 p-4 md:p-5">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-sm font-semibold text-foreground">Preguntas de postulación</Label>
                    <Badge variant="default" size="sm">Para publicar</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    El borrador se puede guardar incompleto. Para publicar, cada pregunta debe tener texto y las preguntas de selección deben tener opciones.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addApplicationQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar pregunta
                </Button>
              </div>

              {applicationQuestionsState.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  Agrega al menos una pregunta. Los postulantes responderán dentro de LEAD.
                </div>
              ) : (
                <div className="space-y-3">
                  {applicationQuestionsState.map((question, index) => (
                    <div key={question.id ?? index} className="space-y-3 rounded-lg border bg-background p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                          Pregunta {index + 1}
                          <Badge variant={question.isRequired ? 'default' : 'outline'} size="sm">
                            {question.isRequired ? 'Obligatoria' : 'Opcional'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <label className="inline-flex min-h-7 items-center gap-1.5 rounded-md border bg-muted/20 px-2 text-xs font-medium text-muted-foreground">
                            <Checkbox
                              checked={question.isRequired}
                              onCheckedChange={(checked) => updateApplicationQuestion(index, { isRequired: checked === true })}
                            />
                            Requerir
                          </label>
                          <Button type="button" variant="ghost" size="icon-xs" aria-label="Subir pregunta" onClick={() => moveApplicationQuestion(index, -1)} disabled={index === 0}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-xs" aria-label="Bajar pregunta" onClick={() => moveApplicationQuestion(index, 1)} disabled={index === applicationQuestionsState.length - 1}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-xs" aria-label="Eliminar pregunta" onClick={() => removeApplicationQuestion(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_14rem]">
                        <Input
                          value={question.questionText}
                          onChange={(event) => updateApplicationQuestion(index, { questionText: event.target.value })}
                          placeholder="Ej. ¿Por qué quieres asistir?"
                          className="bg-muted/40"
                          aria-label={`Texto de pregunta ${index + 1}`}
                        />

                        <div className="min-w-0">
                          <Select
                            value={question.questionType}
                            onValueChange={(value) => updateApplicationQuestion(index, {
                              questionType: value as EventApplicationQuestionType,
                              optionsText: ['single_select', 'checkbox'].includes(value)
                                ? question.optionsText
                                : '',
                            })}
                          >
                            <SelectTrigger className="w-full" aria-label={`Tipo de respuesta para pregunta ${index + 1}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {questionTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {['single_select', 'checkbox'].includes(question.questionType) ? (
                        <Textarea
                          value={question.optionsText}
                          onChange={(event) => updateApplicationQuestion(index, { optionsText: event.target.value })}
                          placeholder="Opciones, una por línea"
                          className="min-h-20 bg-muted/40"
                          aria-label={`Opciones de pregunta ${index + 1}`}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {fieldErrors.application_questions && (
                <p className="text-xs text-destructive">{fieldErrors.application_questions}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {mode === 'edit' && initial?.id && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Chapters colaboradores</h2>
            <p className="text-sm text-muted-foreground">Invita a otros chapters a colaborar en este evento.</p>
          </div>
          <CollaboratorManager
            eventId={initial.id}
            ownerChapterId={editorChapter?.id || null}
            mode={mode}
            onCollaboratorsChange={setPendingCollaboratorIds}
          />
        </section>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-6 z-50 mt-12 rounded-lg border bg-card/95 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {mode === 'edit' && canArchiveEvents ? (
              <Button
                variant="destructive"
                className="hidden sm:flex"
                onClick={onDelete}
                disabled={isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </Button>
            ) : null}
            <div className="text-xs text-muted-foreground hidden md:block font-medium">
              {isAutoSaving ? 'Guardando automáticamente...' : lastSavedAt ? `Último guardado: ${lastSavedAt}` : 'Todos los cambios están guardados.'}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none font-semibold"
              onClick={() => submitEvent(false)}
              disabled={isPending}
            >
              Guardar borrador
            </Button>
            <Button
              className="flex-1 sm:flex-none font-semibold"
              onClick={() => submitEvent(true)}
              disabled={isPending}
            >
              <Save className="w-4 h-4 mr-2" /> {mode === 'create' ? 'Publicar evento' : 'Guardar y publicar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}