import { AlertCircle, Check, Loader2, Menu, Palette, RotateCcw, Sparkles, Timer, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import AppShell from "@/components/AppShell"
import AkyChatWidget from "@/components/chat/AkyChatWidget"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { finalizeazaQuiz, genereazaQuiz, getDetaliuQuizStudent, getDocumenteAccesibile, getIstoricQuizStudent, stergeIncercareQuiz } from "@/lib/conversatii"
import { COURSE_THEME_KEYS, COURSE_THEMES, DEFAULT_COURSE_THEME, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"
import { listStudentCourses } from "@/lib/professorCourses"
import { isStudentUser } from "@/lib/user"
import { cn } from "@/lib/utils"

function getQuizOptionEntries(optiuni) {
  if (Array.isArray(optiuni)) {
    return optiuni.map((value, index) => [String.fromCharCode(65 + index), value])
  }
  if (optiuni && typeof optiuni === "object") {
    return Object.entries(optiuni)
  }
  return []
}

function formatQuizDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeQuizAnswerValue(value) {
  return String(value || "").trim().toLowerCase()
}

function quizAnswerMatchesOption(answer, optionKey, optionValue) {
  const normalizedAnswer = normalizeQuizAnswerValue(answer)
  if (!normalizedAnswer) {
    return false
  }

  return normalizedAnswer === normalizeQuizAnswerValue(optionKey)
    || normalizedAnswer === normalizeQuizAnswerValue(optionValue)
}

function getScoreBadgeClasses(procentaj) {
  if (procentaj >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (procentaj >= 50) return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-rose-200 bg-rose-50 text-rose-700"
}

function getQuizThemeStorageKey(user) {
  return `akadion:quiz-page-theme:${getThemeUserKey(user)}`
}

export default function QuizPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const isStudent = isStudentUser(user)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [accessibleDocuments, setAccessibleDocuments] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  const [selectedQuizDocId, setSelectedQuizDocId] = useState("")
  const [quizNumQuestions, setQuizNumQuestions] = useState(5)
  const [quizDifficulty, setQuizDifficulty] = useState("MEDIU")
  const [quizMode, setQuizMode] = useState("EXERSARE")
  const [timeLeft, setTimeLeft] = useState(0)

  const [isQuizLoading, setIsQuizLoading] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState({})
  const [currentIncercareId, setCurrentIncercareId] = useState(null)
  const [isFinalizingQuiz, setIsFinalizingQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState(null)
  const [quizError, setQuizError] = useState("")

  const [quizHistory, setQuizHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryAttempt, setSelectedHistoryAttempt] = useState(null)
  const [isLoadingHistoryDetail, setIsLoadingHistoryDetail] = useState(false)
  const [historyError, setHistoryError] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)

  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const themePickerRef = useRef(null)
  const [selectedThemeKey, setSelectedThemeKey] = useState(DEFAULT_COURSE_THEME)
  const theme = getCourseTheme(selectedThemeKey)

  const autoFinalizeRef = useRef(null)

  autoFinalizeRef.current = async () => {
    if (!currentIncercareId || isFinalizingQuiz) {
      return
    }

    setIsFinalizingQuiz(true)
    setQuizError("Timpul a expirat. Quiz-ul se finalizează automat...")

    try {
      const payload = quizQuestions.map((question, index) => ({
        index: question.index ?? index,
        raspunsStudent: answeredQuestions[index]?.selectedOption || null,
      }))
      const response = await finalizeazaQuiz(currentIncercareId, payload)
      setQuizResult(response)
      await loadQuizHistory(selectedCourseId || null)
    } catch (error) {
      setQuizError(error.response?.data?.eroare || error.response?.data?.detail || "Nu s-a putut finaliza automat quiz-ul.")
    } finally {
      setIsFinalizingQuiz(false)
    }
  }

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
        console.error("Nu s-au putut încărca cursurile studentului pentru QuizPage", error)
      })
  }, [isStudent])

  useEffect(() => {
    const urlCourseId = searchParams.get("courseId")
    const urlDocId = searchParams.get("documentId")
    if (urlCourseId) {
      setSelectedCourseId(urlCourseId)
    }
    if (urlDocId) {
      setSelectedQuizDocId(urlDocId)
    }
  }, [searchParams])

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(getQuizThemeStorageKey(user))
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
      console.error("Nu s-au putut încărca documentele accesibile pentru quiz", error)
      setAccessibleDocuments([])
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  const loadQuizHistory = useCallback(async (courseId = null) => {
    setIsLoadingHistory(true)
    setHistoryError("")

    try {
      const response = await getIstoricQuizStudent(courseId)
      setQuizHistory(Array.isArray(response) ? response : (response?.content || response?.continut || []))
    } catch (error) {
      console.error("Nu s-a putut încărca istoricul quiz-urilor", error)
      setHistoryError(error.response?.data?.eroare || "Nu s-a putut încărca istoricul quiz-urilor.")
      setQuizHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadAccessibleDocuments(selectedCourseId)
    setSelectedQuizDocId("")
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnsweredQuestions({})
    setQuizResult(null)
    setCurrentIncercareId(null)
    setQuizError("")
    setTimeLeft(0)
    setSelectedHistoryAttempt(null)
    setQuizHistory([])
    setHistoryError("")
  }, [loadAccessibleDocuments, selectedCourseId])

  useEffect(() => {
    if (!historyOpen) {
      return
    }
    loadQuizHistory(selectedCourseId || null)
  }, [historyOpen, loadQuizHistory, selectedCourseId])

  useEffect(() => {
    if (quizQuestions.length === 0 || quizResult || quizMode !== "EXAMEN") {
      return undefined
    }

    setTimeLeft(quizQuestions.length * 15)
    const intervalId = window.setInterval(() => {
      setTimeLeft((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(intervalId)
          autoFinalizeRef.current?.()
          return 0
        }
        return currentValue - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [quizMode, quizQuestions, quizResult])

  function handleThemeChange(themeKey) {
    if (!COURSE_THEME_KEYS.has(themeKey)) {
      return
    }

    setSelectedThemeKey(themeKey)
    setThemePickerOpen(false)
    try {
      window.localStorage.setItem(getQuizThemeStorageKey(user), themeKey)
    } catch {
      // ignore localStorage failures
    }
  }

  async function handleStartQuiz() {
    if (!selectedCourseId) {
      return
    }

    setIsQuizLoading(true)
    setQuizError("")
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnsweredQuestions({})
    setCurrentIncercareId(null)
    setQuizResult(null)
    setTimeLeft(0)
    setSelectedHistoryAttempt(null)

    try {
      const data = await genereazaQuiz(selectedCourseId, {
        documentId: selectedQuizDocId ? Number(selectedQuizDocId) : null,
        nrIntrebari: quizNumQuestions,
        dificultate: quizDifficulty,
      })

      if (data?.incercareId && Array.isArray(data?.intrebari) && data.intrebari.length > 0) {
        setCurrentIncercareId(data.incercareId)
        setQuizQuestions(data.intrebari)
        return
      }

      setQuizError("Aky nu a putut genera întrebări structurate corect. Încearcă din nou.")
    } catch (error) {
      setQuizError(error.response?.data?.eroare || error.response?.data?.detail || "Nu am putut genera quiz-ul.")
    } finally {
      setIsQuizLoading(false)
    }
  }

  function handleAnswerClick(optionKey) {
    if (quizResult || selectedHistoryAttempt) {
      return
    }

    setAnsweredQuestions((currentValue) => ({
      ...currentValue,
      [currentQuestionIndex]: { selectedOption: optionKey },
    }))
  }

  async function handleFinalizeQuiz() {
    if (!currentIncercareId || isFinalizingQuiz) {
      return
    }

    setIsFinalizingQuiz(true)
    setQuizError("")

    try {
      const payload = quizQuestions.map((question, index) => ({
        index: question.index ?? index,
        raspunsStudent: answeredQuestions[index]?.selectedOption || null,
      }))
      const response = await finalizeazaQuiz(currentIncercareId, payload)
      setQuizResult(response)
      await loadQuizHistory(selectedCourseId || null)
    } catch (error) {
      setQuizError(error.response?.data?.eroare || error.response?.data?.detail || "Nu am putut finaliza quiz-ul.")
    } finally {
      setIsFinalizingQuiz(false)
    }
  }

  function handleResetQuiz() {
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnsweredQuestions({})
    setQuizError("")
    setCurrentIncercareId(null)
    setQuizResult(null)
    setTimeLeft(0)
    setSelectedHistoryAttempt(null)
  }

  async function handleStergeQuiz(incercareId) {
    if (!window.confirm("Sigur dorești să ștergi acest quiz din istoric?")) {
      return
    }

    try {
      await stergeIncercareQuiz(incercareId)
      if (selectedHistoryAttempt?.incercareId === incercareId) {
        setSelectedHistoryAttempt(null)
      }
      await loadQuizHistory(selectedCourseId || null)
    } catch (error) {
      console.error("Nu s-a putut șterge încercarea de quiz", error)
      setHistoryError(error.response?.data?.eroare || "Nu s-a putut șterge încercarea.")
    }
  }

  async function handleViewAttemptDetail(item) {
    const incercareId = typeof item === "object" ? (item.incercareId || item.id) : item
    if (!incercareId) {
      return
    }

    setIsLoadingHistoryDetail(true)
    setHistoryError("")
    setSelectedHistoryAttempt({
      incercareId,
      cursDenumire: item?.cursDenumire || "",
      documentTitlu: item?.documentTitlu || "",
      scor: item?.scor || 0,
      nrIntrebari: item?.nrIntrebari || 0,
      procentaj: item?.procentaj || 0,
      detalii: [],
    })

    try {
      const detail = await getDetaliuQuizStudent(incercareId)
      setSelectedHistoryAttempt(detail)
    } catch (error) {
      console.error("Nu s-a putut încărca detaliul încercării", error)
      setHistoryError(error.response?.data?.eroare || "Nu s-a putut încărca detaliul încercării.")
    } finally {
      setIsLoadingHistoryDetail(false)
    }
  }

  const answeredCount = Object.keys(answeredQuestions).length
  const isQuizReadyToFinalize = quizQuestions.length > 0 && answeredCount === quizQuestions.length && !quizResult && !selectedHistoryAttempt
  const currentQuestionSource = selectedHistoryAttempt?.detalii || quizQuestions
  const currentQuestion = currentQuestionSource[currentQuestionIndex]

  const historySidebar = (
    <aside
      className="relative z-20 flex max-h-[70vh] w-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-[#e4d8cd] bg-linear-to-b from-[#f8fafc] via-[#fffdfa] to-[#fbf6f0] shadow-[18px_22px_54px_rgba(32,46,84,0.12)] lg:h-[calc(100vh-9rem)] lg:max-h-none lg:rounded-l-none lg:rounded-r-[2rem] lg:border-l-0"
      aria-label="Istoric quiz"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#e4d8cd] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Istoric quiz</h2>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen(false)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#e4d8cd] bg-white text-slate-500 transition hover:bg-[#f7efe6] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24385b]/20"
          aria-label="Închide istoricul quiz"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 border-b border-[#e4d8cd] px-5 py-4">
        <Button
          type="button"
          onClick={() => {
            handleResetQuiz()
            setHistoryError("")
          }}
          className={cn("w-full rounded-2xl text-white shadow-md", theme.btnPrimaryBg, theme.btnPrimaryHover)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Quiz nou
        </Button>

        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase">Încercări salvate</p>
          <button
            type="button"
            onClick={() => loadQuizHistory(selectedCourseId || null)}
            className="text-xs font-semibold text-slate-500 transition hover:text-[#24385b]"
          >
            Reîmprospătează
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {historyError ? (
          <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <AlertTitle>Istoric indisponibil</AlertTitle>
            <AlertDescription>{historyError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoadingHistory ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#4A5681]" />
          </div>
        ) : null}

        {!isLoadingHistory && quizHistory.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#d8ccbf] bg-[#fbf6f0] px-4 py-10 text-center text-sm text-slate-500">
            Nu ai încercări finalizate pentru acest filtru.
          </div>
        ) : null}

        <div className="space-y-3">
          {!isLoadingHistory && quizHistory.length > 0 ? quizHistory.map((item) => (
            <div
              key={item.incercareId || item.id}
              className="flex items-center justify-between gap-4 rounded-3xl border border-[#d9e4f4] bg-white px-4 py-4 text-left shadow-xs transition hover:border-[#bfd5eb] hover:bg-[#f4f8fd]"
            >
              <button
                type="button"
                onClick={() => handleViewAttemptDetail(item)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold text-[#24385b]">{item.documentTitlu || item.cursDenumire || "Quiz general"}</p>
                <p className="mt-1 text-xs text-slate-400">{formatQuizDate(item.createdAt)}</p>
              </button>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", getScoreBadgeClasses(item.procentaj))}>{item.scor} / {item.nrIntrebari}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleStergeQuiz(item.incercareId || item.id)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Șterge încercarea"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )) : null}
        </div>
      </div>
    </aside>
  )

  if (!isStudent) {
    return (
      <AppShell title="Quiz" description="Funcționalitatea este disponibilă doar pentru studenți.">
        <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardContent className="px-6 py-6 text-sm text-slate-600">
            Pagina de quiz este disponibilă doar utilizatorilor cu rol de student.
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Quiz Aky"
      description="Generează, finalizează și revede quiz-uri construite din documentele tale accesibile."
      heroClassName={cn("relative overflow-visible border", theme.heroBg, theme.heroBorder)}
      heroEyebrowClassName={theme.heroStatLabel}
      heroTitleClassName={theme.sectionTitle}
      heroDescriptionClassName="text-slate-600"
      sideContent={historyOpen ? historySidebar : null}
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
                      {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            aria-label="Schimbă tema paginii de quiz"
            onClick={() => setThemePickerOpen((currentValue) => !currentValue)}
            className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition hover:bg-[#fbf6f0]", theme.btnIconBorder, theme.btnIconText)}
          >
            <Palette className="h-4 w-4" />
          </button>
        </div>
      )}
    >
      {!historyOpen ? (
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" })
            setHistoryOpen(true)
          }}
          className={cn(
            "group fixed left-0 top-28 z-20 flex h-14 w-14 items-center justify-center rounded-r-[1.75rem] border border-l-0 bg-white/95 text-slate-700 shadow-[12px_14px_34px_rgba(32,46,84,0.14)] transition hover:w-16 hover:bg-white hover:text-slate-950 focus-visible:w-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24385b]/20",
            theme.heroBorder,
          )}
          aria-label="Deschide istoricul quiz"
        >
          <Menu className="h-5 w-5" />
          <span className="pointer-events-none absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
            Deschide istoricul quiz
          </span>
        </button>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-2 lg:space-y-8">
        <Card className="relative w-full overflow-visible rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardContent className="space-y-7 px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            <div className="flex items-start gap-4">
              <div className="flex items-start gap-4">
                <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] bg-linear-to-br text-white shadow-[0_14px_32px_rgba(32,46,84,0.16)]", theme.accent)}>
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <p className={cn("text-sm font-semibold uppercase tracking-[0.22em]", theme.sectionLabel)}>Configurare Quiz</p>
                  <h2 className={cn("mt-1 text-[2rem] font-semibold leading-tight", theme.sectionTitle)}>Quiz Aky</h2>
                </div>
              </div>

            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2 xl:col-span-3">
                <label htmlFor="quiz-course" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Curs</label>
                <select
                  id="quiz-course"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  disabled={isQuizLoading}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20"
                >
                  <option value="">Selectează cursul...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.denumire}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 xl:col-span-3">
                <label htmlFor="quiz-doc" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Document</label>
                <select
                  id="quiz-doc"
                  value={selectedQuizDocId}
                  onChange={(event) => setSelectedQuizDocId(event.target.value)}
                  disabled={isQuizLoading || isLoadingDocs || !selectedCourseId}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20 disabled:opacity-60"
                >
                  <option value="">Toate documentele accesibile</option>
                  {accessibleDocuments.map((document) => (
                    <option key={document.documentId} value={document.documentId}>{document.numeFisier}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-1 xl:col-span-2">
                <label htmlFor="quiz-questions" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Întrebări</label>
                <select
                  id="quiz-questions"
                  value={quizNumQuestions}
                  onChange={(event) => setQuizNumQuestions(Number(event.target.value))}
                  disabled={isQuizLoading}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20"
                >
                  {[3, 5, 10, 15].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-1 xl:col-span-2">
                <label htmlFor="quiz-difficulty" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Dificultate</label>
                <select
                  id="quiz-difficulty"
                  value={quizDifficulty}
                  onChange={(event) => setQuizDifficulty(event.target.value)}
                  disabled={isQuizLoading}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20"
                >
                  <option value="USOR">Ușor</option>
                  <option value="MEDIU">Mediu</option>
                  <option value="AVANSAT">Avansat</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-2">
                <label htmlFor="quiz-mode" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Mod</label>
                <select
                  id="quiz-mode"
                  value={quizMode}
                  onChange={(event) => setQuizMode(event.target.value)}
                  disabled={isQuizLoading}
                  className="h-12 w-full rounded-2xl border border-[#d9e4f4] bg-white px-4 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20"
                >
                  <option value="EXERSARE">Exersare</option>
                  <option value="EXAMEN">Examen cu timer</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                onClick={handleStartQuiz}
                disabled={isQuizLoading || !selectedCourseId}
                className={cn("min-w-[13rem] rounded-2xl px-6 text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}
              >
                {isQuizLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generează quiz
              </Button>
            </div>

            {quizError ? (
              <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <AlertTitle>Quiz indisponibil</AlertTitle>
                <AlertDescription>{quizError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card className="w-full rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardContent className="space-y-7 px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            {isQuizLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2 className={cn("h-10 w-10 animate-spin", theme.iconText)} />
              </div>
            ) : null}

            {!isQuizLoading && !selectedHistoryAttempt && quizQuestions.length === 0 && !quizError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className={cn("flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[2rem] shadow-[0_14px_30px_rgba(32,46,84,0.08)]", theme.iconBg, theme.iconText)}>
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">Aky e gata de examen, tu?</h3>
              </div>
            ) : null}

            {!isQuizLoading && selectedHistoryAttempt && !currentQuestion ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className={cn("flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[2rem] shadow-[0_14px_30px_rgba(32,46,84,0.08)]", theme.iconBg, theme.iconText)}>
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">Încercarea nu mai are întrebări disponibile.</h3>
              </div>
            ) : null}

            {!isQuizLoading && !selectedHistoryAttempt && quizQuestions.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className={cn("text-xs font-semibold uppercase tracking-[0.16em]", theme.sectionLabel)}>Întrebarea {currentQuestionIndex + 1} din {quizQuestions.length}</p>
                    <p className="text-sm text-slate-500">Răspunsuri selectate: {answeredCount} / {quizQuestions.length}</p>
                  </div>
                  {quizMode === "EXAMEN" && !quizResult ? (
                    <div className={cn(
                      "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold",
                      timeLeft <= 10 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700",
                    )}>
                      <Timer className="h-4 w-4" />
                      <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</span>
                    </div>
                  ) : null}
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full bg-linear-to-r transition-all duration-300", theme.accent)}
                    style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>

                {quizResult ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-6 text-center shadow-[0_12px_28px_rgba(16,185,129,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Quiz finalizat</p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-900">{quizResult.scor} / {quizResult.nrIntrebari}</p>
                    <p className="mt-1 text-sm text-emerald-800">Procentaj: {quizResult.procentaj}%</p>
                  </div>
                ) : null}

                <div className={cn("rounded-3xl border p-6 sm:p-7", theme.heroBorder, theme.heroBg)}>
                  <p className={cn("text-xl font-semibold leading-8", theme.sectionTitle)}>{currentQuestion.intrebare}</p>
                </div>

                <div className="space-y-4">
                  {getQuizOptionEntries(currentQuestion.optiuni).map(([key, value]) => {
                    const selectedOption = answeredQuestions[currentQuestionIndex]?.selectedOption
                    const questionFeedback = quizResult?.detalii?.[currentQuestionIndex]
                    const isSelected = quizAnswerMatchesOption(selectedOption, key, value)
                    const isCorrect = quizAnswerMatchesOption(questionFeedback?.raspunsCorect, key, value)

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={Boolean(quizResult)}
                        onClick={() => handleAnswerClick(key)}
                        className={cn(
                          "flex w-full items-start gap-4 rounded-3xl border px-5 py-[1.15rem] text-left transition",
                          !quizResult && isSelected ? cn(theme.heroBorder, theme.heroBg) : "border-[#d9e4f4] bg-white hover:border-[#bfd5eb] hover:bg-[#f4f8fd]",
                          quizResult && isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-900" : null,
                          quizResult && isSelected && !isCorrect ? "border-rose-200 bg-rose-50 text-rose-900" : null,
                        )}
                      >
                        <span className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
                          isSelected ? cn(theme.btnPrimaryBg, "border-transparent text-white") : "border-[#d9e4f4] bg-[#fbfdff] text-[#24385b]",
                        )}>
                          {key}
                        </span>
                        <span className="flex-1 text-sm leading-7">{value}</span>
                        {quizResult && isCorrect ? <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> : null}
                      </button>
                    )
                  })}
                </div>

                {quizResult?.detalii?.[currentQuestionIndex]?.explicatie ? (
                  <div className="rounded-3xl border border-[#d9e4f4] bg-[#f4f8fd] px-5 py-4 text-sm leading-7 text-slate-600">
                    <span className="font-semibold text-[#24385b]">Explicație: </span>
                    {quizResult.detalii[currentQuestionIndex].explicatie}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((currentValue) => currentValue - 1)}
                    className="rounded-2xl border-[#d9ccbe] bg-white"
                  >
                    Înapoi
                  </Button>
                  {currentQuestionIndex < quizQuestions.length - 1 ? (
                    <Button type="button" onClick={() => setCurrentQuestionIndex((currentValue) => currentValue + 1)} className={cn("rounded-2xl text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                      Următoarea
                    </Button>
                  ) : null}
                </div>

                {isQuizReadyToFinalize ? (
                  <div className={cn("rounded-3xl border px-5 py-5", theme.heroBorder, theme.heroBg)}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className={cn("text-xs font-semibold uppercase tracking-[0.16em]", theme.sectionLabel)}>Quiz completat</p>
                        <p className={cn("mt-1 text-base font-semibold", theme.sectionTitle)}>Ai răspuns la toate întrebările.</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button type="button" variant="outline" onClick={handleResetQuiz} className="rounded-2xl border-[#d9ccbe] bg-white px-5">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset
                        </Button>
                        <Button type="button" onClick={handleFinalizeQuiz} disabled={isFinalizingQuiz} className={cn("rounded-2xl px-6 text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                          {isFinalizingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Finalizează quiz
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {quizResult ? (
                  <div className="flex justify-end pt-1">
                    <Button type="button" variant="outline" onClick={handleResetQuiz} className="rounded-2xl border-[#d9ccbe] bg-white px-5">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}

            {!isQuizLoading && selectedHistoryAttempt ? (
              <>
                <div className="space-y-1">
                  <p className={cn("text-xs font-semibold uppercase tracking-[0.16em]", theme.sectionLabel)}>Istoric selectat</p>
                  <p className="text-sm text-slate-500">Întrebarea {currentQuestionIndex + 1} din {selectedHistoryAttempt.nrIntrebari}</p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Rezultat</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-900">{selectedHistoryAttempt.scor} / {selectedHistoryAttempt.nrIntrebari}</p>
                  <p className="mt-1 text-sm text-emerald-800">Procentaj: {selectedHistoryAttempt.procentaj}%</p>
                </div>

                {isLoadingHistoryDetail ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className={cn("h-6 w-6 animate-spin", theme.iconText)} />
                  </div>
                ) : currentQuestion ? (
                  <>
                    <div className={cn("rounded-3xl border p-6 sm:p-7", theme.heroBorder, theme.heroBg)}>
                      <p className={cn("text-xl font-semibold leading-8", theme.sectionTitle)}>{currentQuestionIndex + 1}. {currentQuestion.intrebare}</p>
                    </div>

                    <div className="space-y-3.5">
                      {getQuizOptionEntries(currentQuestion.optiuni).map(([key, value]) => {
                        const isCorrect = quizAnswerMatchesOption(currentQuestion.raspunsCorect, key, value)
                        const isSelected = quizAnswerMatchesOption(currentQuestion.raspunsStudent, key, value)

                        return (
                          <div
                            key={key}
                            className={cn(
                              "rounded-3xl border px-5 py-4 text-sm leading-7",
                              isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-[#d9e4f4] bg-white text-slate-700",
                              isSelected && !isCorrect ? "border-rose-200 bg-rose-50 text-rose-900" : null,
                            )}
                          >
                            <span className="font-semibold">{key}. </span>
                            {value}
                          </div>
                        )
                      })}
                    </div>

                    {currentQuestion.explicatie ? (
                      <div className="rounded-3xl border border-[#d9e4f4] bg-[#f4f8fd] px-5 py-4 text-sm leading-7 text-slate-600">
                        <span className="font-semibold text-[#24385b]">Explicație: </span>
                        {currentQuestion.explicatie}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex((currentValue) => currentValue - 1)}
                        className="rounded-2xl border-[#d9ccbe] bg-white"
                      >
                        Înapoi
                      </Button>
                      {currentQuestionIndex < (selectedHistoryAttempt.detalii?.length ?? 0) - 1 ? (
                        <Button type="button" onClick={() => setCurrentQuestionIndex((currentValue) => currentValue + 1)} className={cn("rounded-2xl text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                          Următoarea
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AkyChatWidget enabled />
    </AppShell>
  )
}
