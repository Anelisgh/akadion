import { AlertCircle, ArrowRight, BookOpenText, CalendarDays, Check, CheckCircle2, Palette, Plus, RefreshCcw, Users } from "lucide-react"
import { useEffect, useEffectEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import AppShell from "@/components/AppShell"
import AkyChatWidget from "@/components/chat/AkyChatWidget"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/auth/useAuth"
import { COURSE_THEME_KEYS, COURSE_THEMES, DEFAULT_COURSE_THEME, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"
import { getUserGreetingName, isAdminUser, isProfessorUser, isStudentUser } from "@/lib/user"
import {
  enrollStudentCourse,
  getCourseErrorMessage,
  listAdminCourses,
  listProfessorCourses,
  listStudentAvailableCourses,
  listStudentCourses,
} from "@/lib/professorCourses"

const COURSE_THEME_STORAGE_PREFIX = "akadion:course-theme"
const ADMIN_COURSES_PER_PAGE = 6

function getCourseThemeStorageKey(user, courseId) {
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

function ProfessorHeroStats({ totalCourses, activeCourses }) {
  const stats = [
    { label: "Cursuri totale", value: totalCourses, icon: BookOpenText },
    { label: "Cursuri active", value: activeCourses, icon: Users },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
      {stats.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-[1.35rem] border border-[#cfe0f5]/90 bg-linear-to-r from-[#dce9fb] via-[#edf4ff] to-[#d3e4fb] px-4 py-3 text-[#3d5b85] shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-[#5f7fa8]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="mt-1 text-sm font-medium text-[#56749c]">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function getProfessorName(course) {
  return [course.profesorPrenume, course.profesorNume].filter(Boolean).join(" ") || course.profesorMail || "Profesor nealocat"
}

function normalizeEnrolledCourse(course) {
  return {
    ...course,
    inscris: true,
    activ: true,
    profesorDisplayName: [course.profesorPrenume, course.profesorNume].filter(Boolean).join(" "),
  }
}

function normalizeAvailableCourse(course) {
  return {
    ...course,
    inscris: false,
    activ: true,
    nrSaptamaniCurente: course.nrSaptamani,
    profesorDisplayName: [course.profesorPrenume, course.profesorNume].filter(Boolean).join(" "),
  }
}

function getCourseProgress(course) {
  const totalWeeks = course.nrSaptamaniCurente ?? course.nrSaptamani ?? 0
  const percent = Math.max(0, Math.min(100, Math.round(course.procentajProgres ?? 0)))
  const completedWeeks = course.nrSaptamaniFinalizate ?? Math.round((percent / 100) * totalWeeks)

  return { completedWeeks, percent, totalWeeks }
}

function CourseCard({ course, mode, selectedThemeKey, onThemeChange, onEnroll, actionDisabled }) {
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const selectedTheme = getCourseTheme(selectedThemeKey)
  const accent = selectedTheme.accent
  const isProfessorMode = mode === "professor"
  const isAdminMode = mode === "admin"
  const isStudentMode = mode === "student"
  const progress = getCourseProgress(course)

  return (
    <Card className={`relative overflow-visible rounded-[1.8rem] border-[#e4d8cd] bg-white/96 shadow-[0_18px_52px_rgba(32,46,84,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(32,46,84,0.12)] ${themePickerOpen ? "z-20" : "z-0"}`}>
      <div className={`relative h-44 overflow-hidden rounded-t-[1.8rem] bg-linear-to-br ${accent}`}>
        <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/24 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
          {isStudentMode ? (course.inscris ? "Înscris" : "Disponibil") : course.activ ? "Activ" : "Inactiv"}
        </div>
      </div>
      <CardContent className="space-y-3 px-5 py-5">
        <h3 className="text-[1.35rem] font-semibold tracking-tight text-[#24385b]">{course.denumire}</h3>
        {(isStudentMode || isAdminMode) ? <p className="text-sm font-semibold text-[#5d7094]">{course.profesorDisplayName || getProfessorName(course)}</p> : null}
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
            <Link to={`/courses/${course.id}`}>Administreaza cursul</Link>
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

function EmptyCoursesState({ message }) {
  return (
    <Card className="w-full max-w-2xl rounded-[2rem] border-[#e4d8cd] bg-white/96 shadow-[0_24px_70px_rgba(32,46,84,0.08)]">
      <CardContent className="px-6 py-10 text-center text-slate-600 sm:px-10">
        {message}
      </CardContent>
    </Card>
  )
}

function AdminCourseList({ courses, currentPage, totalPages, onPageChange }) {
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
  const navigate = useNavigate()
  const isProfessor = isProfessorUser(user)
  const isAdmin = isAdminUser(user)
  const isStudent = isStudentUser(user)
  const canListCourses = isProfessor || isAdmin || isStudent
  const [courses, setCourses] = useState([])
  const [studentCourses, setStudentCourses] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [pageError, setPageError] = useState("")
  const [pageNotice, setPageNotice] = useState("")
  const [activeAction, setActiveAction] = useState("")
  const [courseThemes, setCourseThemes] = useState({})
  const [adminCurrentPage, setAdminCurrentPage] = useState(1)

  async function loadCourses() {
    if (!canListCourses) {
      setCourses([])
      setStudentCourses([])
      setAvailableCourses([])
      return { studentCourses: [], availableCourses: [] }
    }

    setCoursesLoading(true)
    setPageError("")

    try {
      if (isAdmin) {
        const nextCourses = await listAdminCourses()
        setCourses(nextCourses)
        return { courses: nextCourses }
      }

      if (isProfessor) {
        const nextCourses = await listProfessorCourses()
        setCourses(nextCourses)
        return { courses: nextCourses }
      }

      const [enrolled, available] = await Promise.all([
        listStudentCourses(),
        listStudentAvailableCourses(),
      ])
      const normalizedEnrolled = enrolled.map(normalizeEnrolledCourse)
      const normalizedAvailable = available.map(normalizeAvailableCourse)
      setStudentCourses(normalizedEnrolled)
      setAvailableCourses(normalizedAvailable)
      return { studentCourses: normalizedEnrolled, availableCourses: normalizedAvailable }
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshAuth()
      }
      setPageError(getCourseErrorMessage(error, "Nu am putut încărca lista de cursuri."))
      throw error
    } finally {
      setCoursesLoading(false)
    }
  }

  const syncCoursesPage = useEffectEvent(async () => {
    try {
      await loadCourses()
    } catch {
      // Error state is already mapped in loadCourses.
    }
  })

  useEffect(() => {
    syncCoursesPage()
  }, [canListCourses, isAdmin, isProfessor, isStudent])

  useEffect(() => {
    const allCourses = [...courses, ...studentCourses, ...availableCourses]
    const nextCourseThemes = {}

    for (const course of allCourses) {
      try {
        const savedTheme = window.localStorage.getItem(getCourseThemeStorageKey(user, course.id))

        if (COURSE_THEME_KEYS.has(savedTheme)) {
          nextCourseThemes[course.id] = savedTheme
        }
      } catch {
        // If localStorage is unavailable, course theme customization stays session-only.
      }
    }

    setCourseThemes(nextCourseThemes)
  }, [user, courses, studentCourses, availableCourses])

  function handleCourseThemeChange(courseId, themeKey) {
    if (!COURSE_THEME_KEYS.has(themeKey)) {
      return
    }

    setCourseThemes((currentThemes) => ({
      ...currentThemes,
      [courseId]: themeKey,
    }))

    try {
      window.localStorage.setItem(getCourseThemeStorageKey(user, courseId), themeKey)
    } catch {
      // Visual change still applies for this render even if persistence is blocked.
    }
  }

  async function handleEnroll(course) {
    setActiveAction(`enroll-${course.id}`)
    setPageError("")
    setPageNotice("")

    try {
      await enrollStudentCourse(course.id)
      const reloaded = await loadCourses()
      const enrolledCourse = reloaded.studentCourses?.find((currentCourse) => currentCourse.id === course.id)
      setPageNotice("Înscrierea a fost finalizată cu succes.")
      navigate(`/courses/${course.id}`, { state: { course: enrolledCourse ?? normalizeEnrolledCourse({ ...course, procentajProgres: 0 }) } })
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshAuth()
      }
      setPageError(getCourseErrorMessage(error, "Nu am putut finaliza înscrierea."))
    } finally {
      setActiveAction("")
    }
  }

  const activeCourses = courses.filter((course) => course.activ).length
  const studentTotalCourses = studentCourses.length + availableCourses.length
  const adminTotalPages = Math.max(1, Math.ceil(courses.length / ADMIN_COURSES_PER_PAGE))
  const adminPageStart = (adminCurrentPage - 1) * ADMIN_COURSES_PER_PAGE
  const adminPaginatedCourses = courses.slice(adminPageStart, adminPageStart + ADMIN_COURSES_PER_PAGE)

  useEffect(() => {
    if (adminCurrentPage > adminTotalPages) {
      setAdminCurrentPage(adminTotalPages)
    }
  }, [adminCurrentPage, adminTotalPages])

  return (
    <AppShell
      title={isProfessor ? `${getUserGreetingName(user)} 📖` : "Cursuri Akadion"}
      description={isProfessor ? undefined : isAdmin ? "Toate cursurile create de profesori în platformă." : "Cursurile tale active și cursurile disponibile pentru înscriere."}
      eyebrow="Cursuri"
      heroClassName="relative overflow-hidden border-0 bg-linear-to-r from-[#5a7f9f] via-[#456f91] to-[#315c7d] shadow-[0_24px_60px_rgba(53,86,117,0.22)] before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/12 before:content-[''] after:absolute after:-bottom-16 after:left-[-4rem] after:h-60 after:w-60 after:rounded-full after:bg-white/8 after:content-['']"
      heroEyebrowClassName="text-white/78"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/80"
      heroContent={canListCourses ? <ProfessorHeroStats totalCourses={isStudent ? studentTotalCourses : courses.length} activeCourses={isStudent ? studentCourses.length : activeCourses} /> : null}
      actions={canListCourses ? (
        <Button type="button" variant="outline" onClick={loadCourses} disabled={coursesLoading || Boolean(activeAction)} className="rounded-2xl border-[#d9ccbe] bg-white">
          <RefreshCcw className="h-4 w-4" />
          Reîncarcă
        </Button>
      ) : null}
    >
      {canListCourses ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-[#24385b]">{isProfessor ? "Cursurile mele" : isAdmin ? "Toate cursurile" : "Catalog cursuri"}</h2>
            {isProfessor ? (
              <Button asChild className="rounded-2xl bg-[#3f698a] text-white shadow-[0_10px_24px_rgba(63,105,138,0.24)] hover:bg-[#355b79]">
                <Link to="/courses/new">
                  <Plus className="h-4 w-4" />
                  Curs nou
                </Link>
              </Button>
            ) : null}
          </div>

          {pageError ? (
            <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
              <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare la încărcare</AlertTitle>
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
          ) : null}

          {pageNotice ? (
            <Alert className="rounded-3xl border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <AlertTitle>Succes</AlertTitle>
              <AlertDescription className="text-emerald-800">{pageNotice}</AlertDescription>
            </Alert>
          ) : null}

          {coursesLoading ? <p className="text-sm text-slate-500">Se încarcă lista de cursuri...</p> : null}

          {isAdmin && !coursesLoading && courses.length > 0 ? (
            <AdminCourseList
              courses={adminPaginatedCourses}
              currentPage={adminCurrentPage}
              totalPages={adminTotalPages}
              onPageChange={setAdminCurrentPage}
            />
          ) : null}

          {!isAdmin && !isStudent && !coursesLoading && courses.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  mode={isProfessor ? "professor" : "admin"}
                  selectedThemeKey={courseThemes[course.id] ?? DEFAULT_COURSE_THEME}
                  onThemeChange={handleCourseThemeChange}
                  onEnroll={handleEnroll}
                  actionDisabled={Boolean(activeAction)}
                />
              ))}
            </div>
          ) : null}

          {!isStudent && !coursesLoading && courses.length === 0 ? (
            <EmptyCoursesState message={isProfessor ? "Nu ai adăugat încă niciun curs. Creează unul din butonul `Curs nou` și va apărea aici." : "Nu există încă niciun curs creat de profesori."} />
          ) : null}

          {isStudent ? (
            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursurile mele</h3>
                  <p className="text-sm text-slate-500">Cursurile la care ești înscris în acest moment.</p>
                </div>

                {!coursesLoading && studentCourses.length > 0 ? (
                  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {studentCourses.map((course) => (
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
                ) : null}

                {!coursesLoading && studentCourses.length === 0 ? (
                  <EmptyCoursesState message="Nu ești înscris momentan la niciun curs activ." />
                ) : null}
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursuri disponibile</h3>
                  <p className="text-sm text-slate-500">Cursurile disponibile pentru înscriere.</p>
                </div>

                {!coursesLoading && availableCourses.length > 0 ? (
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
                ) : null}

                {!coursesLoading && availableCourses.length === 0 ? (
                  <EmptyCoursesState message="Nu există cursuri disponibile pentru înscriere momentan." />
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.16em] text-[#5b7595] uppercase">Catalog cursuri</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#24385b] sm:text-3xl">
            Cursurile adăugate de profesori în platformă
          </h2>
        </div>
      )}
      <AkyChatWidget />
    </AppShell>
  )
}
