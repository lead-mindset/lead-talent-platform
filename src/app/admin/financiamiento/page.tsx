"use client";

import { useState } from "react";
import { Check, ChevronDown, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useAdminRole } from "@/lib/admin-role";
import { useCurrentUser } from "@/lib/use-current-user";
import { FUNDING_STATUS } from "@/lib/status";

type BudgetItem = { name: string; amount: string };
type FundingStatus = "submitted" | "approved" | "changes_requested" | "rejected" | "receipts_due";

type FundingReq = {
  id: string;
  title: string;
  chapter: string;
  requester: string;
  tipo: "Evento" | "Iniciativa";
  event?: string;
  pillar: string;
  items: BudgetItem[];
  status: FundingStatus;
  requested: number;
  approved: number;
  note?: string;
  late?: boolean;
};

const initialRequests: FundingReq[] = [
  { id: "f1", title: "Discover Day 2027 — materiales", chapter: "LEAD UTEC", requester: "Luis Maquera", tipo: "Evento", event: "Discover Day 2027", pillar: "Educación", items: [{ name: "Impresiones", amount: "120" }, { name: "Catering", amount: "200" }], status: "submitted", requested: 320, approved: 0, late: true },
  { id: "f2", title: "Hackathon — premios", chapter: "LEAD PUCP", requester: "Xendra Jaime", tipo: "Iniciativa", pillar: "Tecnología", items: [{ name: "Premios", amount: "150" }], status: "approved", requested: 150, approved: 150 },
  { id: "f3", title: "Networking — catering", chapter: "LEAD Javeriana", requester: "Camila Rojas", tipo: "Evento", pillar: "Comunidad", items: [{ name: "Catering", amount: "90" }], status: "submitted", requested: 90, approved: 0 },
];

const statusFilters: { value: "all" | FundingStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "submitted", label: "Enviadas" },
  { value: "approved", label: "Aprobadas" },
  { value: "changes_requested", label: "Cambios pedidos" },
  { value: "rejected", label: "Rechazadas" },
  { value: "receipts_due", label: "Recibos" },
];

export default function AdminFinanciamientoPage() {
  const { role } = useAdminRole();
  const user = useCurrentUser();
  const [requests, setRequests] = useState<FundingReq[]>(initialRequests);
  const [filter, setFilter] = useState<"all" | FundingStatus>("submitted");
  const [form, setForm] = useState({ title: "", tipo: "Evento" as "Evento" | "Iniciativa", pillar: "Educación", eventTitle: "" });
  const [items, setItems] = useState<BudgetItem[]>([{ name: "", amount: "" }]);
  const [openReview, setOpenReview] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [partial, setPartial] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [recent, setRecent] = useState<Set<string>>(new Set());

  // ---- chapter request form ----
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const setItem = (index: number, key: keyof BudgetItem, value: string) => setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  const addItem = () => setItems((prev) => [...prev, { name: "", amount: "" }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const canSubmit = form.title.trim() && total > 0 && items.every((item) => item.name.trim());
  const send = () => {
    if (!canSubmit) return;
    setRequests((prev) => [{ id: `new-${Date.now()}`, title: form.title, chapter: user.scope, requester: user.name, tipo: form.tipo, event: form.eventTitle || undefined, pillar: form.pillar, items: items.filter((item) => item.name.trim()), status: "submitted", requested: total, approved: 0 }, ...prev]);
    setForm({ title: "", tipo: "Evento", pillar: "Educación", eventTitle: "" });
    setItems([{ name: "", amount: "" }]);
  };

  // ---- admin review actions ----
  const approve = (id: string, amount?: number, note?: string) =>
    setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status: "approved", approved: amount ?? request.requested } : request)));
  const setStatus = (id: string, status: FundingStatus) =>
    setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status } : request)));
  const addNote = (id: string) => {
    const text = (notes[id] ?? "").trim();
    if (!text) return;
    setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, note: text } : request)));
    setNotes((prev) => ({ ...prev, [id]: "" }));
  };

  const decide = (id: string, status: FundingStatus, msg: string, amount?: number) => {
    const prev = requests.find((r) => r.id === id);
    const prevStatus = prev?.status ?? "submitted";
    setRequests((all) => all.map((r) => (r.id === id ? { ...r, status, approved: amount ?? (status === "approved" ? r.requested : r.approved), note: (notes[id] ?? "").trim() || r.note } : r)));
    setRecent((prevSet) => new Set(prevSet).add(id));
    setOpenReview(null);
    toast({
      title: msg,
      action: {
        label: "Deshacer",
        onClick: () => {
          setRequests((all) => all.map((r) => (r.id === id ? { ...r, status: prevStatus } : r)));
          setRecent((prevSet) => { const n = new Set(prevSet); n.delete(id); return n; });
        },
      },
    });
  };

  const visible = filter === "all" ? requests : requests.filter((request) => request.status === filter || recent.has(request.id));
  const submittedCount = requests.filter((request) => request.status === "submitted").length;

  if (role !== "chapter") {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-h1 font-bold tracking-tight">Financiamiento</h1>
          <p className="mt-1 text-small text-muted-foreground">
            Revisa las solicitudes y decide: aprueba, pide cambios o rechaza.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={filter} onChange={setFilter} options={statusFilters.map((f) => ({ value: f.value, label: f.value === "submitted" ? `Por revisar · ${submittedCount}` : f.label }))} />
        </div>

        <div className="card-surface divide-y divide-border/60 rounded-xl border border-border/60">
          {visible.map((request) => {
            const open = openReview === request.id;
            return (
              <div key={request.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 truncate font-medium">
                      {request.title}
                      {request.late && <StatusBadge tone="destructive">Tardía</StatusBadge>}
                    </p>
                    <p className="truncate text-caption text-muted-foreground">
                      {request.chapter} · {request.pillar} · {request.tipo}
                    </p>
                  </div>
                  <span className="font-semibold">${request.requested}</span>
                  <StatusBadge tone={FUNDING_STATUS[request.status].tone}>{FUNDING_STATUS[request.status].label}</StatusBadge>

                  {request.status === "submitted" ? (
                    <Button size="sm" variant={open ? "secondary" : "outline"} onClick={() => setOpenReview(open ? null : request.id)}>
                      {open ? "Cerrar" : "Revisar"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setStatus(request.id, "submitted")}>
                      <RotateCcw className="size-3.5" /> Deshacer
                    </Button>
                  )}

                  <button type="button" onClick={() => setOpenReview(open ? null : request.id)} aria-expanded={open} aria-label="Ver detalle" className="text-muted-foreground hover:text-foreground">
                    <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {open && (
                  <div className="mt-3 grid gap-5 border-t border-border/60 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-caption font-medium text-muted-foreground">Solicitada por</p>
                      <p className="mt-1 text-small">{request.requester}{request.event ? ` · ${request.event}` : ""}</p>

                      <p className="mt-4 text-caption font-medium text-muted-foreground">Presupuesto</p>
                      <div className="mt-1 space-y-1">
                        {request.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-small">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-medium">${item.amount}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-border/40 pt-1.5 text-small font-semibold">
                          <span>Total</span><span>${request.requested}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-caption font-medium text-muted-foreground">Notas</p>
                      <p className="mt-1 text-small text-muted-foreground">
                        {request.note ? `“${request.note}”` : "Sin notas."}
                      </p>

                      {request.status === "submitted" && (
                        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                          <div>
                            <p className="text-caption font-medium text-muted-foreground">Nota para tu decisión <span className="font-normal">(opcional)</span></p>
                            <Input value={notes[request.id] ?? ""} onChange={(e) => setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))} placeholder="Ej. aprobado este mes, o qué debe ajustar…" className="mt-1" aria-label="Nota de decisión" />
                          </div>

                          <p className="text-caption font-medium text-muted-foreground">Decisión</p>

                          <Button className="w-full justify-start gap-2" onClick={() => decide(request.id, "approved", `Aprobaste el monto completo ($${request.requested}) a ${request.chapter}.`)}>
                            <Check className="size-4" /> Aprobar completo · ${request.requested}
                          </Button>

                          <div className="flex items-center gap-2">
                            <Input type="number" placeholder="$" className="w-24" aria-label="Monto parcial" value={partial[request.id] ?? ""} onChange={(e) => setPartial((prev) => ({ ...prev, [request.id]: e.target.value }))} />
                            <Button variant="outline" className="flex-1 justify-start gap-2" onClick={() => decide(request.id, "approved", `Aprobaste parcialmente ($${partial[request.id] || 0}) a ${request.chapter}.`, Number(partial[request.id]) || 0)}>
                              Aprobar parcial
                            </Button>
                          </div>

                          <div>
                            <Button variant="outline" className="w-full justify-start gap-2" disabled={!notes[request.id]?.trim()} onClick={() => decide(request.id, "changes_requested", `Pediste cambios a ${request.chapter}. El capítulo la ajustará y reenviará.`)}>
                              <Pencil className="size-4" /> Pedir cambios
                            </Button>
                            <p className="mt-1 pl-6 text-caption text-muted-foreground">{notes[request.id]?.trim() ? "Le devuelves la solicitud al capítulo para que la ajuste." : "Escribe la nota primero (qué debe ajustar)."}</p>
                          </div>

                          <div>
                            <Button variant="destructive-outline" className="w-full justify-start gap-2" onClick={() => decide(request.id, "rejected", `Rechazaste la solicitud de ${request.chapter}.`)}>
                              <X className="size-4" /> Rechazar
                            </Button>
                            <p className="mt-1 pl-6 text-caption text-muted-foreground">La rechazas. El capítulo la verá como rechazada.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- chapter request view ----
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 font-bold tracking-tight">Solicitar financiamiento</h1>
        <p className="mt-1 text-small text-muted-foreground">Itemiza el presupuesto y alínea tu solicitud con los pilares de LEAD.</p>
      </header>

      <div className="card-surface rounded-xl border border-border/60 p-5">
        <h2 className="text-h3 font-semibold">Nueva solicitud</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fr-title">Concepto <span className="text-destructive-light">*</span></Label>
            <Input id="fr-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. materiales del evento" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Segmented value={form.tipo} onChange={(tipo) => setForm({ ...form, tipo })} options={[{ value: "Evento", label: "Evento" }, { value: "Iniciativa", label: "Iniciativa" }]} />
          </div>
        </div>
        {form.tipo === "Evento" && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="fr-event">Evento vinculado</Label>
            <Input id="fr-event" value={form.eventTitle} onChange={(e) => setForm({ ...form, eventTitle: e.target.value })} placeholder="Ej. nombre del evento" />
          </div>
        )}
        <div className="mt-4 space-y-1.5">
          <Label>Pilar / OKR</Label>
          <Segmented value={form.pillar} onChange={(pillar) => setForm({ ...form, pillar })} options={["Educación", "Liderazgo", "Tecnología", "Talento", "Comunidad"].map((p) => ({ value: p, label: p }))} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <Label>Desglose <span className="text-destructive-light">*</span></Label>
            <Button size="sm" variant="brand-ghost" className="gap-1" onClick={addItem}><Plus className="size-3.5" /> Agregar item</Button>
          </div>
          <div className="mt-2 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={item.name} onChange={(e) => setItem(index, "name", e.target.value)} placeholder="Item (ej. impresiones)" className="flex-1" />
                <Input value={item.amount} onChange={(e) => setItem(index, "amount", e.target.value)} type="number" placeholder="$" className="w-28" />
                {items.length > 1 && <Button size="icon-sm" variant="destructive-ghost" aria-label="Quitar item" onClick={() => removeItem(index)}><X className="size-3.5" /></Button>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-border/60 pt-3"><span className="text-small text-muted-foreground">Total</span><span className="text-h3 font-bold">${total}</span></div>
          {form.tipo === "Evento" && form.eventTitle && (
            <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-caption text-muted-foreground">Aviso: fecha del evento dentro de 14 días — las solicitudes tardías pueden no alcanzar revisión.</p>
          )}
        </div>
        <Button size="sm" className="mt-4 gap-1.5" onClick={send} disabled={!canSubmit}><Check className="size-3.5" /> Enviar solicitud</Button>
      </div>

      <div className="card-surface divide-y divide-border/60 rounded-xl border border-border/60">
        {requests.map((request) => {
          return (
            <div key={request.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{request.title}</p>
                <p className="truncate text-caption text-muted-foreground">{request.chapter} · {request.tipo} · {request.pillar}</p>
                {request.status === "changes_requested" && request.note && (
                  <p className="mt-1 text-caption text-brand-purple-light">Cambios pedidos: “{request.note}” — ajústala y reenvía.</p>
                )}
              </div>
              <span className="font-semibold">${request.requested}</span>
              <StatusBadge tone={FUNDING_STATUS[request.status].tone}>{FUNDING_STATUS[request.status].label}</StatusBadge>
              {request.status === "changes_requested" && (
                <Button size="sm" className="gap-1" onClick={() => setStatus(request.id, "submitted")}>
                  <RotateCcw className="size-3.5" /> Reenviar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}