import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuración administrativa"
        description="Define preferencias del sistema y opciones administrativas."
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Configuración en preparación</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Las opciones de configuración administrativa estarán disponibles aquí.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}