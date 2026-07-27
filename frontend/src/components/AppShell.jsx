import { AlertCircle, BookOpenText, ChevronDown, ChevronLeft, ChevronRight, Home, LogOut, Menu, UserRound, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { startLogout } from "@/auth/logout"
import { useAuth } from "@/auth/useAuth"
import { getRoleLabel, getUserDisplayName, isAdminUser, isProfessorUser, isStudentUser } from "@/lib/user"
import { COURSE_THEME_KEYS, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"
import { listProfessorCourses, listStudentCourses } from "@/lib/professorCourses"
import { cn } from "@/lib/utils"
import completeProfileLogo from "../../folder_inspiratie2/logo_bufnita.jpeg"

function getInitials(displayName) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A"
}

function CourseTabsNav({ user, onNavClick }) {
  const [courses, setCourses] = useState([])
  const [courseThemes, setCourseThemes] = useState({})
  const scrollRef = useRef(null)
  const isProf = isProfessorUser(user)
  const isAdmin = isAdminUser(user)
  const isStudent = isStudentUser(user)

  useEffect(() => {
    let mounted = true
    async function fetchUserCourses() {
      if (isAdmin) return
      try {
        const data = isProf ? await listProfessorCourses() : await listStudentCourses()
        if (mounted && Array.isArray(data)) {
          setCourses(data)
          const themes = {}
          data.forEach((c) => {
            try {
              const key = window.localStorage.getItem(`akadion:course-theme:${getThemeUserKey(user)}:${c.id}`)
              if (COURSE_THEME_KEYS.has(key)) {
                themes[c.id] = key
              }
            } catch { }
          })
          setCourseThemes(themes)
        }
      } catch { }
    }
    fetchUserCourses()
    return () => { mounted = false }
  }, [user, isProf, isAdmin, isStudent])

  function scroll(offset) {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" })
    }
  }

  return (
    <div className="flex items-center gap-1 min-w-0 max-w-full lg:max-w-xl xl:max-w-2xl">
      {/* Scroll Left */}
      {courses.length > 2 && (
        <button
          type="button"
          onClick={() => scroll(-200)}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#e7d9c8] bg-white text-slate-600 hover:bg-[#f4eadf] lg:flex"
          title="Derulează la stânga"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-0.5 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Dashboard Link */}
        <NavLink
          to="/"
          end
          onClick={onNavClick}
          className={({ isActive }) =>
            `inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-white text-slate-900 border border-[#d9ccbe] shadow-sm"
                : "bg-white/80 text-slate-700 border border-[#e7d9c8] hover:bg-[#f4eadf]"
            }`
          }
        >
          <Home className="h-4 w-4" />
          <span>Acasă</span>
        </NavLink>

        {/* Admin Links */}
        {isAdmin && (
          <>
            <NavLink
              to="/admin/users"
              onClick={onNavClick}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-slate-900 border border-[#d9ccbe] shadow-sm"
                    : "bg-white/80 text-slate-700 border border-[#e7d9c8] hover:bg-[#f4eadf]"
                }`
              }
            >
              <Users className="h-4 w-4" />
              <span>Utilizatori</span>
            </NavLink>
            <NavLink
              to="/courses"
              onClick={onNavClick}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-slate-900 border border-[#d9ccbe] shadow-sm"
                    : "bg-white/80 text-slate-700 border border-[#e7d9c8] hover:bg-[#f4eadf]"
                }`
              }
            >
              <BookOpenText className="h-4 w-4" />
              <span>Cursuri</span>
            </NavLink>
          </>
        )}

        {/* Course Tabs with Soft Pastel Theme Background */}
        {courses.map((course) => {
          const themeKey = courseThemes[course.id]
          const theme = getCourseTheme(themeKey)

          return (
            <NavLink
              key={course.id}
              to={`/courses/${course.id}`}
              state={{ course }}
              onClick={onNavClick}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${isActive
                  ? `${theme.tabActive || "bg-[#24385b] text-white"} scale-[1.02]`
                  : `${theme.tabInactive || "bg-white text-slate-700"} hover:scale-[1.01]`
                }`
              }
            >
              <span className="truncate max-w-[130px] sm:max-w-[170px]">{course.denumire}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Scroll Right */}
      {courses.length > 2 && (
        <button
          type="button"
          onClick={() => scroll(200)}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#e7d9c8] bg-white text-slate-600 hover:bg-[#f4eadf] lg:flex"
          title="Derulează la dreapta"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default function AppShell({ title, description, eyebrow = "Akadion", actions, children, heroClassName, heroEyebrowClassName, heroTitleClassName, heroDescriptionClassName, heroContent, heroVisual, heroVisualClassName }) {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const displayName = getUserDisplayName(user)
  const roleLabel = getRoleLabel(user?.rol)
  const initials = getInitials(displayName)
  const homePath = "/"

  function handleLogout() {
    setLogoutError("")

    try {
      startLogout()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Nu am putut inchide sesiunea. Incearca din nou.")
    }
  }

  return (
    <main className="app-shell min-h-screen text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#e7d9c8]/80 bg-[#fbf7f1]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to={homePath} className="flex items-center gap-3 shrink-0">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-[#e7d9c8]">
              <img src={completeProfileLogo} alt="Akadion" className="h-full w-full rounded-xl object-cover" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-base font-semibold tracking-tight text-[#24385b]">Akadion</span>
              <span className="block text-xs font-medium text-slate-500">{roleLabel}</span>
            </span>
          </Link>

          <nav className="hidden lg:flex min-w-0 flex-1 justify-center px-4">
            <CourseTabsNav user={user} />
          </nav>

          <div className="relative hidden lg:block shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAccountOpen((open) => !open)}
              className="h-12 rounded-2xl border-[#d9ccbe] bg-white px-2.5 pr-3 text-slate-700 hover:bg-[#f8f3ed]"
              aria-expanded={accountOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#24385b] text-xs font-semibold text-white">
                {initials}
              </span>
              <span className="min-w-0 text-left">
                <span className="block max-w-36 truncate text-sm font-semibold text-slate-800">{displayName}</span>
                <span className="block text-xs text-slate-500">{roleLabel}</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition ${accountOpen ? "rotate-180" : ""}`} />
            </Button>

            {accountOpen ? (
              <div className="absolute right-0 mt-2 w-56 rounded-3xl border border-[#e4d8cd] bg-white p-2 shadow-[0_20px_50px_rgba(32,46,84,0.16)]">
                <Link
                  to="/profile"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f7efe6] hover:text-[#24385b]"
                >
                  <UserRound className="h-4 w-4" />
                  Profilul meu
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-[#f7efe6] hover:text-[#24385b]"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>

          <Button type="button" variant="outline" onClick={() => setMobileOpen((open) => !open)} className="h-10 rounded-2xl border-[#d9ccbe] bg-white lg:hidden">
            <Menu className="h-4 w-4" />
            Meniu
          </Button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[#e7d9c8] bg-[#fbf7f1] px-4 py-3 lg:hidden">
            <div className="mx-auto max-w-7xl space-y-3">
              <CourseTabsNav user={user} onNavClick={() => setMobileOpen(false)} />
            </div>
            <div className="mx-auto mt-3 max-w-7xl rounded-2xl border border-[#e7d9c8] bg-white px-3 py-3">
              <div className="mb-3 flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24385b] text-sm font-semibold text-white">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline" className="rounded-xl border-[#d9ccbe] bg-white">
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    <UserRound className="h-4 w-4" />
                    Profilul meu
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={handleLogout} className="rounded-xl border-[#d9ccbe] bg-white">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className={cn(
          "mb-6 flex flex-col gap-4 rounded-[2rem] border border-[#e7d9c8] bg-[#fcf8f3]/92 px-5 py-5 shadow-[0_18px_48px_rgba(32,46,84,0.08)] sm:px-7 lg:flex-row lg:items-end lg:justify-between",
          heroClassName,
        )}>
          {heroVisual ? (
            <div className={cn("pointer-events-none absolute right-4 bottom-0 hidden h-full items-end justify-end sm:flex lg:right-8", heroVisualClassName)}>
              {heroVisual}
            </div>
          ) : null}

          <div className={cn("relative z-10", heroVisual ? "lg:max-w-[calc(100%-16rem)] xl:max-w-[calc(100%-20rem)]" : "")}>
            <p className={cn("mb-2 text-xs font-semibold tracking-[0.22em] text-[#4A5681] uppercase", heroEyebrowClassName)}>{eyebrow}</p>
            <h1 className={cn("text-3xl font-semibold tracking-tight text-[#24385b] sm:text-4xl", heroTitleClassName)}>{title}</h1>
            {description ? <p className={cn("mt-3 max-w-3xl text-base leading-7 text-slate-600", heroDescriptionClassName)}>{description}</p> : null}
            {heroContent ? <div className="mt-5">{heroContent}</div> : null}
          </div>
          {actions ? <div className="relative z-10 flex flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
        </div>

        {logoutError ? (
          <Alert variant="destructive" className="mb-6 rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Logout indisponibil</AlertTitle>
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        ) : null}

        {children}
      </section>
    </main>
  )
}
