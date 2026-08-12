import { Fragment, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, History } from "lucide-react"
import axiosInstance from "@/api/axiosInstance"
import AppShell from "@/components/AppShell"
import { useAuth } from "@/auth/useAuth"

const limitOptions = [10, 20, 50]

const actionLabelMap = {
  CREATE: "CREARE",
  CREATED: "CREARE",
  ACTIVATE: "ACTIVARE",
  ACTIVATED: "ACTIVARE",
  UPLOAD: "ÎNCĂRCARE",
  UPLOADED: "ÎNCĂRCARE",
  PUBLISH: "PUBLICARE",
  PUBLISHED: "PUBLICARE",
  DELETE: "ȘTERGERE",
  DELETED: "ȘTERGERE",
  STERGERE: "ȘTERGERE",
  REMOVE: "ȘTERGERE",
  REMOVED: "ȘTERGERE",
  REJECT: "RESPINGERE",
  REJECTED: "RESPINGERE",
  ERROR: "EROARE",
  DEACTIVATE: "DEZACTIVARE",
  DEACTIVATED: "DEZACTIVARE",
  ARCHIVE: "ARHIVARE",
  ARCHIVED: "ARHIVARE",
  UPDATE: "ACTUALIZARE",
  UPDATED: "ACTUALIZARE",
  MODIFY: "MODIFICARE",
  MODIFIED: "MODIFICARE",
}

const creationActions = new Set(["CREARE"])
const positiveActions = new Set(["ACTIVARE", "ÎNCĂRCARE", "PUBLICARE"])
const destructiveActions = new Set(["ȘTERGERE", "STERGERE", "RESPINGERE", "EROARE"])
const warningActions = new Set(["DEZACTIVARE", "ARHIVARE"])

function getDisplayAction(action) {
  if (!action) return "-"
  const normalizedAction = String(action).trim().toUpperCase()
  return actionLabelMap[normalizedAction] || normalizedAction.replaceAll("_", " ")
}

function getActionBadgeClass(action) {
  const displayAction = getDisplayAction(action)

  if (creationActions.has(displayAction)) {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }

  if (positiveActions.has(displayAction)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (destructiveActions.has(displayAction)) {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  if (warningActions.has(displayAction)) {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-indigo-200 bg-indigo-50 text-indigo-700"
}

function formatDateTime(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date)
}

function formatDateTimeParts(value) {
  const formatted = formatDateTime(value)
  if (formatted === "-" || !formatted.includes(",")) {
    return { date: formatted, time: "" }
  }

  const [datePart, timePart] = formatted.split(",")
  return {
    date: datePart.trim(),
    time: timePart.trim(),
  }
}

function JsonFormatter({ data }) {
  if (!data) {
    return (
      <div className="flex min-h-[92px] items-center justify-center rounded-3xl border border-dashed border-[#e6dacd] bg-[#fdfaf6] px-4 py-4 text-center text-sm font-medium text-slate-400">
        -
      </div>
    )
  }

  return (
    <div className="min-h-[92px] rounded-3xl border border-[#ebdfd2] bg-linear-to-br from-[#fffdfa] to-[#faf6f1] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex min-h-full flex-col items-center justify-center gap-2 text-center font-sans">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-wrap items-center justify-center gap-2 text-[12px] leading-relaxed">
            <span className="font-medium tracking-[0.01em] text-slate-500">{key}:</span>
            <span className="break-words font-semibold tracking-[0.01em] text-slate-800">{value === null ? "null" : String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminAuditLogPage() {
  const { refreshAuth } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [limit, setLimit] = useState("50")

  useEffect(() => {
    async function fetchLogs() {
      try {
        setError("")
        setLoading(true)
        const response = await axiosInstance.get(`/api/admin/audit-log?size=${limit}`)
        setLogs(response.data?.content || [])
      } catch (err) {
        if (err.response?.status === 401) {
          await refreshAuth()
        }
        setError("Nu am putut încărca audit log-ul.")
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [limit, refreshAuth])

  return (
    <AppShell
      title="Istoric modificări"
      description="Vizualizează acțiunile și modificările efectuate în platformă."
      eyebrow="Akadion Admin"
      heroClassName="relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
    >
      <div className="space-y-5">
        {error ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare la încărcare</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="overflow-hidden rounded-[1.75rem] border-0 py-0 shadow-[0_22px_60px_rgba(32,46,84,0.12)]">
          <CardHeader className="border-b border-[#e4d8cd] px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                  <History className="h-5 w-5 text-[#4A5681]" />
                  Activitate recentă
                </CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-slate-500">
                  Cele mai recente acțiuni înregistrate în platformă.
                </CardDescription>
              </div>

              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger
                  aria-label="Selectează numărul de acțiuni afișate"
                  className="h-10 min-w-[220px] self-start rounded-2xl border-[#e4d8cd] bg-[#fcfaf8] px-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-[#e4d8cd] bg-white p-1 shadow-[0_20px_50px_rgba(32,46,84,0.16)]">
                  {limitOptions.map((option) => (
                    <SelectItem key={option} value={String(option)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-[#f7efe6] focus:text-[#24385b]">
                      {`Ultimele ${option} de acțiuni`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="px-0 py-0">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">Se încarcă logurile...</div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Nicio acțiune înregistrată.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#fcfaf8] text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    <tr>
                      <th className="border-b border-[#eadfd4] px-6 py-4">Data</th>
                      <th className="border-b border-[#eadfd4] px-6 py-4">Utilizator</th>
                      <th className="border-b border-[#eadfd4] px-6 py-4">Acțiune</th>
                      <th className="border-b border-[#eadfd4] px-6 py-4">Resursă</th>
                      <th className="border-b border-[#eadfd4] px-6 py-4">ID</th>
                      <th className="w-[250px] border-b border-[#eadfd4] px-6 py-4">Înainte</th>
                      <th className="w-[250px] border-b border-[#eadfd4] px-6 py-4">După</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4d8cd]">
                    {logs.map((log) => {
                      const { date, time } = formatDateTimeParts(log.creatLa)

                      return (
                      <tr key={log.id} className="transition-colors hover:bg-[#fcfaf8]">
                        <td className="px-6 py-[18px] text-slate-900">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="font-medium whitespace-nowrap">{date}</div>
                            {time ? <div className="mt-1 text-xs font-semibold whitespace-nowrap text-slate-500">{time}</div> : null}
                          </div>
                        </td>
                        <td className="px-6 py-[18px]">
                          <div className="font-medium text-slate-900">{log.numeUtilizator}</div>
                          {log.emailUtilizator ? <div className="text-xs text-slate-500">{log.emailUtilizator}</div> : null}
                        </td>
                        <td className="px-6 py-[18px]">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase ${getActionBadgeClass(log.operatie)}`}>
                            {getDisplayAction(log.operatie)}
                          </span>
                        </td>
                        <td className="px-6 py-[18px] font-medium text-slate-700">{log.numeTabel}</td>
                        <td className="px-6 py-[18px] font-mono text-xs font-semibold text-slate-700">{log.idInregistrare}</td>
                        <td className="w-[250px] px-6 py-[18px] align-top">
                          <JsonFormatter data={log.valoriVechi} />
                        </td>
                        <td className="w-[250px] px-6 py-[18px] align-top">
                          <JsonFormatter data={log.valoriNoi} />
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
