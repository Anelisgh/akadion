import { AlertCircle, FileText, Loader2, Palette, RotateCcw, Sparkles } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/auth/useAuth"
import AppShell from "@/components/AppShell"
import AkyChatWidget from "@/components/chat/AkyChatWidget"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { genereazaFlashcards, getDocumenteAccesibile } from "@/lib/conversatii"
import { COURSE_THEME_KEYS, COURSE_THEMES, DEFAULT_COURSE_THEME, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"
import { listStudentCourses } from "@/lib/professorCourses"
import { isStudentUser } from "@/lib/user"
import { cn } from "@/lib/utils"

function getFlashcardsThemeStorageKey(user) {
  return `akadion:flashcards-page-theme:${getThemeUserKey(user)}`
}

export default function FlashcardsPage() {
  const { user } = useAuth()
  const isStudent = isStudentUser(user)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [accessibleDocuments, setAccessibleDocuments] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  const [selectedFlashcardDocId, setSelectedFlashcardDocId] = useState("")
  const [flashcardNumQuestions, setFlashcardNumQuestions] = useState(5)

  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false)
  const [flashcardQuestions, setFlashcardQuestions] = useState([])
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false)
  const [flashcardError, setFlashcardError] = useState("")

  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const themePickerRef = useRef(null)
  const [selectedThemeKey, setSelectedThemeKey] = useState(DEFAULT_COURSE_THEME)
  const theme = getCourseTheme(selectedThemeKey)

  useEffect(() => {
    if (!isStudent) {
      return
    }

    listStudentCourses()
      .then((data) => {
        if (Array.isArray(data)) {
          setCourses(data)
        }
      })
      .catch((error) => {
        console.error("Nu s-au putut încărca cursurile studentului pentru FlashcardsPage", error)
      })
  }, [isStudent])

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(getFlashcardsThemeStorageKey(user))
      if (COURSE_THEME_KEYS.has(savedTheme)) {
        setSelectedThemeKey(savedTheme)
      } else {
        setSelectedThemeKey(DEFAULT_COURSE_THEME)
      }
    } catch {
      setSelectedThemeKey(DEFAULT_COURSE_THEME)
    }
  }, [user])

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

  const loadAccessibleDocuments = useCallback(async (courseId) => {
    if (!courseId) {
      setAccessibleDocuments([])
      return
    }

    setIsLoadingDocs(true)
    try {
      const documents = await getDocumenteAccesibile(courseId)
      setAccessibleDocuments(Array.isArray(documents) ? documents : [])
    } catch (error) {
      console.error("Nu s-au putut încărca documentele accesibile pentru flashcards", error)
      setAccessibleDocuments([])
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    loadAccessibleDocuments(selectedCourseId)
    setSelectedFlashcardDocId("")
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)
    setFlashcardError("")
  }, [loadAccessibleDocuments, selectedCourseId])

  function handleThemeChange(themeKey) {
    if (!COURSE_THEME_KEYS.has(themeKey)) {
      return
    }

    setSelectedThemeKey(themeKey)
    setThemePickerOpen(false)
    try {
      window.localStorage.setItem(getFlashcardsThemeStorageKey(user), themeKey)
    } catch {
      // ignore localStorage failures
    }
  }

  async function handleStartFlashcards() {
    if (!selectedCourseId) {
      return
    }

    setIsFlashcardsLoading(true)
    setFlashcardError("")
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)

    try {
      const response = await genereazaFlashcards(selectedCourseId, selectedFlashcardDocId ? Number(selectedFlashcardDocId) : null, flashcardNumQuestions)
      if (Array.isArray(response) && response.length > 0) {
        setFlashcardQuestions(response)
        return
      }

      setFlashcardError("Aky nu a putut genera flashcard-uri structurate corect. Încearcă din nou.")
    } catch (error) {
      setFlashcardError(error.response?.data?.eroare || error.response?.data?.detail || "Nu am putut genera flashcard-urile.")
    } finally {
      setIsFlashcardsLoading(false)
    }
  }

  function handleResetFlashcards() {
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)
    setFlashcardError("")
  }

  if (!isStudent) {
    return (
      <AppShell title="Flashcards" description="Funcționalitatea este disponibilă doar pentru studenți.">
        <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardContent className="px-6 py-6 text-sm text-slate-600">
            Pagina de flashcards este disponibilă doar utilizatorilor cu rol de student.
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Flashcards Aky"
      description="Generează fișe de recapitulare din documentele pe care le poți accesa la cursurile tale."
      heroClassName={cn("relative overflow-visible border", theme.heroBg, theme.heroBorder)}
      heroEyebrowClassName={theme.heroStatLabel}
      heroTitleClassName={theme.sectionTitle}
      heroDescriptionClassName="text-slate-600"
      actions={(
        <div ref={themePickerRef} className="relative z-30 self-end">
          {themePickerOpen ? (
            <div className="absolute right-0 top-full z-40 mt-3 w-56 rounded-[1.35rem] border border-[#d9c9ff] bg-[#fbf8ff]/98 p-2.5 text-[#3a2e66] shadow-[0_18px_48px_rgba(62,42,120,0.2)] backdrop-blur-md">
              <p className="px-2 pb-2 text-[0.68rem] font-semibold tracking-[0.14em] text-[#6c5c9a] uppercase">Tema</p>
              <div className="space-y-1">
                {COURSE_THEMES.map((currentTheme) => {
                  const isSelected = currentTheme.key === theme.key

                  return (
                    <button
                      key={currentTheme.key}
                      type="button"
                      onClick={() => handleThemeChange(currentTheme.key)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-2xl border px-2 py-2 text-left text-sm font-medium transition",
                        isSelected ? "border-[#7650d8] bg-[#f3edff] text-[#6840c5]" : "border-transparent hover:bg-white/80",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("h-5 w-5 shrink-0 rounded-full", currentTheme.swatch)} />
                        <span className="whitespace-nowrap">{currentTheme.label}</span>
                      </span>
                      {isSelected ? <Sparkles className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            aria-label="Schimbă tema paginii de flashcards"
            onClick={() => setThemePickerOpen((currentValue) => !currentValue)}
            className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition hover:bg-[#fbf6f0]", theme.btnIconBorder, theme.btnIconText)}
          >
            <Palette className="h-4 w-4" />
          </button>
        </div>
      )}
    >
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-2 lg:space-y-8">
        <Card className="relative w-full overflow-visible rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardContent className="space-y-7 px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            <div className="flex items-start gap-4">
              <div className="flex items-start gap-4">
                <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] bg-linear-to-br text-white shadow-[0_14px_32px_rgba(32,46,84,0.16)]", theme.accent)}>
                  <FileText className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <p className={cn("text-sm font-semibold uppercase tracking-[0.22em]", theme.sectionLabel)}>Configurare Flashcards</p>
                  <h2 className={cn("mt-1 text-[2rem] font-semibold leading-tight", theme.sectionTitle)}>Flashcards Aky</h2>
                </div>
              </div>

            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_12rem]">
              <div className="space-y-2">
                <label htmlFor="flashcards-course" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Curs</label>
                <select
                  id="flashcards-course"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  disabled={isFlashcardsLoading}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Selectează cursul...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.denumire}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="flashcards-doc" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Document</label>
                <select
                  id="flashcards-doc"
                  value={selectedFlashcardDocId}
                  onChange={(event) => setSelectedFlashcardDocId(event.target.value)}
                  disabled={isFlashcardsLoading || isLoadingDocs || !selectedCourseId}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                >
                  <option value="">Toate documentele accesibile</option>
                  {accessibleDocuments.map((document) => (
                    <option key={document.documentId} value={document.documentId}>{document.numeFisier}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="flashcards-count" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Număr fișe</label>
                <select
                  id="flashcards-count"
                  value={flashcardNumQuestions}
                  onChange={(event) => setFlashcardNumQuestions(Number(event.target.value))}
                  disabled={isFlashcardsLoading}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:outline-none"
                >
                  {[3, 5, 8, 12].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button type="button" onClick={handleStartFlashcards} disabled={isFlashcardsLoading || !selectedCourseId} className={cn("min-w-[14rem] rounded-2xl px-6 text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                {isFlashcardsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Generează flashcards
              </Button>
            </div>

            {flashcardError ? (
              <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <AlertTitle>Flashcards indisponibile</AlertTitle>
                <AlertDescription>{flashcardError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card className="w-full rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardContent className="space-y-7 px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            {isFlashcardsLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2 className={cn("h-10 w-10 animate-spin", theme.iconText)} />
              </div>
            ) : null}

            {!isFlashcardsLoading && flashcardQuestions.length === 0 && !flashcardError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className={cn("flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[2rem] shadow-[0_14px_30px_rgba(32,46,84,0.08)]", theme.iconBg, theme.iconText)}>
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">Pregătește un set de fișe</h3>
              </div>
            ) : null}

            {!isFlashcardsLoading && flashcardQuestions.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>Fișa {currentFlashcardIndex + 1} din {flashcardQuestions.length}</span>
                  <span className={theme.sectionLabel}>Memorare activă</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full bg-linear-to-r transition-all duration-300", theme.accent)}
                    style={{ width: `${((currentFlashcardIndex + 1) / flashcardQuestions.length) * 100}%` }}
                  />
                </div>

                <div className="h-[22rem] w-full cursor-pointer sm:h-[24rem]" style={{ perspective: "1000px" }} onClick={() => setIsFlashcardFlipped((currentValue) => !currentValue)}>
                  <div
                    className="relative h-full w-full rounded-[2rem]"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: isFlashcardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <div className={cn("absolute inset-0 flex h-full w-full flex-col items-center justify-between rounded-[2rem] border p-7 text-center shadow-xs sm:p-8", theme.heroBorder, theme.heroBg)} style={{ backfaceVisibility: "hidden" }}>
                      <span className={cn("rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", theme.badge)}>
                        Concept
                      </span>
                      <p className={cn("flex flex-1 items-center justify-center text-xl font-semibold leading-8 sm:text-2xl sm:leading-9", theme.sectionTitle)}>{flashcardQuestions[currentFlashcardIndex].fata}</p>
                      <span className="text-xs text-slate-500">Apasă pentru răspuns</span>
                    </div>
                    <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-between rounded-[2rem] border border-[#d9e4f4] bg-white p-7 text-center shadow-xs sm:p-8" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <span className={cn("rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", theme.badge)}>
                        Explicație
                      </span>
                      <p className="flex max-h-[12rem] flex-1 items-center justify-center overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-600 sm:text-[0.95rem]">{flashcardQuestions[currentFlashcardIndex].verso}</p>
                      <span className="text-xs text-slate-500">Apasă pentru întoarcere</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentFlashcardIndex === 0}
                    onClick={() => {
                      setIsFlashcardFlipped(false)
                      window.setTimeout(() => {
                        setCurrentFlashcardIndex((currentValue) => currentValue - 1)
                      }, 150)
                    }}
                    className="rounded-2xl border-[#d9ccbe] bg-white px-5"
                  >
                    Înapoi
                  </Button>
                  {currentFlashcardIndex < flashcardQuestions.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() => {
                        setIsFlashcardFlipped(false)
                        window.setTimeout(() => {
                          setCurrentFlashcardIndex((currentValue) => currentValue + 1)
                        }, 150)
                      }}
                      className={cn("rounded-2xl px-5 text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}
                    >
                      Următoarea
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleResetFlashcards} className={cn("rounded-2xl px-5 text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                      Finalizează și reset
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AkyChatWidget enabled />
    </AppShell>
  )
}
