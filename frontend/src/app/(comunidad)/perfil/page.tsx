"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, GraduationCap, Languages, MapPin, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { InitialsAvatar } from "@/components/initials-avatar";
import { CvCard } from "@/components/cv-card";
import { RequireAuth } from "@/components/require-auth";
import { api, ApiError, type ProfileResponse, type TalentProfile } from "@/lib/api";
import { initialsOf } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { AVAILABILITY } from "@/lib/data/options";

const ENGLISH_LABEL: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  nativo: "Fluido",
};

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  );
}

function Profile() {
  const router = useRouter();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string>();
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    api
      .getProfile()
      .then((res) => {
        if (!res.profile?.onboarding_completed_at) router.replace("/perfil/nuevo");
        else setData(res);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === "email_not_confirmed") router.replace("/login?confirmar=1");
        else setError("No pudimos cargar tu perfil. Revisa que el backend esté corriendo.");
      });
  }, [router]);

  if (error) return <div className="flex flex-1 items-center justify-center py-24 text-small text-destructive-light">{error}</div>;
  if (!data?.profile) return <div className="flex flex-1 items-center justify-center py-24 text-small text-muted-foreground">Cargando…</div>;

  const { person } = data;
  const profile: TalentProfile = data.profile;
  const university = person.university_name ?? person.university_other;
  const place = [person.city, countryName(person.country_code)].filter(Boolean).join(", ");
  const study = [university, person.major, person.graduation_year ? `Egreso ${person.graduation_year}` : null]
    .filter(Boolean)
    .join(" · ");
  const availability = AVAILABILITY.find((a) => a.value === profile.availability)?.label;

  // Cambiar visibilidad: se reenvía el perfil completo con el nuevo valor.
  const toggleVisibility = async (on: boolean) => {
    setSavingVisibility(true);
    try {
      const res = await api.saveProfile({
        given_names: person.given_names ?? "",
        family_names: person.family_names,
        city: person.city,
        country_code: person.country_code,
        linkedin_url: person.linkedin_url,
        university_id: person.university_id,
        university_other: person.university_id ? null : person.university_other,
        major: person.major,
        graduation_year: person.graduation_year,
        headline: profile.headline,
        english_level: profile.english_level,
        skills: profile.skills,
        top_skills: profile.top_skills,
        target_roles: profile.target_roles,
        availability: profile.availability,
        recruiter_visible: on,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el cambio.");
    } finally {
      setSavingVisibility(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <section className="rounded-xl card-surface ring-1 ring-foreground/10 shadow-sm">
        <div className="p-(--card-spacing)">
          <div className="flex flex-wrap items-center gap-6">
            <InitialsAvatar
              initials={initialsOf(person.full_name, person.email)}
              color="brand-purple"
              className="size-24 rounded-2xl text-display"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-h1 font-bold tracking-tight">{person.full_name}</h1>
              <p className="mt-0.5 text-small text-muted-foreground">{person.email}</p>
              {study && (
                <p className="mt-1.5 flex items-center gap-1.5 text-small text-muted-foreground">
                  <GraduationCap className="size-3.5" /> {study}
                </p>
              )}
              {place && (
                <p className="mt-1 flex items-center gap-1.5 text-small text-muted-foreground">
                  <MapPin className="size-3.5" /> {place}
                </p>
              )}
            </div>
            <Button variant="secondary" asChild>
              <Link href="/perfil/editar">Editar perfil</Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-4 text-small text-muted-foreground">
            {availability && (
              <p className="flex items-center gap-1.5">
                <CalendarClock className="size-4 text-brand-purple-light" /> {availability}
              </p>
            )}
            {profile.english_level && (
              <p className="flex items-center gap-1.5">
                <Languages className="size-4 text-brand-purple-light" /> Inglés {ENGLISH_LABEL[profile.english_level]}
              </p>
            )}
            {person.linkedin_url && (
              <a
                href={person.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-brand-purple-light hover:underline"
              >
                <ExternalLink className="size-4" /> LinkedIn
              </a>
            )}
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
            <span className="text-small">
              <span className="font-medium">Visible para empresas aliadas</span>
              <span className="block text-caption text-muted-foreground">
                {profile.recruiter_visible
                  ? "Las empresas aliadas podrán ver tu perfil y tu CV."
                  : "Tu perfil es privado. Solo tú lo ves."}
              </span>
            </span>
            <Switch checked={profile.recruiter_visible} disabled={savingVisibility} onCheckedChange={toggleVisibility} />
          </label>
        </div>
      </section>

      <div className="mt-6 space-y-5">
        <CvCard />

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-h3 font-semibold">
              <Sparkles className="size-4 text-brand-purple-light" /> Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.skills.length === 0 && <p className="text-small text-muted-foreground">Aún no agregas skills.</p>}
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="rounded-full">
                {profile.top_skills.includes(skill) ? `★ ${skill}` : skill}
              </Badge>
            ))}
          </CardContent>
        </Card>

        {profile.target_roles.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-h3 font-semibold">
                <Target className="size-4 text-brand-purple-light" /> Me interesa
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.target_roles.map((role) => (
                <Badge key={role} variant="secondary" className="rounded-full">
                  {role}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
