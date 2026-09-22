import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CreateCompanyForm } from './form'
import { Suspense } from 'react'

async function AuthCheck() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('user')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'admin') {
    redirect('/student')
  }

  return <CreateCompanyForm />
}

function FormLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="h-10 bg-muted rounded w-full" />
    </div>
  )
}

export default function AdminCreateCompanyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Crear empresa"
        description="Agrega una nueva empresa socia a la plataforma."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/companies">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a empresas
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información de la empresa</CardTitle>
          <CardDescription>
            Ingresa los datos de la nueva empresa. Podrá invitar representantes de empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormLoading />}>
            <AuthCheck />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
