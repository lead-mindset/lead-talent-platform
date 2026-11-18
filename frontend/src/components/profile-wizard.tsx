"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterChip } from "@/components/ui/filter-chip";
import { Segmented } from "@/components/ui/segmented";
import { Field } from "@/components/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/tag-input";
import { RequireAuth } from "@/components/require-auth";
import { combine, required, url } from "@/lib/validators";
import { AVAILABILITY, ROLE_POOL } from "@/lib/data/options";
import { COUNTRIES } from "@/lib/countries";
import { api, ApiError, type Availability, type EnglishLevel, type University } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

const STEPS = ["Tú", "Formación", "Skills", "Objetivos", "Listo"];

const ENGLISH: { value: EnglishLevel; label: string }[] = [
  { value: "basico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
  { value: "nativo", label: "Fluido" },
];

function normalizeLinkedin(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value.replace(/^http:/i, "https:") : `https://${value}`;
}

export function ProfileWizard() {
  return (
    <RequireAuth>
      <Wizard />
    </RequireAuth>
  );
}

function Wizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [step, setStep] = useState(0);
  const [givenNames, setGivenNames] = useState("");
  const [familyNames, setFamilyNames] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [university, setUniversity] = useState("");
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<University[]>([]);
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("2028");
  const [english, setEnglish] = useState<EnglishLevel>("intermedio");
  const [skills, setSkills] = useState<string[]>([]);
  const [topSkills, setTopSkills] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability>("practicas");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; linkedin?: string; university?: string; skills?: string; year?: string; save?: string }>({});
  const [triedNext, setTriedNext] = useState(false);
  const [saving, setSaving] = useState(false);

  // Precarga: datos de Google (nombre) o el perfil existente si viene a editar.
  useEffect(() => {
    api
      .getProfile()
      .then(({ person, profile }) => {
        setGivenNames(person.given_names ?? "");
        setFamilyNames(person.family_names ?? "");
        setCountry(person.country_code ?? "");
        setCity(person.city ?? "");
        setLinkedin(person.linkedin_url ?? "");
        setUniversityId(person.university_id);
        setUniversity(person.university_name ?? person.university_other ?? "");
        setMajor(person.major ?? "");
        if (person.graduation_year) setYear(String(person.graduation_year));
        if (profile) {
          setIsEdit(Boolean(profile.onboarding_completed_at));
          if (profile.english_level) setEnglish(profile.english_level);
          setSkills(profile.skills);
          setTopSkills(profile.top_skills);
          setRoles(profile.target_roles);
          if (profile.availability) setAvailability(profile.availability);
          setVisible(profile.recruiter_visible);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === "email_not_confirmed") router.replace("/login?confirmar=1");
        else setErrors({ save: "No pudimos cargar tus datos. Revisa que el backend esté corriendo." });
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Sugerencias de universidades del catálogo. Si no hay, queda como texto libre.
  useEffect(() => {
    if (universityId || university.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api.searchUniversities(university.trim()).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [university, universityId]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string, max?: number) => {
    if (list.includes(value)) set(list.filter((item) => item !== value));
    else if (!max || list.length < max) set([...list, value]);
  };

  const validateStep = (): boolean => {
    const next: typeof errors = {};
    if (step === 0) {
      next.name = required("Escribe tu nombre")(givenNames);
      next.linkedin = linkedin.trim()
        ? combine(url())(linkedin) ?? (/linkedin\.com\//i.test(linkedin) ? undefined : "Debe ser un enlace de LinkedIn")
        : undefined;
    } else if (step === 1) {
      next.university = required()(university);
      if (year.trim() && (!/^\d{4}$/.test(year.trim()) || Number(year) < 1990 || Number(year) > 2045)) {
        next.year = "Escribe un año de graduación válido (por ejemplo 2029).";
      }
    } else if (step === 2) {
      next.skills = skills.length === 0 ? "Elige al menos una skill" : undefined;
    }
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      await api.saveProfile({
        given_names: givenNames.trim(),
        family_names: familyNames.trim() || null,
        country_code: country || null,
        city: city.trim() || null,
        linkedin_url: normalizeLinkedin(linkedin),
        university_id: universityId,
        university_other: universityId ? null : university.trim(),
        major: major.trim() || null,
        graduation_year: year.trim() ? Number(year) : null,
        english_level: english,
        skills,
        top_skills: topSkills.filter((s) => skills.includes(s)),
        target_roles: roles,
        availability,
        recruiter_visible: visible,
      });
      // El rol "student" se asigna al guardar. Renovar la sesión para que el token lo traiga.
      await getSupabase().auth.refreshSession();
      setStep(4);
    } catch (err) {
      setErrors({ save: err instanceof ApiError ? err.message : "No pudimos guardar tu perfil. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!validateStep()) {
      setTriedNext(true);
      return;
    }
    setTriedNext(false);
    if (step === 3) save();
    else setStep(step + 1);
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-24 text-small text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <div className="text-center">
        <h1 className="text-h1 font-bold tracking-tight">{isEdit ? "Edita tu perfil" : "Tu espacio en LEAD"}</h1>
        <p className="mx-auto mt-1 max-w-md text-small text-muted-foreground">
          {isEdit ? "Actualiza lo que haya cambiado." : "Cuéntanos quién eres en menos de 2 minutos."}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-1.5">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 flex-col gap-1">
              <div className={`h-1 rounded-full ${index <= step ? "brand-gradient" : "bg-muted"}`} />
              <p className={`text-center text-caption ${index === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface mt-5 rounded-xl border border-border/60 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombres" htmlFor="w-given" required error={errors.name}>
                <Input id="w-given" value={givenNames} onChange={(e) => setGivenNames(e.target.value)} placeholder="Ej. María José" autoComplete="given-name" autoFocus />
              </Field>
              <Field label="Apellidos" htmlFor="w-family" hint="Si tienes">
                <Input id="w-family" value={familyNames} onChange={(e) => setFamilyNames(e.target.value)} placeholder="Ej. García López" autoComplete="family-name" />
              </Field>
            </div>
            <div>
              <p className="text-small font-medium">¿En qué país estás?</p>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-1.5 h-10 w-full justify-between rounded-md">
                  <SelectValue placeholder="Elige tu país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="¿En qué ciudad?" htmlFor="w-city">
              <Input id="w-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" />
            </Field>
            <Field label="LinkedIn" htmlFor="w-li" hint="Opcional" error={errors.linkedin}>
              <Input id="w-li" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/tu-usuario" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="¿A qué universidad vas?" htmlFor="w-uni" required error={errors.university}>
              <Input
                id="w-uni"
                value={university}
                onChange={(e) => {
                  setUniversity(e.target.value);
                  setUniversityId(null);
                }}
                placeholder="Tu universidad"
                autoComplete="off"
                autoFocus
              />
            </Field>
            {suggestions.length > 0 && (
              <div className="-mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((u) => (
                  <FilterChip
                    key={u.id}
                    active={false}
                    onClick={() => {
                      setUniversity(u.name);
                      setUniversityId(u.id);
                      setSuggestions([]);
                    }}
                  >
                    {u.name}
                  </FilterChip>
                ))}
              </div>
            )}
            {universityId && (
              <p className="-mt-2 flex items-center gap-1 text-caption text-muted-foreground">
                <Check className="size-3.5 text-success" /> Universidad del catálogo
              </p>
            )}
            <Field label="¿Qué estudias?" htmlFor="w-major">
              <Input id="w-major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Carrera" />
            </Field>
            <div>
              <p className="text-small font-medium">¿Cuándo te gradúas?</p>
              <Input
                type="number"
                inputMode="numeric"
                min={1990}
                max={2045}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ej. 2029"
                className="mt-1.5"
              />
              {triedNext && errors.year && (
                <p className="mt-1.5 text-caption text-destructive-light" role="alert">{errors.year}</p>
              )}
              <p className="mt-1 text-caption text-muted-foreground">Incluye a quienes ya se graduaron.</p>
            </div>
            <div>
              <p className="text-small font-medium">¿Tu inglés?</p>
              <Segmented options={ENGLISH} value={english} onChange={setEnglish} className="mt-1.5 w-full" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-small font-medium">¿Qué sabes hacer? Escribe y elige.</p>
            <TagInput
              tags={skills}
              onAdd={(tag) => setSkills((prev) => (prev.length < 30 ? [...prev, tag] : prev))}
              onRemove={(tag) => {
                setSkills((prev) => prev.filter((skill) => skill !== tag));
                setTopSkills((prev) => prev.filter((skill) => skill !== tag));
              }}
              hint="Escribe una skill y presiona Enter, o elige una sugerencia."
            />
            {triedNext && errors.skills && (
              <p className="text-caption text-destructive-light" role="alert">{errors.skills}</p>
            )}
            {skills.length > 0 && (
              <div>
                <p className="text-small font-medium">Tu top {Math.min(3, skills.length)} más fuerte</p>
                <p className="text-caption text-muted-foreground">Toca para marcar hasta 3 que más dominas.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <FilterChip key={skill} active={topSkills.includes(skill)} onClick={() => toggle(topSkills, setTopSkills, skill, 3)}>
                      {topSkills.includes(skill) ? `★ ${skill}` : skill}
                    </FilterChip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-small font-medium">¿Qué professional path te llama la atención? (opcional, hasta 5)</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ROLE_POOL.map((role) => (
                  <FilterChip key={role} active={roles.includes(role)} onClick={() => toggle(roles, setRoles, role, 5)}>
                    {role}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-small font-medium">¿Qué disponibilidad buscas?</p>
              <Segmented
                options={AVAILABILITY as { value: Availability; label: string }[]}
                value={availability}
                onChange={setAvailability}
                className="mt-1.5 w-full"
              />
            </div>
            <label htmlFor="w-visible" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3">
              <Checkbox id="w-visible" checked={visible} onCheckedChange={(v) => setVisible(v === true)} className="mt-0.5" />
              <span className="text-small">
                <span className="font-medium">Quiero que empresas aliadas de LEAD vean mi perfil y mi CV.</span>
                <span className="mt-0.5 block text-caption text-muted-foreground">
                  Puedes cambiarlo cuando quieras desde tu perfil.
                </span>
              </span>
            </label>
            {errors.save && (
              <p className="text-caption text-destructive-light" role="alert">{errors.save}</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <p className="bg-gradient-to-r from-brand-purple-light to-brand-rose bg-clip-text text-h1 font-bold tracking-tight text-transparent">
              {isEdit ? "Perfil actualizado" : "Tu futuro en LEAD empieza aquí"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-small text-muted-foreground">
              {givenNames.trim().split(/\s+/)[0] || "Hola"}, el siguiente paso es subir tu CV.
            </p>
            <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-small text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-brand-purple-light" />
              {visible
                ? "Tu perfil será visible para empresas aliadas cuando abramos esa sección."
                : "Tu perfil es privado. Puedes hacerlo visible desde tu perfil."}
            </div>
            <div className="mt-6">
              <Button onClick={() => router.push("/perfil")}>
                Ver mi perfil <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || saving}>
              <ArrowLeft className="size-3.5" /> Atrás
            </Button>
            <p className="text-caption text-muted-foreground">Paso {step + 1} de 5</p>
            <Button type="button" onClick={next} disabled={saving}>
              {step === 3 ? (saving ? "Guardando…" : "Terminar") : "Continuar"} <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {step === 2 && (
        <p className="mt-3 flex items-center justify-center gap-1 text-caption text-muted-foreground">
          <Check className="size-3.5 text-success" /> Cuantas más skills, más apareces en las búsquedas de empresas.
        </p>
      )}
      {step === 0 && errors.save && (
        <p className="mt-3 text-center text-caption text-destructive-light" role="alert">{errors.save}</p>
      )}
    </div>
  );
}
