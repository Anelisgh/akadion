import { ArrowRight, CalendarDays, Check, Palette, AlertCircle } from "lucide-react"
import { useState, useEffect, useEffectEvent } from "react"
import { Link, Navigate } from "react-router-dom"
import AppShell from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/auth/useAuth"
import { isAdminUser } from "@/lib/user"
import { listAdminCourses, getCourseErrorMessage } from "@/lib/professorCourses"
import { COURSE_THEMES, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"

const COURSE_THEME_STORAGE_PREFIX = "akadion:course-theme"

export function getCourseThemeStorageKey(user, courseId) {
  return `${COURSE_THEME_STORAGE_PREFIX}:${getThemeUserKey(user)}:${courseId}`
}

function formatCourseDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
  }).format(date)
}

export function getProfessorName(course) {
  return [course.profesorPrenume, course.profesorNume].filter(Boolean).join(" ") || course.profesorMail || "Profesor nealocat"
}

export function normalizeEnrolledCourse(course) {
  return {
    ...course,
    inscris: true,
    activ: true,
    profesorDisplayName: [course.profesorPrenume, course.profesorNume].filter(Boolean).join(" "),
  }
}

export function normalizeAvailableCourse(course) {
  return {
    ...course,
    inscris: false,
    activ: true,
    nrSaptamaniCurente: course.nrSaptamani,
    profesorDisplayName: [course.profesorPrenume, course.profesorNume].filter(Boolean).join(" "),
  }
}

export function getCourseProgress(course) {
  const totalWeeks = course.nrSaptamaniCurente ?? course.nrSaptamani ?? 0
  const percent = Math.max(0, Math.min(100, Math.round(course.procentajProgres ?? 0)))
  const completedWeeks = course.nrSaptamaniFinalizate ?? Math.round((percent / 100) * totalWeeks)

  return { completedWeeks, percent, totalWeeks }
}

export function CourseCard({ course, mode, selectedThemeKey, onThemeChange, onEnroll, actionDisabled }) {
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const selectedTheme = getCourseTheme(selectedThemeKey)
  const accent = selectedTheme.accent
  const isProfessorMode = mode === "professor"
  const isAdminMode = mode === "admin"
  const isStudentMode = mode === "student"
  const isEnrolledStudentCourse = isStudentMode && course.inscris
  const progress = getCourseProgress(course)

  return (
    <Card className={`relative overflow-visible rounded-[1.8rem] border-[#e4d8cd] bg-white/96 shadow-[0_18px_52px_rgba(32,46,84,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(32,46,84,0.12)] ${themePickerOpen ? "z-20" : "z-0"}`}>
      <div className={`relative h-44 overflow-hidden rounded-t-[1.8rem] bg-linear-to-br ${accent}`}>
        <div className={`absolute left-4 top-4 inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold shadow-xs border ${selectedTheme.badge || "bg-white/80 text-slate-800 border-white/60"}`}>
          {isStudentMode ? (course.inscris ? "Înscris" : "Disponibil") : course.activ ? "Activ" : "Inactiv"}
        </div>
      </div>
      <CardContent className="space-y-3 px-5 py-5">
        {(isProfessorMode || isAdminMode || isEnrolledStudentCourse) ? (
          <Link to={`/courses/${course.id}`} state={{ course }} className="block">
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-[#24385b] transition hover:font-extrabold">{course.denumire}</h3>
          </Link>
        ) : (
          <h3 className="text-[1.35rem] font-semibold tracking-tight text-[#24385b]">{course.denumire}</h3>
        )}
        {(isStudentMode || isAdminMode) ? (
          isEnrolledStudentCourse ? (
            <Link
              to={`/courses/${course.id}#profesor`}
              state={{ course, initialTab: "profesor" }}
              className="inline-flex w-fit text-sm font-semibold text-[#5d7094] transition hover:font-extrabold hover:text-[#24385b]"
            >
              {course.profesorDisplayName || getProfessorName(course)}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-[#5d7094]">{course.profesorDisplayName || getProfessorName(course)}</p>
          )
        ) : null}
        {course.descriere ? <p className="line-clamp-2 text-sm leading-6 text-slate-600">{course.descriere}</p> : null}
        {isStudentMode && course.inscris ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#5d7094]">
              <span>{progress.completedWeeks}/{progress.totalWeeks} saptamani</span>
              <span className={selectedTheme.text}>{progress.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eee7df]">
              <div className={`h-full rounded-full bg-linear-to-r ${accent} transition-all`} style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-4 text-sm text-[#5d7094]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatCourseDate(course.dataInceput)}
          </span>
            <span>{course.nrSaptamaniCurente ?? 0} săptămâni</span>
        </div>
        {isProfessorMode ? (
          <Button asChild variant="outline" className="mt-2 rounded-2xl border-[#d9ccbe] bg-white text-[#3f698a]">
            <Link to={`/courses/${course.id}`}>Administrează cursul</Link>
          </Button>
        ) : null}
        {isAdminMode ? (
          <Button asChild variant="outline" className="mt-2 rounded-2xl border-[#d9ccbe] bg-white text-[#3f698a]">
            <Link to={`/courses/${course.id}`}>Vezi detalii</Link>
          </Button>
        ) : null}
        {isStudentMode ? (
          course.inscris ? (
            <Button asChild variant="outline" className="mt-2 rounded-2xl border-[#d9ccbe] bg-white text-[#3f698a]">
              <Link to={`/courses/${course.id}`} state={{ course }}>Vezi cursul</Link>
            </Button>
          ) : (
            <Button type="button" onClick={() => onEnroll(course)} disabled={actionDisabled} className="mt-2 rounded-2xl bg-[#3f698a] text-white hover:bg-[#355b79]">
              Înscriere
            </Button>
          )
        ) : null}
      </CardContent>
      <div className="absolute right-4 bottom-4 z-30">
        {themePickerOpen ? (
          <div className="absolute right-0 bottom-14 w-40 rounded-[1.35rem] border border-[#d9c9ff] bg-[#fbf8ff]/98 p-2.5 text-[#3a2e66] shadow-[0_18px_48px_rgba(62,42,120,0.2)] backdrop-blur-md">
            <p className="px-2 pb-2 text-[0.68rem] font-semibold tracking-[0.14em] text-[#6c5c9a] uppercase">Tema</p>
            <div className="space-y-1">
              {COURSE_THEMES.map((theme) => {
                const isSelected = theme.key === selectedTheme.key

                return (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => {
                      onThemeChange(course.id, theme.key)
                      setThemePickerOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-2 py-2 text-left text-sm font-medium transition ${isSelected ? "border-[#7650d8] bg-[#f3edff] text-[#6840c5]" : "border-transparent hover:bg-white/80"}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-5 w-5 shrink-0 rounded-full ${theme.swatch}`} />
                      <span className="truncate">{theme.label}</span>
                    </span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          aria-label={`Schimba tema pentru ${course.denumire}`}
          onClick={() => setThemePickerOpen((currentValue) => !currentValue)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e0d4ff] bg-white text-[#6840c5] shadow-[0_10px_28px_rgba(62,42,120,0.22)] transition hover:-translate-y-0.5 hover:border-[#bda8ff] hover:bg-[#faf7ff]"
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${selectedTheme.swatch}`}>
            <Palette className="h-3.5 w-3.5 text-white drop-shadow" />
          </span>
        </button>
      </div>
    </Card>
  )
}

export function EmptyCoursesState({ message }) {
  return (
    <Card className="w-full max-w-2xl rounded-[2rem] border-[#e4d8cd] bg-white/96 shadow-[0_24px_70px_rgba(32,46,84,0.08)]">
      <CardContent className="px-6 py-10 text-center text-slate-600 sm:px-10">
        {message}
      </CardContent>
    </Card>
  )
}

export function AdminCourseList({ courses, currentPage, totalPages, onPageChange }) {
  return (
    <div className="space-y-3">
      {courses.map((course) => {
        const isActive = Boolean(course.activ)

        return (
          <Card key={course.id} className="rounded-[1.35rem] border-[#e4d8cd] bg-white/96 shadow-[0_10px_30px_rgba(32,46,84,0.06)] transition hover:border-[#cbbbaa] hover:shadow-[0_16px_38px_rgba(32,46,84,0.1)]">
            <CardContent className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-[#24385b]">{course.denumire}</h3>
                <p className="mt-1 text-sm text-[#5d7094]">
                  {course.nrStudentiInscrisi ?? 0} studenti · {course.nrSaptamaniCurente ?? 0} saptamani
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className={`inline-flex min-w-18 justify-center rounded-full px-3 py-1 text-sm font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {isActive ? "Activ" : "Inactiv"}
                </span>
                <Button asChild variant="ghost" className="h-10 w-10 rounded-2xl p-0 text-[#4A5681] hover:bg-[#eef1fb] hover:text-[#24385b]" aria-label={`Vezi detalii pentru ${course.denumire}`}>
                  <Link to={`/courses/${course.id}`} state={{ course }}>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-end pt-2">
        <div className="flex flex-wrap justify-end gap-2">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1
            const isCurrent = pageNumber === currentPage

            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={`flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                  isCurrent
                    ? "border-[#24385b] bg-[#24385b] text-white shadow-sm"
                    : "border-[#d8ccbf] bg-white text-slate-700 hover:bg-[#f7efe6] hover:text-[#24385b]"
                }`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {pageNumber}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CoursesPage() {
  const { user, refreshAuth } = useAuth()
  const isAdmin = isAdminUser(user)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ADMIN_COURSES_PER_PAGE = 6

  const syncCourses = useEffectEvent(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError("")
    try {
      setCourses(await listAdminCourses())
    } catch (e) {
      if (e.response?.status === 401) await refreshAuth()
      setError(getCourseErrorMessage(e, "Nu am putut încărca cursurile."))
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    syncCourses()
  }, [])

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const totalPages = Math.max(1, Math.ceil(courses.length / ADMIN_COURSES_PER_PAGE))
  const pageStart = (currentPage - 1) * ADMIN_COURSES_PER_PAGE
  const paginatedCourses = courses.slice(pageStart, pageStart + ADMIN_COURSES_PER_PAGE)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const heroClassName = "relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"

  return (
    <AppShell
      title="Cursuri Akadion"
      description="Toate cursurile create de profesori în platformă."
      eyebrow="Cursuri"
      heroClassName={heroClassName}
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-[#24385b]">Toate cursurile</h2>
        </div>

        {error ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare la încărcare</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? <p className="text-sm text-slate-500">Se încarcă lista de cursuri...</p> : null}

        {!loading && courses.length > 0 ? (
          <AdminCourseList
            courses={paginatedCourses}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : null}

        {!loading && courses.length === 0 ? (
          <EmptyCoursesState message="Nu există încă niciun curs creat de profesori." />
        ) : null}
      </div>
    </AppShell>
  )
}
