'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Building2, CheckCircle2, GraduationCap, MapPin } from 'lucide-react'
import { createChapter } from '@/lib/actions/admin/create-chapter'

export function CreateChapterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    university: '',
    city: '',
    region: '',
  })

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await createChapter({
        id: formData.id.trim().toLowerCase().replace(/\s+/g, '-'),
        name: formData.name.trim(),
        university: formData.university.trim(),
        city: formData.city.trim() || undefined,
        region: formData.region.trim() || undefined,
      })

      if (!result) {
        throw new Error('No se pudo crear el capítulo')
      }

      setSuccess(true)

      setTimeout(() => {
        router.push('/admin/chapters')
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-900 dark:text-green-100">
          Capítulo creado correctamente. Redirigiendo...
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Input
        id="id"
        label="ID del capítulo"
        required
        placeholder="ej. lima-2024"
        helperText="Identificador único (solo minúsculas, números y guiones)"
        value={formData.id}
        onChange={(e) => handleChange('id', e.target.value)}
        disabled={isLoading}
        minLength={2}
        maxLength={50}
        pattern="[a-z0-9-]+"
      />

      <Input
        id="name"
        label="Nombre del capítulo"
        required
        iconLeft={<Building2 className="h-4 w-4 text-muted-foreground" />}
        placeholder="ej. LEAD Lima"
        helperText="El nombre visible de este capítulo"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        disabled={isLoading}
        minLength={2}
        maxLength={100}
      />

      <Input
        id="university"
        label="Universidad"
        required
        iconLeft={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
        placeholder="ej. Universidad Nacional Mayor de San Marcos"
        helperText="La universidad asociada a este capítulo"
        value={formData.university}
        onChange={(e) => handleChange('university', e.target.value)}
        disabled={isLoading}
        minLength={2}
        maxLength={200}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="city"
          label="Ciudad"
          iconLeft={<MapPin className="h-4 w-4 text-muted-foreground" />}
          placeholder="ej. Lima"
          value={formData.city}
          onChange={(e) => handleChange('city', e.target.value)}
          disabled={isLoading}
          maxLength={100}
        />

        <Input
          id="region"
          label="Región"
          placeholder="ej. Lima"
          value={formData.region}
          onChange={(e) => handleChange('region', e.target.value)}
          disabled={isLoading}
          maxLength={100}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isLoading || !formData.id || !formData.name || !formData.university}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              Crear capítulo
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}