import { ArrowRight, CalendarDays, Check, Palette, AlertCircle, Plus, ExternalLink, Gift, Star, Feather } from "lucide-react"
import { useState, useEffect, useEffectEvent, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import AppShell from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/auth/useAuth"
import { isAdminUser, isProfessorUser, isStudentUser } from "@/lib/user"
import {
  enrollStudentCourse,
  getCourseErrorMessage,
  listAdminCourses,
} from "@/lib/professorCourses"
import { COURSE_THEME_KEYS, COURSE_THEMES, DEFAULT_COURSE_THEME, getCourseTheme } from "@/lib/courseThemes"
import easterOwlOne from "../../img1.png"
import easterOwlTwo from "../../img2.png"
import ragHeroOwl from "../../logo_pagina_rag3.png"
import {
  getCourseProgress,
  getCourseThemeStorageKey,
  getProfessorName,
  normalizeEnrolledCourse,
} from "@/lib/courseView"
import { formatWeeks, formatStudents } from "@/lib/utils"

const SECRET_LINKS = [
  {
    label: "secret #01",
    title: "Camera Mopsului Rugător",
    description: "Un altar digital păzit de un pug solemn. Intră doar dacă ai snacks și respect.",
    href: "https://puginarug.com/",
  },
  {
    label: "secret #02",
    title: "Laboratorul Pisicii-Gogoașă",
    description: "O anomalie pufoasă, rotundă și suspect de dulce. Bufnițele încă investighează.",
    href: "https://doughnutkitten.com/",
  },
  {
    label: "secret #03",
    title: "Coridorul Câinelui Infinit",
    description: "Un drum lung. Prea lung. Legenda spune că doar cei răbdători ajung la coadă.",
    href: "https://longdogechallenge.com/",
  },
  {
    label: "secret #04",
    title: "Turnul QR-ului Plutitor",
    description: "Un cod misterios levitează prin aer. Scanează-l doar dacă ai reflexe de ninja și baterie la telefon.",
    href: "https://floatingqrcode.com/",
  },
  {
    label: "secret #05",
    title: "Dojo-ul Ninja Invizibil",
    description: "O sală de antrenament pentru clickuri tăcute, dispariții elegante și apariții absolut inutile, dar spectaculoase.",
    href: "https://imaninja.com/",
  },
  {
    label: "secret #06",
    title: "Atelierul Cursorului Fermecat",
    description: "Aici săgeata mouse-ului primește superputeri, scântei și suficient dramatism cât să impresioneze bufnițele.",
    href: "https://cursoreffects.com/",
  },
  {
    label: "secret #07",
    title: "Terminalul Hackerului Dramatic",
    description: "Tastezi orice, pare că spargi sateliți. Ideal pentru momente când vrei să pari periculos fără să strici nimic.",
    href: "https://hackertyper.com/",
  },
  {
    label: "secret #08",
    title: "Galeria Haosului Pollock",
    description: "Un perete digital unde fiecare mișcare devine artă modernă. Bufnițele nu înțeleg, dar aplaudă politicos.",
    href: "https://jacksonpollock.org/",
  },
  {
    label: "secret #09",
    title: "Tunelul Viermișorului Dansator",
    description: "Un loc elastic, ciudat și complet inutil, unde totul se mișcă exact cât să te facă să mai dai un click.",
    href: "https://wigglyme.com/",
  },
  {
    label: "secret #10",
    title: "Labirintul Memoriei Ușoare",
    description: "Un traseu mic, dar perfid. Pare simplu până când bufnițele încep să-ți mute mental pereții.",
    href: "https://memory.toys/maze/easy/",
  },
  {
    label: "secret #11",
    title: "Marele Muzeu al Nimicului",
    description: "O expediție grandioasă prin absolut nimic. Perfect pentru exploratori care caută sens și găsesc spațiu gol.",
    href: "https://greatbignothing.com/",
  },
  {
    label: "secret #12",
    title: "Cutia Muzicală Nebună",
    description: "Sunete, jucării și haos auditiv controlat. Bufnițele recomandă volum moderat și curaj maxim.",
    href: "https://musical.toys/",
  },
  {
    label: "secret #13",
    title: "Tapiseria Infinită ZoomQuilt",
    description: "Un portal care curge la nesfârșit prin imagini imposibile. Intră doar dacă ai timp să uiți de timp.",
    href: "https://zoomquilt.org/",
  },
  {
    label: "secret #14",
    title: "Arena Dezbaterilor Coapte",
    description: "Un loc pentru argumente crocante, opinii picante și concluzii care poate au stat prea mult la cuptor.",
    href: "https://www.ripefordebate.com/",
  },
  {
    label: "secret #15",
    title: "Atelierul Emoji-urilor Rebelate",
    description: "Emoji-uri scăpate din tastatură, expresii dramatice și destulă energie cât să încurce orice conversație serioasă.",
    href: "https://remoji.com/",
  },
]

const SECRET_LINKS_PER_PAGE = 3

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

export function CourseCard({ course, mode, selectedThemeKey, onThemeChange, onEnroll, actionDisabled }) {
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const themePickerRef = useRef(null)
  const selectedTheme = getCourseTheme(selectedThemeKey)
  const accent = selectedTheme.accent
  const isProfessorMode = mode === "professor"
  const isAdminMode = mode === "admin"
  const isStudentMode = mode === "student"
  const isEnrolledStudentCourse = isStudentMode && course.inscris
  const progress = getCourseProgress(course)

  useEffect(() => {
    if (!themePickerOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!themePickerRef.current?.contains(event.target)) {
        setThemePickerOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setThemePickerOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [themePickerOpen])

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
            <span>{formatWeeks(course.nrSaptamaniCurente ?? course.nrSaptamani ?? 0)}</span>
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
      <div ref={themePickerRef} className="absolute right-4 bottom-4 z-30">
        {themePickerOpen ? (
          <div className="absolute right-0 bottom-14 w-56 rounded-[1.35rem] border border-[#d9c9ff] bg-[#fbf8ff]/98 p-2.5 text-[#3a2e66] shadow-[0_18px_48px_rgba(62,42,120,0.2)] backdrop-blur-md">
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
                      <span className="whitespace-nowrap">{theme.label}</span>
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
                  {formatStudents(course.nrStudentiInscrisi ?? 0)} · {formatWeeks(course.nrSaptamaniCurente ?? course.nrSaptamani ?? 0)}
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

function CoursesEasterEggPage() {
  const [secretLinksPage, setSecretLinksPage] = useState(1)
  const secretLinksTotalPages = Math.ceil(SECRET_LINKS.length / SECRET_LINKS_PER_PAGE)
  const secretLinksPageStart = (secretLinksPage - 1) * SECRET_LINKS_PER_PAGE
  const visibleSecretLinks = SECRET_LINKS.slice(secretLinksPageStart, secretLinksPageStart + SECRET_LINKS_PER_PAGE)

  return (
    <AppShell
      title="Ai găsit camera secretă Akadion"
      description="Nu toate rutele duc la cursuri. Unele duc la bufnițe, indicii și linkuri ascunse."
      eyebrow="Easter egg"
      heroContent={(
        <p className="max-w-xl text-sm font-medium leading-6 text-white/86">
          Explorează cele 15 chamber-uri principale, fiecare cu propriul link ascuns, propriul haos simpatic și propria probă de curiozitate pentru exploratorii Akadion.
        </p>
      )}
      heroClassName="relative min-h-[15rem] overflow-hidden border-0 bg-linear-to-br from-[#4A5681] via-[#5869bd] to-[#b88af2] text-white shadow-[0_28px_80px_rgba(67,79,159,0.28)] lg:items-center before:absolute before:-top-20 before:right-[-4rem] before:h-72 before:w-72 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-24 after:left-[-5rem] after:h-72 after:w-72 after:rounded-full after:bg-white/10 after:content-['']"
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
      heroVisual={(
        <div className="relative h-full w-full">
          <img src={ragHeroOwl} alt="Bufniță Akadion RAG" className="absolute left-[calc(72%-10rem)] top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_24px_38px_rgba(15,23,42,0.24)] lg:left-[calc(72%-13rem)] lg:h-60 lg:w-60" />
          <img src={easterOwlTwo} alt="Bufniță Akadion cu ghiozdan" className="absolute left-[72%] top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_24px_38px_rgba(15,23,42,0.24)] lg:h-60 lg:w-60" />
          <img src={easterOwlOne} alt="Bufniță Akadion" className="absolute left-[calc(72%+10rem)] top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_24px_38px_rgba(15,23,42,0.24)] lg:left-[calc(72%+13rem)] lg:h-60 lg:w-60" />
        </div>
      )}
      heroVisualClassName="top-0 right-auto bottom-auto left-0 h-full w-full items-center justify-center"
    >
      <div className="relative overflow-hidden rounded-[2.5rem] border border-[#e7d9c8] bg-[#fffdfa]/88 p-5 shadow-[0_24px_70px_rgba(32,46,84,0.08)] sm:p-7">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:items-start">
          <section className="space-y-5 rounded-[2rem] border border-[#eadfd4] bg-white/76 p-5 shadow-[0_16px_44px_rgba(32,46,84,0.07)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9ccbe] bg-[#fbf7f1] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[#595f8f] uppercase">
              <Gift className="h-3.5 w-3.5" />
              Descoperire rară
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-[#24385b] sm:text-4xl">Ai găsit easter egg-ul aplicației.</h2>
              <p className="text-base leading-7 text-slate-600">
                Cursurile tale sunt în siguranță pe pagina Acasă. Ruta asta e pentru exploratori, bufnițe curioase și linkuri pe care le vom ascunde aici.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-[#5d7094] sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                "Ai dat click unde trebuia",
                "Bufnițele aprobă",
                "Curiozitate recompensată",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[#eadfd4] bg-[#fbf7f1]/80 px-3 py-2 font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSecretLinks.map((link, index) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-[1.8rem] border border-[#e7d9c8] bg-white p-5 shadow-[0_18px_52px_rgba(32,46,84,0.08)] transition hover:-translate-y-1 hover:border-[#c8cdf0] hover:shadow-[0_24px_64px_rgba(67,79,159,0.14)]"
                >
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <span className="rounded-full border border-[#d9ccbe] bg-[#fbf7f1] px-3 py-1 text-[0.68rem] font-bold tracking-[0.16em] text-[#7a6b5a] uppercase">
                      {link.label}
                    </span>
                  </div>

                  <div className="relative z-10 space-y-3 pt-8">
                    <div className="flex items-center gap-2 text-[#5869bd]">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-xs font-bold uppercase tracking-[0.18em]">owl drop {secretLinksPageStart + index + 1}</span>
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-[#24385b]">{link.title}</h3>
                    <p className="text-sm leading-6 text-slate-600">{link.description}</p>
                  </div>

                  <span className="relative z-10 mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#3f698a] transition group-hover:text-[#24385b]">
                    Deschide chamberul
                    <ExternalLink className="h-4 w-4" />
                  </span>
                </a>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              {Array.from({ length: secretLinksTotalPages }, (_, index) => {
                const pageNumber = index + 1
                const isCurrentPage = pageNumber === secretLinksPage

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setSecretLinksPage(pageNumber)}
                    className={`flex h-11 min-w-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition ${isCurrentPage
                      ? "border-[#24385b] bg-[#24385b] text-white shadow-[0_10px_26px_rgba(36,56,91,0.22)]"
                      : "border-[#d8ccbf] bg-white text-[#24385b] hover:bg-[#f7efe6]"
                    }`}
                    aria-current={isCurrentPage ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      <Card className="mt-8 overflow-hidden rounded-[2.25rem] border-[#cfc2ff] bg-linear-to-br from-[#4A5681] via-[#5869bd] to-[#b88af2] text-white shadow-[0_28px_80px_rgba(67,79,159,0.26)]">
        <CardContent className="flex flex-col gap-5 px-6 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/12 px-3 py-1 text-xs font-bold tracking-[0.16em] text-white/78 uppercase">
              <Feather className="h-3.5 w-3.5" />
              Galerie legendară
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Intră în Galeria Bufnițelor Legendare.</h2>
            <p className="mt-3 text-sm leading-7 text-white/82 sm:text-base">
              Dincolo de chambers există o pagină specială dedicată bufnițelor Akadion: un spațiu separat pentru apariții memorabile, simboluri rare și povești care merită păstrate.
            </p>
          </div>
          <Button asChild variant="outline" className="w-fit rounded-2xl border-white/28 bg-white px-5 py-2.5 text-sm font-semibold text-[#24385b] shadow-[0_14px_34px_rgba(8,18,38,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-white/90 hover:text-[#24385b] hover:shadow-[0_20px_42px_rgba(8,18,38,0.24)] active:scale-[0.98]">
            <Link to="/owl-hall">Deschide galeria</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  )
}

export default function CoursesPage() {
  const { user, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const isAdmin = isAdminUser(user)
  const isProfessor = isProfessorUser(user)
  const isStudent = isStudentUser(user)
  const [courses, setCourses] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])
  const [courseThemes, setCourseThemes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [activeAction, setActiveAction] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ADMIN_COURSES_PER_PAGE = 6

  async function loadCourses() {
    setLoading(true)
    setError("")
    setNotice("")

    if (!isAdmin) {
      setCourses([])
      setAvailableCourses([])
      setLoading(false)
      return
    }

    try {
      setCourses(await listAdminCourses())
      setAvailableCourses([])
    } catch (e) {
      if (e.response?.status === 401) await refreshAuth()
      setError(getCourseErrorMessage(e, "Nu am putut încărca cursurile."))
    } finally {
      setLoading(false)
    }
  }

  const syncCourses = useEffectEvent(async () => {
    await loadCourses()
  })

  useEffect(() => {
    syncCourses()
  }, [])

  useEffect(() => {
    const nextCourseThemes = {}
    for (const course of [...courses, ...availableCourses]) {
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
      await loadCourses()
      setNotice("Înscrierea a fost finalizată cu succes.")
      navigate(`/courses/${course.id}`, { state: { course: normalizeEnrolledCourse({ ...course, procentajProgres: 0 }) } })
    } catch (enrollError) {
      if (enrollError.response?.status === 401) await refreshAuth()
      setError(getCourseErrorMessage(enrollError, "Nu am putut finaliza înscrierea."))
    } finally {
      setActiveAction("")
    }
  }

  const totalPages = Math.max(1, Math.ceil(courses.length / ADMIN_COURSES_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pageStart = (currentPage - 1) * ADMIN_COURSES_PER_PAGE
  const paginatedCourses = courses.slice(pageStart, pageStart + ADMIN_COURSES_PER_PAGE)

  const heroClassName = isAdmin
    ? "relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
    : "relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#0f9fbd] via-[#17b7d3] to-[#56d5ea] text-white shadow-[0_24px_60px_rgba(23,133,161,0.24)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/16 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"

  if (!isAdmin) {
    return <CoursesEasterEggPage />
  }

  return (
    <AppShell
      title={isAdmin ? "Cursuri Akadion" : isProfessor ? "Cursurile mele" : "Cursuri"}
      description={isAdmin ? "Toate cursurile create de profesori în platformă." : isProfessor ? "Administrează cursurile pe care le predai." : "Vezi cursurile tale și descoperă cursuri disponibile."}
      eyebrow="Cursuri"
      heroClassName={heroClassName}
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
      actions={isProfessor ? (
        <Button asChild variant="outline" className="rounded-2xl border border-white/35 bg-white/18 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-white/28 hover:text-white">
          <Link to="/courses/new" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Curs nou</span>
          </Link>
        </Button>
      ) : null}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-[#24385b]">{isAdmin ? "Toate cursurile" : isProfessor ? "Cursurile tale" : "Catalog cursuri"}</h2>
        </div>

        {error ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare la încărcare</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? <p className="text-sm text-slate-500">Se încarcă lista de cursuri...</p> : null}

        {notice ? (
          <Alert className="rounded-3xl border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <AlertTitle>Succes</AlertTitle>
            <AlertDescription className="text-emerald-800">{notice}</AlertDescription>
          </Alert>
        ) : null}

        {!loading && isAdmin && courses.length > 0 ? (
          <AdminCourseList
            courses={paginatedCourses}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : null}

        {!loading && isProfessor && courses.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
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
        ) : null}

        {!loading && isStudent ? (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursurile mele</h2>
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
                <h2 className="text-2xl font-semibold tracking-tight text-[#24385b]">Cursuri disponibile</h2>
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

        {!loading && isAdmin && courses.length === 0 ? (
          <EmptyCoursesState message="Nu există încă niciun curs creat de profesori." />
        ) : null}

        {!loading && isProfessor && courses.length === 0 ? (
          <EmptyCoursesState message="Nu ai adăugat încă niciun curs. Creează unul din butonul `Curs nou` și va apărea aici." />
        ) : null}
      </div>
    </AppShell>
  )
}




