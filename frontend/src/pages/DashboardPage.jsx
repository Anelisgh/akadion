import { useEffect, useEffectEvent, useState } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, BookOpenText, Clock3, GraduationCap, RefreshCcw, Users } from "lucide-react"
import adminDashboardLogo from "../../logo_dasboard_admin.png"
import professorDashboardLogo from "../../logo_dasboard_profesor.png"
import studentDashboardLogo from "../../logo_dashboard_student.png"
import AppShell from "@/components/AppShell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getAdminStats,
  getCourseErrorMessage,
  listProfessorCourses,
  listStudentAvailableCourses,
  listStudentCourses,
} from "@/lib/professorCourses"
import { getUserGreetingName, isAdminUser, isProfessorUser, normalizeRole } from "@/lib/user"
import { useAuth } from "@/auth/useAuth"

function DashboardStatCard({ icon: Icon, label, value, note, tone = "blue", action }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-[#eef1fb] text-[#4A5681]"

  return (
    <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
      <CardContent className="flex items-center justify-between gap-4 px-5 py-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {note ? <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  )
}

function getActiveCourseCounts(courses) {
  const active = courses.filter((course) => course.activ).length
  return { active, inactive: courses.length - active, total: courses.length }
}

function CourseListCard({ title, description, courses, loading, emptyMessage, action, getCourseHref = (course) => `/courses/${course.id}` }) {
  return (
    <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-[#fcf8f3] shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6">
        {loading ? <p className="text-sm text-slate-500">Se încarcă lista de cursuri...</p> : null}
        {!loading && courses.length === 0 ? <p className="rounded-3xl border border-dashed border-[#d8ccbf] bg-white/70 px-5 py-8 text-center text-sm text-slate-500">{emptyMessage}</p> : null}
        {!loading && courses.length > 0 ? (
          <div className="space-y-2">
            {courses.slice(0, 4).map((course) => (
              <Link key={course.id} to={getCourseHref(course)} state={{ course }} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4d8cd] bg-white/80 px-4 py-3 text-sm transition hover:border-[#c8b9aa]">
                <span className="font-semibold text-[#24385b]">{course.denumire}</span>
                <span className={course.activ ? "text-emerald-700" : "text-slate-500"}>{course.activ ? "Activ" : "Inactiv"}</span>
              </Link>
            ))}
            {courses.length > 4 ? <p className="text-xs text-slate-500">+{courses.length - 4} cursuri în pagina Cursuri.</p> : null}
          </div>
        ) : null}
        {action ? <div className="pt-2">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

function EmptyFeatureCard({ icon: Icon, title, description, action }) {
  return (
    <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
      <CardHeader className="px-6 pt-6">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5eee5] text-[#4A5681]">
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent className="px-6 pb-6">{action}</CardContent> : null}
    </Card>
  )
}

function AdminDashboard() {
  const { refreshAuth } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadDashboard() {
    setLoading(true)
    setError("")

    try {
      setStats(await getAdminStats())
    } catch (loadError) {
      if (loadError.response?.status === 401) {
        await refreshAuth()
      }
      setError(loadError.response?.data?.message ?? loadError.response?.data?.eroare ?? "Nu am putut încărca datele dashboardului.")
    } finally {
      setLoading(false)
    }
  }

  const syncDashboard = useEffectEvent(async () => {
    await loadDashboard()
  })

  useEffect(() => {
    syncDashboard()
  }, [])

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Eroare dashboard admin</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          icon={Clock3}
          label="Cereri PENDING"
          value={loading ? "..." : (stats?.utilizatoriPending ?? 0)}
          tone="amber"
          action={
            <Button asChild variant="outline" size="sm" className="rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-50">
              <Link to="/admin/users?stare=PENDING">Vezi detalii</Link>
            </Button>
          }
        />
        <DashboardStatCard icon={BookOpenText} label="Cursuri active" value={loading ? "..." : (stats?.cursuriActive ?? 0)} />
        <DashboardStatCard icon={Users} label="Utilizatori activi" value={loading ? "..." : (stats?.utilizatoriActivi ?? 0)} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-[#fcf8f3] shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl text-slate-900">Cursuri</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Situația curentă a cursurilor din platformă.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-cyan-200/80 bg-linear-to-r from-[#dff7ff] via-[#c7efff] to-[#a8dcff] px-4 py-3 text-[#1c4f73]">
                  <span className="text-sm font-semibold">ACTIVE</span>
                  <span className="text-lg font-semibold">{loading ? "..." : (stats?.cursuriActive ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-rose-200/80 bg-linear-to-r from-[#ffe1e1] via-[#ffc9c9] to-[#ffb1b1] px-4 py-3 text-[#8f2d2d]">
                  <span className="text-sm font-semibold">INACTIVE</span>
                  <span className="text-lg font-semibold">{loading ? "..." : (stats?.cursuriInactive ?? 0)}</span>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-[#fcf8f3] shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl text-slate-900">Utilizatori</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Situația curentă a utilizatorilor din platformă.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-linear-to-r from-[#dff8e7] via-[#c8f1d6] to-[#a7e7bf] px-4 py-3 text-[#1f6a3d]">
                  <span className="text-sm font-semibold">ACTIVI</span>
                  <span className="text-lg font-semibold">{loading ? "..." : (stats?.utilizatoriActivi ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-linear-to-r from-[#fff2dc] via-[#ffe3bf] to-[#ffd39c] px-4 py-3 text-[#9a5a16]">
                  <span className="text-sm font-semibold">PENDING</span>
                  <span className="text-lg font-semibold">{loading ? "..." : (stats?.utilizatoriPending ?? 0)}</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-2xl bg-[#4A5681] text-white hover:bg-[#3f4a72]">
                <Link to="/admin/users?stare=PENDING">Vezi detalii</Link>
              </Button>
              <Button type="button" variant="outline" onClick={loadDashboard} disabled={loading} className="rounded-2xl border-[#d9ccbe] bg-white">
                <RefreshCcw className="h-4 w-4" />
                Reîncarcă
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ProfessorDashboard() {
  const { refreshAuth } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadCourses() {
    setLoading(true)
    setError("")

    try {
      setCourses(await listProfessorCourses())
    } catch (loadError) {
      if (loadError.response?.status === 401) {
        await refreshAuth()
      }
      setError(getCourseErrorMessage(loadError, "Nu am putut încărca cursurile tale."))
    } finally {
      setLoading(false)
    }
  }

  const syncProfessorDashboard = useEffectEvent(async () => {
    await loadCourses()
  })

  useEffect(() => {
    syncProfessorDashboard()
  }, [])

  const courseCounts = getActiveCourseCounts(courses)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursurile mele</h2>
      </div>

      {error ? (
        <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Eroare cursuri</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard icon={BookOpenText} label="Cursuri totale" value={loading ? "..." : courseCounts.total} />
        <DashboardStatCard icon={GraduationCap} label="Cursuri active" value={loading ? "..." : courseCounts.active} tone="emerald" />
        <DashboardStatCard icon={Clock3} label="Cursuri inactive" value={loading ? "..." : courseCounts.inactive} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CourseListCard
          title="Cursurile tale"
          description="Toate cursurile asociate contului tău."
          courses={courses}
          loading={loading}
          emptyMessage="Nu ai adăugat încă niciun curs."
          action={<Button asChild className="rounded-2xl bg-[#4A5681] text-white hover:bg-[#3f4a72]"><Link to="/courses">Vezi toate cursurile</Link></Button>}
        />
        <EmptyFeatureCard
          icon={GraduationCap}
          title="Studenți înscriși"
          description="Studenții înscriși sunt disponibili în pagina fiecărui curs."
          action={<Button asChild variant="outline" className="rounded-2xl border-[#d9ccbe] bg-white"><Link to="/courses">Deschide cursuri</Link></Button>}
        />
      </div>
    </div>
  )
}

function StudentDashboard() {
  const { refreshAuth } = useAuth()
  const [courses, setCourses] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadCourses() {
    setLoading(true)
    setError("")

    try {
      const [enrolled, available] = await Promise.all([
        listStudentCourses(),
        listStudentAvailableCourses(),
      ])
      setCourses(Array.isArray(enrolled) ? enrolled : [])
      setAvailableCourses(Array.isArray(available) ? available : [])
    } catch (loadError) {
      if (loadError.response?.status === 401) {
        await refreshAuth()
      }
      setError(getCourseErrorMessage(loadError, "Nu am putut încărca lista de cursuri."))
    } finally {
      setLoading(false)
    }
  }

  const syncStudentDashboard = useEffectEvent(async () => {
    await loadCourses()
  })

  useEffect(() => {
    syncStudentDashboard()
  }, [])

  return (
    <div className="space-y-5">
      {error ? (
        <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Eroare cursuri</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardStatCard icon={BookOpenText} label="Cursurile mele" value={loading ? "..." : courses.length} tone="emerald" />
        <DashboardStatCard icon={GraduationCap} label="Cursuri disponibile" value={loading ? "..." : availableCourses.length} note="Disponibile pentru înscriere." />
      </div>

      <CourseListCard
        title="Cursurile mele"
        description="Cursurile la care ești înscris acum."
        courses={courses.map((course) => ({ ...course, activ: true }))}
        loading={loading}
        emptyMessage="Nu ești înscris momentan la niciun curs."
        action={<Button asChild className="rounded-2xl bg-[#4A5681] text-white hover:bg-[#3f4a72]"><Link to="/courses">Vezi cursuri</Link></Button>}
      />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const role = normalizeRole(user?.rol)
  const isAdmin = isAdminUser(user)
  const isProfessor = isProfessorUser(user)
  const isStudent = !isAdmin && !isProfessor
  const dashboardHeroClassName = isAdmin
    ? "relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
    : "relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#0f9fbd] via-[#17b7d3] to-[#56d5ea] text-white shadow-[0_24px_60px_rgba(23,133,161,0.24)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/16 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"

  return (
    <AppShell
      title={`Salut, ${getUserGreetingName(user)}!`}
      eyebrow={role ? `Dashboard ${role}` : "Dashboard"}
      heroClassName={dashboardHeroClassName}
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
      heroVisual={isStudent
        ? <img src={studentDashboardLogo} alt="Dashboard student" className="h-auto w-28 object-contain drop-shadow-[0_14px_24px_rgba(20,62,92,0.14)] lg:w-32 xl:w-36" />
        : isProfessor
          ? <img src={professorDashboardLogo} alt="Dashboard profesor" className="h-auto w-28 object-contain drop-shadow-[0_14px_24px_rgba(20,62,92,0.14)] lg:w-32 xl:w-36" />
          : isAdmin
            ? <img src={adminDashboardLogo} alt="Dashboard administrator" className="h-auto w-30 object-contain drop-shadow-[0_14px_24px_rgba(20,62,92,0.14)] lg:w-34 xl:w-38" />
          : null}
      heroVisualClassName={isProfessor
        ? "right-2 bottom-[-0.35rem] top-auto h-full items-end justify-center lg:right-5"
        : isAdmin
          ? "right-2 bottom-[-1rem] top-auto h-full items-end justify-center lg:right-5"
          : "right-2 bottom-[-1rem] top-auto h-full items-end justify-center lg:right-5"}
    >
      {isAdmin ? <AdminDashboard /> : null}
      {isProfessor ? <ProfessorDashboard /> : null}
      {isStudent ? <StudentDashboard /> : null}
    </AppShell>
  )
}
