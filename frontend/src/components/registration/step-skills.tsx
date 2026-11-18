"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/filter-chip";
import { FieldError, StepTitle } from "./shell";

const MAX_SKILLS = 30;

/** Skills comunes para elegir con un toque. En el Paso 4 del plan vendrán del CV. */
export const COMMON_SKILLS = [
  "Python", "SQL", "Excel", "Data Analysis", "JavaScript", "React",
  "Figma", "UI/UX", "Liderazgo", "Comunicación", "Trabajo en equipo", "Gestión de proyectos",
];

const CHIP = "min-h-10 rounded-[10px] px-3.5 text-body";

/** Paso 4: skills. Toca para confirmar y agrega las que falten. */
export function StepSkills({
  skills,
  topSkills,
  onChange,
  showTopSkills,
  error,
}: {
  skills: string[];
  topSkills: string[];
  onChange: (skills: string[], topSkills: string[]) => void;
  showTopSkills: boolean;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState<string>();
  const options = [...COMMON_SKILLS, ...skills.filter((s) => !COMMON_SKILLS.includes(s))];

  const toggle = (skill: string) => {
    if (skills.includes(skill)) onChange(skills.filter((s) => s !== skill), topSkills.filter((s) => s !== skill));
    else if (skills.length < MAX_SKILLS) onChange([...skills, skill], topSkills);
  };

  const add = () => {
    const skill = draft.trim();
    setAddError(undefined);
    if (!skill) return;
    if (skill.length > 60) return setAddError("Escribe una skill más corta.");
    if (skills.length >= MAX_SKILLS) return setAddError(`Puedes tener hasta ${MAX_SKILLS} skills.`);
    const existing = options.find((s) => s.toLowerCase() === skill.toLowerCase());
    if (existing && skills.includes(existing)) return setDraft("");
    onChange([...skills, existing ?? skill], topSkills);
    setDraft("");
  };

  const toggleTop = (skill: string) => {
    if (topSkills.includes(skill)) onChange(skills, topSkills.filter((s) => s !== skill));
    else if (topSkills.length < 3) onChange(skills, [...topSkills, skill]);
  };

  return (
    <div className="space-y-6">
      <StepTitle title="Tus skills" intro="Toca las que de verdad dominas y agrega las que falten." />

      <div className="space-y-2.5">
        <p className="text-caption font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Sugeridas · toca para confirmar
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((skill) => (
            <FilterChip key={skill} active={skills.includes(skill)} onClick={() => toggle(skill)} className={CHIP}>
              {skill}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="w-skill-add" className="text-small font-semibold">
          ¿Falta alguna?
        </label>
        <div className="flex gap-2">
          <Input
            id="w-skill-add"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Escribe una skill"
            className="h-11 min-w-0 flex-1"
          />
          <Button type="button" variant="outline" className="h-11 px-4" onClick={add}>
            Agregar
          </Button>
        </div>
        <FieldError>{addError}</FieldError>
      </div>

      {showTopSkills && skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-small font-semibold">Tus {Math.min(3, skills.length)} skills principales</p>
          <p className="text-caption text-muted-foreground">Toca hasta 3 que más dominas.</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <FilterChip key={skill} active={topSkills.includes(skill)} onClick={() => toggleTop(skill)}>
                {topSkills.includes(skill) ? `★ ${skill}` : skill}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
        <span className="font-heading text-[22px] font-extrabold text-brand-purple-light" data-testid="skills-count">
          {skills.length}
        </span>
        <span className="text-small text-muted-foreground">
          skills confirmadas. Las empresas buscan por skills: confirma solo las reales.
        </span>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
