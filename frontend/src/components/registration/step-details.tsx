"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/filter-chip";
import { Field } from "@/components/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { api, cityLabel, type City, type Country, type University } from "@/lib/api";
import type { RegistrationForm, UpdateForm } from "./form";
import { FieldError, StepTitle } from "./shell";

export type DetailsErrors = { name?: string; country?: string; university?: string; year?: string; linkedin?: string };

const CITY_RESET: Partial<RegistrationForm> = {
  cityMode: "search",
  cityId: null,
  cityText: "",
  cityOther: "",
};

/** Paso 3: nombres, apellidos, país, ciudad, universidad, carrera y egreso. */
export function StepDetails({
  form,
  update,
  countries,
  errors,
  withResume,
  showLinkedin,
}: {
  form: RegistrationForm;
  update: UpdateForm;
  countries: Country[];
  errors: DetailsErrors;
  withResume: boolean;
  showLinkedin: boolean;
}) {
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [suggestions, setSuggestions] = useState<University[]>([]);

  // Sugerencias de universidades del catálogo. Si no hay, queda como texto libre.
  useEffect(() => {
    if (form.universityId || form.university.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api.searchUniversities(form.university.trim()).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [form.university, form.universityId]);

  // Ciudades del país elegido: 2 letras y 250 ms, igual que universidades.
  useEffect(() => {
    const q = cityQuery.trim();
    if (!form.country || form.cityId || form.cityMode === "other" || q.length < 2) {
      setCityResults([]);
      setSearchingCity(false);
      return;
    }
    let cancelled = false;
    setSearchingCity(true);
    const timer = window.setTimeout(() => {
      api
        .searchCities(form.country, q)
        .then((list) => !cancelled && setCityResults(list))
        .catch(() => !cancelled && setCityResults([]))
        .finally(() => !cancelled && setSearchingCity(false));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cityQuery, form.country, form.cityId, form.cityMode]);

  const resetCity = () => {
    update(CITY_RESET);
    setCityQuery("");
    setCityResults([]);
  };

  // Una ciudad es de un solo país: al cambiar de país se borra la ciudad.
  const changeCountry = (code: string) => {
    if (code === form.country) return;
    update({ country: code, ...CITY_RESET });
    setCityQuery("");
    setCityResults([]);
  };

  const pickCity = (city: City) => {
    update({ cityId: city.id, cityText: cityLabel(city.name, city.admin1) });
    setCityQuery("");
    setCityResults([]);
  };

  const cityNotFound = () => {
    update({ cityMode: "other", cityOther: cityQuery.trim() });
    setCityQuery("");
    setCityResults([]);
  };

  return (
    <div className="space-y-5">
      <StepTitle
        title="Revisa tus datos"
        intro={
          withResume
            ? "Completa lo esencial. Tu CV ya quedó guardado."
            : "Solo lo esencial. Lo demás lo puedes agregar después."
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombres" htmlFor="w-given" required error={errors.name}>
          <Input
            id="w-given"
            value={form.givenNames}
            onChange={(e) => update({ givenNames: e.target.value })}
            placeholder="Ej. María José"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Apellidos" htmlFor="w-family" hint="Si tienes">
          <Input
            id="w-family"
            value={form.familyNames}
            onChange={(e) => update({ familyNames: e.target.value })}
            placeholder="Ej. García López"
            autoComplete="family-name"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="w-country" className="text-small font-medium">
            País<span className="ml-0.5 text-destructive-light">*</span>
          </label>
          <Select value={form.country} onValueChange={changeCountry}>
            <SelectTrigger
              id="w-country"
              aria-label="País"
              aria-invalid={Boolean(errors.country)}
              className="mt-1 h-10 w-full justify-between rounded-md"
            >
              <SelectValue placeholder="Elige tu país" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.name_es}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1.5">
            <FieldError>{errors.country}</FieldError>
          </div>
        </div>

        <div>
          <label htmlFor={form.cityMode === "other" ? "w-city-other" : "w-city"} className="text-small font-medium">
            Ciudad <span className="font-normal text-muted-foreground">Opcional</span>
          </label>

          {form.cityId ? (
            <div className="mt-1 flex h-10 items-center justify-between gap-2 rounded-md border border-input px-3">
              <span className="flex min-w-0 items-center gap-1.5 text-small">
                <Check className="size-3.5 shrink-0 text-success" />
                <span className="truncate" data-testid="selected-city">
                  {form.cityText}
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={resetCity}>
                Cambiar
              </Button>
            </div>
          ) : form.cityMode === "other" ? (
            <div className="mt-1 space-y-1.5">
              <Input
                id="w-city-other"
                value={form.cityOther}
                onChange={(e) => update({ cityOther: e.target.value })}
                placeholder="Escribe tu ciudad"
                maxLength={80}
                autoFocus
              />
              <button
                type="button"
                onClick={resetCity}
                className="text-caption text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Buscar en la lista
              </button>
            </div>
          ) : (
            // cmdk nombra el input con su propia etiqueta (aria-labelledby): por eso va en `label`.
            <Command label="Buscar ciudad" shouldFilter={false} className="mt-1 h-auto border border-border/60">
              <CommandInput
                id="w-city"
                value={cityQuery}
                onValueChange={setCityQuery}
                placeholder={form.country ? "Busca tu ciudad" : "Elige primero tu país"}
                disabled={!form.country}
              />
              {form.country && cityQuery.trim().length >= 2 && (
                <CommandList aria-label="Ciudades">
                  {cityResults.map((city) => (
                    <CommandItem key={city.id} value={String(city.id)} onSelect={() => pickCity(city)}>
                      {cityLabel(city.name, city.admin1)}
                    </CommandItem>
                  ))}
                  {!searchingCity && cityResults.length === 0 && (
                    <p className="px-2 py-1.5 text-caption text-muted-foreground">No encontramos “{cityQuery.trim()}”.</p>
                  )}
                  <CommandItem value="__other__" onSelect={cityNotFound} className="text-muted-foreground">
                    No encuentro mi ciudad
                  </CommandItem>
                </CommandList>
              )}
            </Command>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Field label="Universidad" htmlFor="w-uni" required error={errors.university}>
          <Input
            id="w-uni"
            value={form.university}
            onChange={(e) => update({ university: e.target.value, universityId: null })}
            placeholder="Busca tu universidad"
            autoComplete="off"
          />
        </Field>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((u) => (
              <FilterChip
                key={u.id}
                active={false}
                onClick={() => {
                  update({ university: u.name, universityId: u.id });
                  setSuggestions([]);
                }}
              >
                {u.name}
              </FilterChip>
            ))}
          </div>
        )}
        {form.universityId && (
          <p className="flex items-center gap-1 text-caption text-muted-foreground">
            <Check className="size-3.5 text-success" /> Universidad del catálogo
          </p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Carrera" htmlFor="w-major">
          <Input
            id="w-major"
            value={form.major}
            onChange={(e) => update({ major: e.target.value })}
            placeholder="Ej. Ingeniería de Sistemas"
          />
        </Field>
        <Field label="Egreso" htmlFor="w-year" error={errors.year}>
          <Input
            id="w-year"
            type="number"
            inputMode="numeric"
            min={1990}
            max={2045}
            value={form.year}
            onChange={(e) => update({ year: e.target.value })}
            placeholder="2028"
          />
        </Field>
      </div>

      {showLinkedin && (
        <Field label="LinkedIn" htmlFor="w-li" hint="Opcional" error={errors.linkedin}>
          <Input
            id="w-li"
            value={form.linkedin}
            onChange={(e) => update({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/tu-usuario"
          />
        </Field>
      )}

      <p className="text-caption text-muted-foreground">
        Si tu universidad o tu ciudad no aparecen en la búsqueda, escríbelas igual.
      </p>
    </div>
  );
}
