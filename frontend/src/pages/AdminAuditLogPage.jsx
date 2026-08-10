import { useEffect, useState, Fragment } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertCircle, History } from "lucide-react"
import axiosInstance from "@/api/axiosInstance"
import AppShell from "@/components/AppShell"
import { useAuth } from "@/auth/useAuth"

function formatDateTime(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date)
}

function JsonFormatter({ data }) {
  if (!data) return <span className="text-slate-400">-</span>
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] font-mono leading-relaxed">
      {Object.entries(data).map(([key, value]) => (
        <Fragment key={key}>
          <span className="font-semibold text-slate-700 text-right">{key}:</span>
          <span className="text-slate-600 break-words">{value === null ? "null" : String(value)}</span>
        </Fragment>
      ))}
    </div>
  )
}

export default function AdminAuditLogPage() {
  const { refreshAuth } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        const response = await axiosInstance.get("/api/admin/audit-log?size=50")
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
  }, [])

  return (
    <AppShell
      title="Audit Log"
      description="Istoricul acțiunilor din platformă"
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

        <Card className="rounded-[1.75rem] border-0 py-0 shadow-[0_22px_60px_rgba(32,46,84,0.12)] overflow-hidden">
          <CardHeader className="border-b border-[#e4d8cd] px-6 py-6 sm:px-7">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <History className="h-5 w-5 text-[#4A5681]" />
              Ultimele 50 de acțiuni
            </CardTitle>
            <CardDescription className="mt-1 text-sm leading-6 text-slate-500">
              Urmărește modificările făcute de utilizatori și sistem în timp real.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-0 py-0">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">Se încarcă logurile...</div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Nicio acțiune înregistrată.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#fcfaf8] text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Utilizator</th>
                      <th className="px-6 py-4">Operație</th>
                      <th className="px-6 py-4">Tabel</th>
                      <th className="px-6 py-4">ID Ref</th>
                      <th className="px-6 py-4 w-[250px]">Valori Vechi</th>
                      <th className="px-6 py-4 w-[250px]">Valori Noi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4d8cd]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{formatDateTime(log.creatLa)}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{log.numeUtilizator}</div>
                          {log.emailUtilizator && (
                            <div className="text-xs text-slate-500">{log.emailUtilizator}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {log.operatie}
                          </span>
                        </td>
                        <td className="px-6 py-4">{log.numeTabel}</td>
                        <td className="px-6 py-4 font-mono text-xs">{log.idInregistrare}</td>
                        <td className="px-6 py-4 align-top w-[250px]">
                          <JsonFormatter data={log.valoriVechi} />
                        </td>
                        <td className="px-6 py-4 align-top w-[250px]">
                          <JsonFormatter data={log.valoriNoi} />
                        </td>
                      </tr>
                    ))}
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
