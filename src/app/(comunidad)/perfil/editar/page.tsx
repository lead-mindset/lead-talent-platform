"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Eye,
  ExternalLink,
  FileText,
  GraduationCap,
  Languages,
  Plus,
  Save,
  Sparkles,
  Target,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Field } from "@/components/form";
import { PhotoUpload } from "@/components/photo-upload";
import { TagInput } from "@/components/tag-input";
import { profile } from "@/lib/data/profile";
import { AVAILABILITY, CHAPTERS, LANGUAGE_LEVELS, ROLE_POOL } from "@/lib/data/options";
import { combine, required, url } from "@/lib/validators";

type Experience = { role: string; company: string; period: string };
type Language = { name: string; level: string };

function SectionCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-h3 font-semibold">
          <Icon className="size-4 text-brand-purple-light" /> {title}
        </CardTitle>
        {hint ? <p className="mt-1 text-small text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();

  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline);
  const [location, setLocation] = useState(profile.location);
  const [country, setCountry] = useState(profile.country);
  const [about, setAbout] = useState(profile.about);

  const [university, setUniversity] = useState(profile.school);
  const [major, setMajor] = useState(profile.major);
  const [gradYear, setGradYear] = useState((profile.classYear.match(/\d{4}/) ?? ["2029"])[0]);
  const [chapter, setChapter] = useState(profile.leadChapter);

  const [skills, setSkills] = useState<string[]>(profile.skills.map((skill) => skill.name));
  const [topSkills, setTopSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState<Experience[]>(profile.experience.map((item) => ({ ...item })));
  const [languages, setLanguages] = useState<Language[]>(profile.languages.map((item) => ({ ...item })));

  const [roles, setRoles] = useState<string[]>(profile.areasOfInterest);
  const [availability, setAvailability] = useState("practicas");
  const [github, setGithub] = useState(profile.githubUrl);
  const [linkedin, setLinkedin] = useState(profile.linkedinUrl);
  const [share, setShare] = useState(profile.shareWithCompanies);

  const initials = name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "LE";

  const toggleIn = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const toggleTopSkill = (skill: string) =>
    setTopSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((item) => item !== skill);
      if (prev.length >= 3) return prev;
      return [...prev, skill];
    });

  const updateExperience = (index: number, patch: Partial<Experience>) =>
    setExperience((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateLanguage = (index: number, patch: Partial<Language>) =>
    setLanguages((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const save = () => {
    const nameError = required("Escribe tu nombre")(name);
    const linkError = linkedin.trim() ? combine(url())(linkedin) : undefined;
    if (nameError || linkError) {
      setError(nameError ?? linkError);
      setTouched(true);
      return;
    }
    const gradNum = Number(gradYear);
    if (
      gradYear.trim() &&
      (!/^\d{4}$/.test(gradYear.trim()) || gradNum < 1990 || gradNum > 2040)
    ) {
      setError("Escribe un año de graduación válido (por ejemplo 2029).");
      setTouched(true);
      return;
    }
    setError(undefined);
    const chapterChanged = chapter !== profile.leadChapter;
    toast({
      title: "Perfil actualizado",
      description: chapterChanged
        ? `Cambiaste de capítulo. Tu perfil pasó a revisión${chapter ? ` del e-board de ${chapter}` : " del equipo global de LEAD"}. Se mostrará a empresas cuando la validen.`
        : "Tus cambios ya se ven en tu perfil.",
      variant: "success",
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/perfil" className="inline-flex items-center gap-1.5 text-caption text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Volver a mi perfil
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight">Editar perfil</h1>
          <p className="mt-1 text-small text-muted-foreground">
            Es la información que compartes con LEAD y las empresas. Mantenla al día.
          </p>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        {/* Tú */}
        <SectionCard icon={User} title="Tú" hint="Tu foto y cómo te presentas.">
          <PhotoUpload value={photo} onChange={setPhoto} initials={initials} label="Tu foto (opcional)" />
          <Field label="Nombre" htmlFor="p-name" required error={touched ? error : undefined}>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo" />
          </Field>
          <Field label="Titular" htmlFor="p-headline" hint="Una línea que te describa. Ej. Estudiante de Ingeniería de Software">
            <Input id="p-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Estudiante de…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ciudad" htmlFor="p-location">
              <Input id="p-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ciudad" />
            </Field>
            <Field label="País" htmlFor="p-country">
              <Input id="p-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={FileText} title="Sobre mí" hint="Cuéntanos de ti en pocas frases.">
          <Textarea id="p-about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Soy estudiante de… me interesa… y busco…" />
        </SectionCard>

        {/* Formación — igual que en el onboarding */}
        <SectionCard icon={GraduationCap} title="Formación" hint="Lo mismo que elegiste al entrar a LEAD. Puedes actualizarlo.">
          <Field label="Universidad" htmlFor="p-uni">
            <Input id="p-uni" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Tu universidad" />
          </Field>
          <Field label="Carrera" htmlFor="p-major">
            <Input id="p-major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Qué estudias" />
          </Field>
          <div>
            <Label htmlFor="p-grad">¿Cuándo te gradúas?</Label>
            <Input
              id="p-grad"
              type="number"
              inputMode="numeric"
              min={1990}
              max={2040}
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              placeholder="Ej. 2029"
              className="mt-1.5"
            />
            <p className="mt-1.5 text-caption text-muted-foreground">
              Incluye a quienes ya se graduaron. Escribe el año si no aparece.
            </p>
          </div>
          <div>
            <Label htmlFor="p-chapter">Tu capítulo</Label>
            <Select value={chapter} onValueChange={setChapter}>
              <SelectTrigger id="p-chapter" className="mt-1.5 h-10 w-full justify-between rounded-md">
                <SelectValue placeholder="Elige tu capítulo" />
              </SelectTrigger>
              <SelectContent>
                {CHAPTERS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
                <SelectItem value="">Sin capítulo</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-caption text-muted-foreground">
              Sin capítulo eres general member y tu perfil lo revisa el equipo global de LEAD.
            </p>
            {chapter !== profile.leadChapter ? (
              <p className="mt-1.5 rounded-md bg-brand-purple/10 px-3 py-2 text-caption text-brand-purple-light">
                {chapter
                  ? `Cambiaste de capítulo. Tu perfil pasa a revisión del e-board de ${chapter} antes de mostrarse a empresas.`
                  : "Sin capítulo. Tu perfil lo revisa el equipo global de LEAD antes de mostrarse a empresas."}
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard icon={Sparkles} title="Skills" hint="Lo que sabes hacer. Aparecen en las búsquedas de empresas.">
          <TagInput
            tags={skills}
            onAdd={(tag) => setSkills((prev) => [...prev, tag])}
            onRemove={(tag) => {
              setSkills((prev) => prev.filter((item) => item !== tag));
              setTopSkills((prev) => prev.filter((item) => item !== tag));
            }}
          />
          {skills.length > 0 ? (
            <div>
              <Label>Tus {Math.min(3, skills.length)} más fuertes</Label>
              <p className="text-caption text-muted-foreground">Marca hasta 3. Aparecen primero en tu perfil.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <FilterChip key={skill} active={topSkills.includes(skill)} onClick={() => toggleTopSkill(skill)}>
                    {topSkills.includes(skill) ? `★ ${skill}` : skill}
                  </FilterChip>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        {/* Experiencia — filas amigables */}
        <SectionCard icon={Briefcase} title="Experiencia" hint="Prácticas, trabajos o roles en tu capítulo. Opcional.">
          {experience.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-small text-muted-foreground">
              Todavía no agregaste experiencia.
            </p>
          ) : null}
          {experience.map((item, index) => (
            <div key={index} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  Experiencia {index + 1}
                </p>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar experiencia" onClick={() => setExperience((prev) => prev.filter((_, i) => i !== index))}>
                  <X />
                </Button>
              </div>
              <div className="mt-2 space-y-3">
                <Field label="Rol" htmlFor={`exp-role-${index}`}>
                  <Input id={`exp-role-${index}`} value={item.role} onChange={(e) => updateExperience(index, { role: e.target.value })} placeholder="Ej. Practicante de Ingeniería" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Organización" htmlFor={`exp-company-${index}`}>
                    <Input id={`exp-company-${index}`} value={item.company} onChange={(e) => updateExperience(index, { company: e.target.value })} placeholder="Empresa o capítulo" />
                  </Field>
                  <Field label="Periodo" htmlFor={`exp-period-${index}`}>
                    <Input id={`exp-period-${index}`} value={item.period} onChange={(e) => updateExperience(index, { period: e.target.value })} placeholder="Ej. 2026" />
                  </Field>
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setExperience((prev) => [...prev, { role: "", company: "", period: "" }])}>
            <Plus className="size-3.5" /> Agregar experiencia
          </Button>
        </SectionCard>

        {/* Idiomas */}
        <SectionCard icon={Languages} title="Idiomas" hint="Tu nivel en cada idioma.">
          {languages.map((item, index) => (
            <div key={index} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Idioma {index + 1}</p>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar idioma" onClick={() => setLanguages((prev) => prev.filter((_, i) => i !== index))}>
                  <X />
                </Button>
              </div>
              <div className="mt-2 space-y-3">
                <Field label="Idioma" htmlFor={`lang-name-${index}`}>
                  <Input id={`lang-name-${index}`} value={item.name} onChange={(e) => updateLanguage(index, { name: e.target.value })} placeholder="Ej. Inglés" />
                </Field>
                <div>
                  <Label>Nivel</Label>
                  <Segmented
                    className="mt-1.5 w-full"
                    value={item.level}
                    onChange={(value) => updateLanguage(index, { level: value })}
                    options={LANGUAGE_LEVELS.map((level) => ({ value: level, label: level }))}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setLanguages((prev) => [...prev, { name: "", level: "Intermedio" }])}>
            <Plus className="size-3.5" /> Agregar idioma
          </Button>
        </SectionCard>

        {/* Objetivos — igual que en el onboarding */}
        <SectionCard icon={Target} title="Qué buscas" hint="Las áreas profesionales que te llaman la atención.">
          <div>
            <Label>Professional path</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLE_POOL.map((role) => (
                <FilterChip key={role} active={roles.includes(role)} onClick={() => toggleIn(roles, setRoles, role)}>
                  {role}
                </FilterChip>
              ))}
            </div>
          </div>
          <div>
            <Label>Disponibilidad</Label>
            <Segmented className="mt-1.5 w-full" value={availability} onChange={setAvailability} options={AVAILABILITY} />
          </div>
        </SectionCard>

        <SectionCard icon={ExternalLink} title="Enlaces">
          <Field label="GitHub" htmlFor="p-github" hint="Opcional">
            <Input id="p-github" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/tu-usuario" />
          </Field>
          <Field label="LinkedIn" htmlFor="p-linkedin" error={touched && linkedin.trim() ? combine(url())(linkedin) : undefined}>
            <Input id="p-linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/tu-usuario" />
          </Field>
        </SectionCard>

        <SectionCard icon={Eye} title="Visibilidad para empresas">
          <label className="flex items-start gap-3">
            <Switch checked={share} onCheckedChange={(checked) => setShare(checked === true)} />
            <span>
              <span className="block text-small font-medium">Mostrar mi perfil a empresas</span>
              <span className="mt-0.5 block text-caption text-muted-foreground">
                Si lo activas, las empresas invitadas podrán ver tu perfil. Puedes desactivarlo cuando quieras. Esto no
                cambia si eres parte de LEAD.
              </span>
            </span>
          </label>
        </SectionCard>
      </div>

      <div className="sticky bottom-0 z-30 -mx-6 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-background/85 px-6 py-3 backdrop-blur">
        <Button variant="ghost" onClick={() => router.push("/perfil")}>Cancelar</Button>
        <Button className="gap-1.5" onClick={save}>
          <Save className="size-3.5" /> Guardar cambios
        </Button>
      </div>
    </div>
  );
}
