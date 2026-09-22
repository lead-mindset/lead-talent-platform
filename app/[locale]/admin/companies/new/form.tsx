'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Building, CheckCircle2 } from 'lucide-react'
import { createCompany } from '@/lib/actions/admin/create-company'

export function CreateCompanyForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [companyName, setCompanyName] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await createCompany({
        name: companyName.trim(),
      })

      if (!result.success) {
        throw new Error(result.error || 'No se pudo crear la empresa')
      }

      setSuccess(true)

      setTimeout(() => {
        router.push('/admin/companies')
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
          Empresa creada correctamente. Redirigiendo...
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
        id="companyName"
        label="Nombre de la empresa"
        required
        iconLeft={<Building className="h-4 w-4 text-muted-foreground" />}
        placeholder="ej. Acme Corporation"
        helperText="Ingresa el nombre legal completo o el nombre conocido de la empresa"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        disabled={isLoading}
        minLength={2}
        maxLength={100}
      />

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isLoading || !companyName.trim()}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Building className="mr-2 h-4 w-4" />
              Crear empresa
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