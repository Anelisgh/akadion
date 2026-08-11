import { useEffect, useEffectEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AlertCircle, BookOpenText, CheckCircle2, Clock3, Plus, Users } from "lucide-react"
import adminDashboardLogo from "../../logo_dasboard_admin.png"
import professorDashboardLogo from "../../logo_dasboard_profesor.png"
import studentDashboardLogo from "../../logo_dashboard_student.png"
import AppShell from "@/components/AppShell"
import AkyChatWidget from "@/components/chat/AkyChatWidget"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  enrollStudentCourse,
  getAdminStats,
  getCourseErrorMessage,
  listProfessorCourses,
  listStudentAvailableCourses,
  listStudentCourses,
} from "@/lib/professorCourses"
import { getUserGreetingName, isAdminUser, isProfessorUser } from "@/lib/user"
import { useAuth } from "@/auth/useAuth"
import { COURSE_THEME_KEYS, DEFAULT_COURSE_THEME } from "@/lib/courseThemes"
import {
  CourseCard,
  EmptyCoursesState,
} from "@/pages/CoursesPage"
import { getCourseThemeStorageKey, normalizeAvailableCourse, normalizeEnrolledCourse } from "@/lib/courseView"
import { getStudentHomepageOwlId, getStudentHomepageOwlImage, getStudentHomepageOwlRole, hasDiscoveredOwlHall } from "@/lib/legendaryOwls"

function DashboardStatCard({ icon: Icon, label, value, note, tone = "blue", action }) {
  const toneClass = tone === "amber"
    ? "border border-[#f0c16f] bg-linear-to-br from-[#fff3df] via-[#ffdea8] to-[#ffc36b] text-[#8a3f0f] shadow-[0_12px_28px_rgba(168,93,21,0.10)]"
    : tone === "emerald"
      ? "border border-[#8fdcae] bg-linear-to-br from-[#e6f9ed] via-[#c8efd7] to-[#91dfaf] text-[#175c34] shadow-[0_12px_28px_rgba(31,107,63,0.10)]"
      : "border border-[#9fc2f4] bg-linear-to-br from-[#edf4ff] via-[#d6e7fb] to-[#a9cdf7] text-[#1f4f86] shadow-[0_12px_28px_rgba(47,95,159,0.10)]"

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

function AdminDashboard() {
  const { user, refreshAuth } = useAuth()
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
    <AppShell
      title={`Salut, ${getUserGreetingName(user)}!`}
      eyebrow="Dashboard ADMINISTRATOR"
      heroClassName="relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
      heroVisual={<img src={adminDashboardLogo} alt="Dashboard administrator" className="pointer-events-auto h-full max-h-full w-auto origin-bottom translate-y-[11%] cursor-pointer object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.22)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:brightness-105 hover:drop-shadow-[0_35px_65px_rgba(0,0,0,0.38)] active:scale-[1.03] active:brightness-105 active:drop-shadow-[0_35px_65px_rgba(0,0,0,0.38)]" />}
      heroVisualClassName="right-2 bottom-0 top-auto h-full items-end justify-center lg:right-5"
    >
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
              <Button asChild variant="outline" size="sm" className="rounded-xl border-[#f2bd68] bg-[#fff8eb] text-[#9a4d13] hover:bg-[#ffefd0]">
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
                  <div className="flex items-center justify-between rounded-2xl border border-[#89abe2] bg-linear-to-r from-[#cfe0fb] via-[#b8d3fa] to-[#91bff4] px-4 py-3 text-[#173b72] shadow-[0_14px_32px_rgba(47,95,159,0.12)]">
                    <span className="text-sm font-semibold">ACTIVE</span>
                    <span className="text-lg font-semibold">{loading ? "..." : (stats?.cursuriActive ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#ff8fa3] bg-linear-to-r from-[#ffd4dd] via-[#ffb8c7] to-[#ff8fa3] px-4 py-3 text-[#881337] shadow-[0_14px_32px_rgba(159,18,57,0.12)]">
                    <span className="text-sm font-semibold">INACTIVE</span>
                    <span className="text-lg font-semibold">{loading ? "..." : (stats?.cursuriInactive ?? 0)}</span>
                  </div>
              </div>
              <div className="pt-2">
                <Button asChild className="rounded-2xl bg-[#4A5681] text-white hover:bg-[#3f4a72]">
                  <Link to="/courses">Vezi toate cursurile</Link>
                </Button>
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
                  <div className="flex items-center justify-between rounded-2xl border border-[#7fd69f] bg-linear-to-r from-[#c8efd7] via-[#aee6c4] to-[#88dca8] px-4 py-3 text-[#14532d] shadow-[0_14px_32px_rgba(31,107,63,0.12)]">
                    <span className="text-sm font-semibold">ACTIVI</span>
                    <span className="text-lg font-semibold">{loading ? "..." : (stats?.utilizatoriActivi ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#f2bd68] bg-linear-to-r from-[#ffdda3] via-[#ffcc82] to-[#ffb95c] px-4 py-3 text-[#7c2d12] shadow-[0_14px_32px_rgba(168,93,21,0.12)]">
                    <span className="text-sm font-semibold">PENDING</span>
                    <span className="text-lg font-semibold">{loading ? "..." : (stats?.utilizatoriPending ?? 0)}</span>
                  </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-2xl bg-[#4A5681] text-white hover:bg-[#3f4a72]">
                  <Link to="/admin/users?stare=PENDING">Vezi detalii</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <AkyChatWidget />
    </AppShell>
  )
}

function ProfessorDashboard() {
  const { user, refreshAuth } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [courseThemes, setCourseThemes] = useState({})

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

  useEffect(() => {
    const nextCourseThemes = {}
    for (const course of courses) {
      try {
        const savedTheme = window.localStorage.getItem(getCourseThemeStorageKey(user, course.id))
        if (COURSE_THEME_KEYS.has(savedTheme)) {
          nextCourseThemes[course.id] = savedTheme
        }
      } catch {
        // LocalStorage fallback
      }
    }
    setCourseThemes(nextCourseThemes)
  }, [user, courses])

  function handleCourseThemeChange(courseId, themeKey) {
    if (!COURSE_THEME_KEYS.has(themeKey)) return
    setCourseThemes((current) => ({ ...current, [courseId]: themeKey }))
    try {
      window.localStorage.setItem(getCourseThemeStorageKey(user, courseId), themeKey)
    } catch {
      // LocalStorage fallback
    }
  }

  const courseCounts = getActiveCourseCounts(courses)
  const activeCourses = courses.filter((course) => course.activ)
  const inactiveCourses = courses.filter((course) => !course.activ)

  const heroContentStats = (
    <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/28 bg-white/20 px-3.5 py-1.5 text-white backdrop-blur-md shadow-xs transition hover:bg-white/25">
        <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
        <span className="text-xs font-medium text-white/90">Cursuri active:</span>
        <span className="text-sm font-bold tracking-tight text-white">{loading ? "..." : `${courseCounts.active}/${courseCounts.total}`}</span>
      </div>
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/22 bg-white/12 px-3.5 py-1.5 text-white backdrop-blur-md shadow-xs transition hover:bg-white/18">
        <span className="h-2 w-2 rounded-full bg-white/50" />
        <span className="text-xs font-medium text-white/75">Cursuri inactive:</span>
        <span className="text-sm font-bold tracking-tight text-white/90">{loading ? "..." : `${courseCounts.inactive}/${courseCounts.total}`}</span>
      </div>
    </div>
  )

  return (
    <AppShell
      title={`Salut, ${getUserGreetingName(user)}!`}
      eyebrow="Dashboard PROFESOR"
      heroClassName="relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#0f9fbd] via-[#17b7d3] to-[#56d5ea] text-white shadow-[0_24px_60px_rgba(23,133,161,0.24)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/16 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
      heroContent={heroContentStats}
      heroVisual={<img src={professorDashboardLogo} alt="Dashboard profesor" className="pointer-events-auto h-full max-h-full w-auto origin-bottom translate-y-[7.5%] cursor-pointer object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.22)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:brightness-105 hover:drop-shadow-[0_35px_65px_rgba(0,0,0,0.38)] active:scale-[1.03] active:brightness-105 active:drop-shadow-[0_35px_65px_rgba(0,0,0,0.38)]" />}
      heroVisualClassName="right-2 bottom-0 top-auto h-full items-end justify-center lg:right-5"
    >
      <div className="space-y-6">
        {error ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare cursuri</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4 pt-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursurile mele</h2>
            <Button asChild variant="outline" className="rounded-2xl border border-[#d9ccbe] bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-[#f7efe6] hover:text-slate-900 hover:border-[#bcae9e]">
              <Link to="/courses/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4 text-slate-900" />
                <span>Curs nou</span>
              </Link>
            </Button>
          </div>

          {loading ? <p className="text-sm text-slate-500">Se încarcă lista de cursuri...</p> : null}

          {!loading && courses.length > 0 ? (
            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold tracking-tight text-[#24385b]">Active</h3>
                  <span className="inline-flex items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    {activeCourses.length}
                  </span>
                </div>
                {activeCourses.length > 0 ? (
                  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {activeCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        mode="professor"
                        selectedThemeKey={courseThemes[course.id] ?? DEFAULT_COURSE_THEME}
                        onThemeChange={handleCourseThemeChange}
                        onEnroll={() => {}}
                        actionDisabled={false}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-[1.5rem] border-dashed border-[#d8ccbf] bg-[#fbf6f0] shadow-none">
                    <CardContent className="px-5 py-6 text-sm text-slate-500">
                      Nu ai niciun curs activ momentan.
                    </CardContent>
                  </Card>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold tracking-tight text-[#24385b]">Inactive</h3>
                  <span className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {inactiveCourses.length}
                  </span>
                </div>
                {inactiveCourses.length > 0 ? (
                  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {inactiveCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        mode="professor"
                        selectedThemeKey={courseThemes[course.id] ?? DEFAULT_COURSE_THEME}
                        onThemeChange={handleCourseThemeChange}
                        onEnroll={() => {}}
                        actionDisabled={false}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-[1.5rem] border-dashed border-[#d8ccbf] bg-[#fbf6f0] shadow-none">
                    <CardContent className="px-5 py-6 text-sm text-slate-500">
                      Nu ai cursuri inactive.
                    </CardContent>
                  </Card>
                )}
              </section>
            </div>
          ) : null}

          {!loading && courses.length === 0 ? (
            <EmptyCoursesState message="Nu ai adăugat încă niciun curs. Creează unul din butonul `Curs nou` și va apărea aici." />
          ) : null}
        </div>
      </div>
      <AkyChatWidget />
    </AppShell>
  )
}

function StudentDashboard() {
  const { user, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [activeAction, setActiveAction] = useState("")
  const [courseThemes, setCourseThemes] = useState({})
  const [homepageOwlImage, setHomepageOwlImage] = useState(studentDashboardLogo)
  const [homepageOwlRole, setHomepageOwlRole] = useState("Dashboard STUDENT")
  const [hasUnlockedOwlHall, setHasUnlockedOwlHall] = useState(false)

  async function loadCourses() {
    setLoading(true)
    setError("")

    try {
      const [enrolled, available] = await Promise.all([
        listStudentCourses(),
        listStudentAvailableCourses(),
      ])
      const normalizedEnrolled = (Array.isArray(enrolled) ? enrolled : []).map(normalizeEnrolledCourse)
      const normalizedAvailable = (Array.isArray(available) ? available : []).map(normalizeAvailableCourse)
      setCourses(normalizedEnrolled)
      setAvailableCourses(normalizedAvailable)
      return { studentCourses: normalizedEnrolled, availableCourses: normalizedAvailable }
    } catch (loadError) {
      if (loadError.response?.status === 401) {
        await refreshAuth()
      }
      setError(getCourseErrorMessage(loadError, "Nu am putut încărca lista de cursuri."))
      throw loadError
    } finally {
      setLoading(false)
    }
  }

  const syncStudentDashboard = useEffectEvent(async () => {
    try {
      await loadCourses()
    } catch {
      // Handled inside loadCourses
    }
  })

  useEffect(() => {
    syncStudentDashboard()
  }, [])

  useEffect(() => {
    const homepageOwlId = getStudentHomepageOwlId(user)
    setHomepageOwlImage(getStudentHomepageOwlImage(homepageOwlId))
    setHomepageOwlRole(getStudentHomepageOwlRole(homepageOwlId))
    setHasUnlockedOwlHall(hasDiscoveredOwlHall(user))
  }, [user])

  useEffect(() => {
    const allCourses = [...courses, ...availableCourses]
    const nextCourseThemes = {}
    for (const course of allCourses) {
      try {
        const savedTheme = window.localStorage.getItem(getCourseThemeStorageKey(user, course.id))
        if (COURSE_THEME_KEYS.has(savedTheme)) {
          nextCourseThemes[course.id] = savedTheme
        }
      } catch {
        // LocalStorage fallback
      }
    }
    setCourseThemes(nextCourseThemes)
  }, [user, courses, availableCourses])

  function handleCourseThemeChange(courseId, themeKey) {
    if (!COURSE_THEME_KEYS.has(themeKey)) return
    setCourseThemes((current) => ({ ...current, [courseId]: themeKey }))
    try {
      window.localStorage.setItem(getCourseThemeStorageKey(user, courseId), themeKey)
    } catch {
      // LocalStorage fallback
    }
  }

  async function handleEnroll(course) {
    setActiveAction(`enroll-${course.id}`)
    setError("")
    setNotice("")

    try {
      await enrollStudentCourse(course.id)
      const reloaded = await loadCourses()
      const enrolledCourse = reloaded.studentCourses?.find((currentCourse) => currentCourse.id === course.id)
      setNotice("Înscrierea a fost finalizată cu succes.")
      navigate(`/courses/${course.id}`, { state: { course: enrolledCourse ?? normalizeEnrolledCourse({ ...course, procentajProgres: 0 }) } })
    } catch (enrollError) {
      if (enrollError.response?.status === 401) {
        await refreshAuth()
      }
      setError(getCourseErrorMessage(enrollError, "Nu am putut finaliza înscrierea."))
    } finally {
      setActiveAction("")
    }
  }

  const studentHeroContentStats = (
    <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/28 bg-white/20 px-3.5 py-1.5 text-white backdrop-blur-md shadow-xs transition hover:bg-white/25">
        <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
        <span className="text-xs font-medium text-white/90">Cursurile mele:</span>
        <span className="text-sm font-bold tracking-tight text-white">{loading ? "..." : courses.length}</span>
      </div>
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/22 bg-white/12 px-3.5 py-1.5 text-white backdrop-blur-md shadow-xs transition hover:bg-white/18">
        <span className="h-2 w-2 rounded-full bg-white/50" />
        <span className="text-xs font-medium text-white/75">Cursuri disponibile:</span>
        <span className="text-sm font-bold tracking-tight text-white/90">{loading ? "..." : availableCourses.length}</span>
      </div>
    </div>
  )

  return (
    <AppShell
      title={`Salut, ${getUserGreetingName(user)}!`}
      eyebrow={homepageOwlRole}
      heroClassName="relative min-h-[11rem] overflow-visible border-0 bg-linear-to-r from-[#0f9fbd] via-[#17b7d3] to-[#56d5ea] text-white shadow-[0_24px_60px_rgba(23,133,161,0.24)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/16 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
      heroContent={studentHeroContentStats}
      heroVisual={(
        <div className="pointer-events-auto relative flex h-full w-full flex-col items-end justify-end">
          <img src={homepageOwlImage} alt="Dashboard student" className="h-full max-h-full w-auto origin-bottom translate-y-[8%] cursor-pointer object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.22)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:brightness-105 hover:drop-shadow-[0_35px_65px_rgba(0,0,0,0.38)] active:scale-[1.03] active:brightness-105 active:drop-shadow-[0_35px_65px_rgba(0,0,0,0.38)]" />
          {hasUnlockedOwlHall ? (
            <Button asChild variant="outline" className="absolute right-2 -bottom-12 rounded-2xl border-white/28 bg-white px-5 py-2.5 text-sm font-semibold text-[#24385b] shadow-[0_14px_34px_rgba(8,18,38,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-white/90 hover:text-[#24385b] hover:shadow-[0_20px_42px_rgba(8,18,38,0.24)] active:scale-[0.98]">
              <Link to="/owl-hall">Schimbă Avatar</Link>
            </Button>
          ) : null}
        </div>
      )}
      heroVisualClassName="right-2 bottom-0 top-auto h-full items-end justify-center lg:right-5"
    >
      <div className="space-y-6">
        {error ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare cursuri</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {notice ? (
          <Alert className="rounded-3xl border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <AlertTitle>Succes</AlertTitle>
            <AlertDescription className="text-emerald-800">{notice}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? <p className="text-sm text-slate-500">Se încarcă lista de cursuri...</p> : null}

        {!loading ? (
          <div className="space-y-8 pt-2">
            <section className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursurile mele</h3>
                <p className="text-sm text-slate-500">Cursurile la care ești înscris în acest moment.</p>
              </div>

              {courses.length > 0 ? (
                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {courses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      mode="student"
                      selectedThemeKey={courseThemes[course.id] ?? DEFAULT_COURSE_THEME}
                      onThemeChange={handleCourseThemeChange}
                      onEnroll={handleEnroll}
                      actionDisabled={Boolean(activeAction)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyCoursesState message="Nu ești înscris momentan la niciun curs activ." />
              )}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursuri disponibile</h3>
                <p className="text-sm text-slate-500">Cursurile disponibile pentru înscriere.</p>
              </div>

              {availableCourses.length > 0 ? (
                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {availableCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      mode="student"
                      selectedThemeKey={courseThemes[course.id] ?? DEFAULT_COURSE_THEME}
                      onThemeChange={handleCourseThemeChange}
                      onEnroll={handleEnroll}
                      actionDisabled={Boolean(activeAction)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyCoursesState message="Nu există cursuri disponibile pentru înscriere momentan." />
              )}
            </section>
          </div>
        ) : null}
      </div>
      <AkyChatWidget />
    </AppShell>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = isAdminUser(user)
  const isProfessor = isProfessorUser(user)

  if (isAdmin) return <AdminDashboard />
  if (isProfessor) return <ProfessorDashboard />
  return <StudentDashboard />
}
