import { AlertCircle, Check, ChevronLeft, FileText, Loader2, MessageCircle, Palette, Plus, Send, Sparkles, Trash2, RotateCcw, ChevronDown, RefreshCcw, Maximize2, Minimize2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useEffect, useRef, useState } from "react"
import ragHeadLogo from "@/assets/logo_RAG_head.png"
import ragLogo from "@/assets/logo_RAG-removebg-preview.png"
import { useAuth } from "@/auth/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { adaugaMesaj, creareConversatieSiMesaj, getConversatii, getConversatiiGlobale, getIstoric, stergeConversatie, retryMesaj, getDocumenteAccesibile, genereazaQuiz } from "@/lib/conversatii"
import { COURSE_THEME_KEYS, COURSE_THEMES, DEFAULT_COURSE_THEME, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"
import { listProfessorCourses, listStudentCourses } from "@/lib/professorCourses"
import { isAdminUser, isProfessorUser, isStudentUser } from "@/lib/user"
import { cn } from "@/lib/utils"

const QUICK_QUESTIONS = [
  "Ce materiale sunt disponibile la acest curs?",
  "Cum sunt structurate săptămânile de curs?",
  "Care este tematica principală a cursului?",
]

const AKY_THEME_STORAGE_PREFIX = "akadion:aky-theme"

function getAkyThemeStorageKey(user) {
  return `${AKY_THEME_STORAGE_PREFIX}:${getThemeUserKey(user)}`
}

export default function AkyChatWidget({ courseId = null, courseTitle = null, enabled = true }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const isAdmin = isAdminUser(user)
  const isStudent = isStudentUser(user)
  const isProfessor = isProfessorUser(user)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(courseId)

  // Theme state
  const [selectedThemeKey, setSelectedThemeKey] = useState(DEFAULT_COURSE_THEME)
  const selectedTheme = getCourseTheme(selectedThemeKey)
  const activeCourseTitle = courseTitle || courses.find((course) => String(course.id) === String(selectedCourseId))?.denumire

  // Chat & History state
  const [conversatii, setConversatii] = useState([])
  const [convPage, setConvPage] = useState(0)
  const [hasMoreConversations, setHasMoreConversations] = useState(false)
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false)

  const [view, setView] = useState("list") // "list" | "chat"
  const [selectedConversationId, setSelectedConversationId] = useState(null)

  const [messages, setMessages] = useState([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [oldestLoadedMessageId, setOldestLoadedMessageId] = useState(null)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)

  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const messagesEndRef = useRef(null)

  const [filterMode, setFilterMode] = useState("course") // "course" | "all"

  // Quiz states
  const [quizMode, setQuizMode] = useState(false)
  const [accessibleDocuments, setAccessibleDocuments] = useState([])
  const [selectedQuizDocId, setSelectedQuizDocId] = useState("")
  const [isQuizLoading, setIsQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState({}) // { idx: { selectedOption, isCorrect } }
  const [quizNumQuestions, setQuizNumQuestions] = useState(5)

  async function loadAccessibleDocuments() {
    if (!selectedCourseId) return
    try {
      const docs = await getDocumenteAccesibile(selectedCourseId)
      setAccessibleDocuments(docs || [])
    } catch (err) {
      console.error("Nu s-au putut încărca documentele accesibile pentru quiz", err)
    }
  }

  useEffect(() => {
    if (open && selectedCourseId) {
      loadAccessibleDocuments()
    }
  }, [open, selectedCourseId])

  function toggleQuizMode() {
    if (!selectedCourseId) return
    const nextMode = !quizMode
    setQuizMode(nextMode)
    if (nextMode) {
      loadAccessibleDocuments()
    }
  }

  async function handleStartQuiz() {
    if (!selectedCourseId) return
    setIsQuizLoading(true)
    setQuizError(null)
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnsweredQuestions({})

    try {
      const docId = selectedQuizDocId ? Number(selectedQuizDocId) : null
      const data = await genereazaQuiz(selectedCourseId, docId, quizNumQuestions)
      if (Array.isArray(data) && data.length > 0) {
        setQuizQuestions(data)
      } else {
        setQuizError("Gemini nu a putut returna întrebări structurate corect. Te rugăm să reîncerci.")
      }
    } catch (err) {
      console.error("Eroare la generare quiz", err)
      const errorMsg = err.response?.data?.eroare || err.response?.data?.detail || "Nu am putut genera quiz-ul. Te rugăm să verifici conexiunea sau indexarea documentelor."
      setQuizError(errorMsg)
    } finally {
      setIsQuizLoading(false)
    }
  }

  function handleAnswerClick(optionKey) {
    if (answeredQuestions[currentQuestionIndex] !== undefined) return;

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = currentQuestion.raspuns_corect === optionKey;

    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        selectedOption: optionKey,
        isCorrect: isCorrect
      }
    }));
  }

  function getQuizScore() {
    return Object.values(answeredQuestions).filter(ans => ans.isCorrect).length;
  }

  function handleResetQuiz() {
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setAnsweredQuestions({});
    setQuizError(null);
  }

  useEffect(() => {
    setSelectedCourseId(courseId)
    setFilterMode("course")
    setQuizMode(false)
    handleResetQuiz()
  }, [courseId])

  async function fetchConversations(pageToLoad = 0, append = false, overrideFilter = null) {
    const activeFilter = overrideFilter || filterMode
    try {
      if (append) {
        setIsLoadingMoreConversations(true)
      } else {
        setIsLoadingConversations(true)
      }

      let res = (courseId && activeFilter === "course")
        ? await getConversatii(courseId, pageToLoad)
        : await getConversatiiGlobale(pageToLoad)

      let items = Array.isArray(res) ? res : (res?.continut || [])
      let hasMore = res?.areUrmatoarea ?? false

      // dacă suntem pe un curs nou fără conversații proprii, dar utilizatorul are conversații în cont,
      // comutăm automat pe tab-ul "Toate" pentru ca utilizatorul să își vadă istoricul general
      if (!append && pageToLoad === 0 && courseId && activeFilter === "course" && items.length === 0) {
        const globalRes = await getConversatiiGlobale(0)
        const globalItems = Array.isArray(globalRes) ? globalRes : (globalRes?.continut || [])
        if (globalItems.length > 0) {
          items = globalItems
          hasMore = globalRes?.areUrmatoarea ?? false
          setFilterMode("all")
        }
      }

      setConversatii((prev) => (append ? [...prev, ...items] : items))
      setHasMoreConversations(hasMore)
      setConvPage(pageToLoad)
    } catch (err) {
      console.error("Failed to load conversations", err)
    } finally {
      setIsLoadingConversations(false)
      setIsLoadingMoreConversations(false)
    }
  }

  // Load conversations
  useEffect(() => {
    if (!open) return

    setMessages([])
    setError(null)
    setConversatii([])
    setSelectedConversationId(null)
    setView("list")
    setConvPage(0)
    setHasMoreConversations(false)
    setHasMoreMessages(false)
    setOldestLoadedMessageId(null)

    // Reset course selection if it's the global widget
    if (!courseId) {
      setSelectedCourseId(null)
    } else {
      setSelectedCourseId(courseId)
    }

    fetchConversations(0, false)
  }, [open, courseId])

  // Load courses if none are passed
  useEffect(() => {
    if (courseId) {
      return
    }

    async function loadCourses() {
      try {
        if (isStudent) {
          const nextCourses = await listStudentCourses()
          setCourses(nextCourses.map((course) => ({ id: course.id, denumire: course.denumire })))
          return
        }

        if (isProfessor) {
          const nextCourses = await listProfessorCourses()
          setCourses(nextCourses.map((course) => ({ id: course.id, denumire: course.denumire })))
        }
      } catch (loadError) {
        console.error("Failed to load courses for Aky", loadError)
      }
    }

    if (open && courses.length === 0) {
      loadCourses()
    }
  }, [courseId, courses.length, isProfessor, isStudent, open])

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(getAkyThemeStorageKey(user))
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
    if (open && view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [isSending, messages, open, view])

  if (isAdmin) {
    return null
  }

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setThemePickerOpen(false)
      setQuizMode(false)
      handleResetQuiz()
    }
  }

  function handleThemeChange(themeKey) {
    if (!COURSE_THEME_KEYS.has(themeKey)) {
      return
    }

    setSelectedThemeKey(themeKey)
    setThemePickerOpen(false)
    try {
      window.localStorage.setItem(getAkyThemeStorageKey(user), themeKey)
    } catch {
      // Theme still applies in memory even if persistence is blocked.
    }
  }

  async function handleOpenConversation(convId, cursId) {
    setSelectedConversationId(convId)
    if (cursId) {
      setSelectedCourseId(cursId)
    }
    setView("chat")
    setMessages([])
    setError(null)
    setHasMoreMessages(false)
    setOldestLoadedMessageId(null)

    try {
      setIsLoadingMessages(true)
      const res = await getIstoric(convId)
      const msgList = Array.isArray(res) ? res : (res?.mesaje || [])
      setMessages(msgList)
      setHasMoreMessages(res?.areMaiMulte ?? false)
      setOldestLoadedMessageId(res?.celMaiVechiIdIncarcat ?? null)
    } catch (err) {
      setError("Nu s-a putut încărca istoricul conversației.")
    } finally {
      setIsLoadingMessages(false)
    }
  }

  async function loadOlderMessages() {
    if (!selectedConversationId || !hasMoreMessages || !oldestLoadedMessageId || isLoadingOlderMessages) return

    try {
      setIsLoadingOlderMessages(true)
      const res = await getIstoric(selectedConversationId, oldestLoadedMessageId)
      const olderMsgs = Array.isArray(res) ? res : (res?.mesaje || [])
      setMessages((prev) => [...olderMsgs, ...prev])
      setHasMoreMessages(res?.areMaiMulte ?? false)
      setOldestLoadedMessageId(res?.celMaiVechiIdIncarcat ?? null)
    } catch (err) {
      console.error("Nu s-au putut încărca mesajele anterioare", err)
    } finally {
      setIsLoadingOlderMessages(false)
    }
  }

  function handleScrollConversations(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (hasMoreConversations && !isLoadingMoreConversations && scrollHeight - scrollTop - clientHeight < 60) {
      fetchConversations(convPage + 1, true)
    }
  }

  function handleScrollMessages(event) {
    const { scrollTop } = event.currentTarget
    if (hasMoreMessages && !isLoadingOlderMessages && scrollTop < 40) {
      loadOlderMessages()
    }
  }

  async function fetchLatestMessages(convId) {
    if (!convId) return
    try {
      const res = await getIstoric(convId)
      const msgList = Array.isArray(res) ? res : (res?.mesaje || [])
      setMessages(msgList)
      setHasMoreMessages(res?.areMaiMulte ?? false)
      setOldestLoadedMessageId(res?.celMaiVechiIdIncarcat ?? null)
    } catch (err) {
      console.error(err)
    }
  }

  function handleNewConversation() {
    setSelectedConversationId(null)
    if (!courseId) {
      setSelectedCourseId(null)
    }
    setMessages([])
    setError(null)
    setHasMoreMessages(false)
    setOldestLoadedMessageId(null)
    setView("chat")
  }

  async function handleDeleteConversation(convId, e) {
    e.stopPropagation()
    try {
      await stergeConversatie(convId)
      setConversatii((prev) => prev.filter((c) => c.id !== convId))
      if (selectedConversationId === convId) {
        setView("list")
      }
    } catch (err) {
      console.error("Nu s-a putut sterge conversatia", err)
    }
  }

  function handleQuickQuestionClick(questionText) {
    if (!enabled || !selectedCourseId || isSending) {
      return
    }

    setDraft(questionText)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const questionText = draft.trim()

    if (!questionText || isSending || !enabled || !selectedCourseId) {
      return
    }

    const now = new Date()
    const userMessage = {
      id: `user-${Date.now()}`,
      rol: "UTILIZATOR",
      continut: questionText,
      createdAt: now.toISOString(),
    }

    setMessages((current) => [...current, userMessage])
    setDraft("")
    setIsSending(true)
    setError(null)

    try {
      let response;
      if (!selectedConversationId) {
        // Creare conversatie noua
        response = await creareConversatieSiMesaj(selectedCourseId, questionText)
        const newConvId = response.conversatieId
        setSelectedConversationId(newConvId)

        // Refresh conversatii list in background
        fetchConversations(0, false)
        fetchLatestMessages(newConvId)
      } else {
        // Conversatie existenta
        response = await adaugaMesaj(selectedConversationId, questionText)
        fetchLatestMessages(selectedConversationId)
      }
    } catch (err) {
      console.error("Nu s-a putut trimite mesajul:", err)

      if (selectedConversationId) {
        fetchLatestMessages(selectedConversationId)
      }

      if (err.response?.status === 429) {
        setError("Ai depășit limita de întrebări pe minut. Te rugăm să aștepți puțin înainte de a încerca din nou.")
      } else if (err.response?.status === 502 || err.response?.status === 503) {
        setError("Serviciul Aky este temporar indisponibil. Te rugăm să încerci din nou mai târziu.")
      } else if (err.response?.status === 404) {
        setError("Modulul Aky de chat pentru acest curs este în pregătire (API 404). Răspunsul va fi disponibil când backend-ul RAG este activat.")
      } else {
        setError(err.response?.data?.eroare || "Nu am putut primi un răspuns de la Aky. Te rugăm să reîncerci.")
      }

      if (selectedConversationId) {
        fetchLatestMessages(selectedConversationId)
      } else {
        setMessages((current) => current.filter((m) => m.id !== userMessage.id))
      }
    } finally {
      setIsSending(false)
    }
  }

  async function handleRetry(mesajId) {
    if (!enabled || isSending) return
    setIsSending(true)
    setError(null)

    try {
      await retryMesaj(mesajId)
      await fetchLatestMessages(selectedConversationId)
    } catch (err) {
      console.error("Eroare la retry:", err)
      setError("Aky nu a putut răspunde nici de această dată. Te rog încearcă mai târziu.")
    } finally {
      setIsSending(false)
    }
  }

  function formatTime(isoString) {
    if (!isoString) return ""
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  function formatDate(isoString) {
    if (!isoString) return ""
    return new Date(isoString).toLocaleDateString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label="Deschide Aky"
        className="fixed right-6 bottom-6 z-40 h-[4.65rem] w-[4.65rem] overflow-hidden rounded-[1.6rem] border border-[#b8d2eb] bg-linear-to-br from-[#edf4fc] via-[#e2eefb] to-[#d3e4f7] p-0 shadow-[0_20px_48px_rgba(32,46,84,0.22)] transition hover:-translate-y-1 hover:shadow-[0_26px_56px_rgba(32,46,84,0.26)]"
      >
        <div className="flex h-full w-full items-center justify-center p-1.5">
          <img src={ragLogo} alt="Aky" className="h-full w-full object-contain scale-110" />
        </div>
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          onOpenChange={handleOpenChange}
          className={cn(
            "flex bg-linear-to-b from-[#fffdfa] via-[#fffdfb] to-[#f8fbff] p-0 w-full transition-all duration-300",
            quizMode ? "sm:max-w-[62vw] flex-row" : "sm:max-w-xl flex-col"
          )}
        >
          {/* STÂNGA: Chat-ul existent */}
          <div className={cn("flex flex-col flex-1 h-full min-w-[350px]", quizMode && "sm:max-w-[45%] border-r border-slate-200/80")}>
            <SheetHeader className={`relative bg-linear-to-r ${selectedTheme.accent} text-white`}>
              <div className="absolute -top-10 right-[-2rem] h-28 w-28 rounded-full bg-white/10 blur-sm" />
              <div className="absolute -bottom-12 left-[-1.5rem] h-28 w-28 rounded-full bg-[#8bc8f1]/14 blur-sm" />

              {/* Quiz Toggle Button */}
              {selectedCourseId && (
                <div className="absolute right-28 top-4 z-20">
                  <button
                    type="button"
                    aria-label="Generare Quiz"
                    onClick={toggleQuizMode}
                    className={cn(
                      "flex h-10 items-center justify-center gap-1.5 px-3 rounded-2xl border text-xs font-semibold shadow-[0_10px_22px_rgba(15,23,42,0.14)] backdrop-blur-sm transition",
                      quizMode
                        ? "border-amber-300 bg-amber-400/20 text-amber-200 hover:bg-amber-400/30"
                        : "border-white/32 bg-white/16 text-white hover:bg-white/24"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Quiz-uri</span>
                  </button>
                </div>
              )}

              <div className="absolute right-16 top-4 z-20">
                {themePickerOpen ? (
                  <div className="absolute right-0 top-12 w-40 rounded-[1.35rem] border border-[#d9c9ff] bg-[#fbf8ff]/98 p-2.5 text-[#3a2e66] shadow-[0_18px_48px_rgba(62,42,120,0.2)] backdrop-blur-md">
                    <p className="px-2 pb-2 text-[0.68rem] font-semibold tracking-[0.14em] text-[#6c5c9a] uppercase">Tema</p>
                    <div className="space-y-1">
                      {COURSE_THEMES.map((theme) => {
                        const isSelected = theme.key === selectedTheme.key

                        return (
                          <button
                            key={theme.key}
                            type="button"
                            onClick={() => handleThemeChange(theme.key)}
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
                  aria-label="Schimbă tema Aky"
                  onClick={() => setThemePickerOpen((currentValue) => !currentValue)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/32 bg-white/16 text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)] backdrop-blur-sm transition hover:bg-white/24"
                >
                  <Palette className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 pr-44 relative z-10 pt-2 pb-1">
                {view === "chat" && (
                  <button
                    onClick={() => {
                      if (!courseId) setSelectedCourseId(null)
                      setView("list")
                      fetchConversations(0, false)
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12 backdrop-blur-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]">
                    <img src={ragHeadLogo} alt="Aky" className="h-7 w-7 object-contain" />
                  </div>
                </div>

                <div className="min-w-0">
                  <SheetTitle className="text-white text-lg">Aky</SheetTitle>
                  <SheetDescription className="mt-0.5 truncate text-white/80 text-sm">
                    {activeCourseTitle ? `Asistent: ${activeCourseTitle}` : "Chatbot Akadion"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50/50">
              {/* NO COURSE SELECTED (SELECT COURSE VIEW) */}
              {!selectedCourseId && view === "chat" ? (
                <div className="p-6">
                  <Card className="border-[#d9e4f4] bg-linear-to-br from-[#edf7ff] via-[#f8fbff] to-white shadow-[0_18px_40px_rgba(32,46,84,0.08)]">
                    <CardContent className="space-y-4 px-5 py-5">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br ${selectedTheme.accent} ${selectedTheme.heroBorder} ${selectedTheme.heroStatText} shadow-[0_12px_24px_rgba(24,49,83,0.14)]`}>
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#24385b]">Salut! Sunt Aky.</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Te pot ajuta cu informații din cursurile tale. Te rog să selectezi un curs pentru a începe conversația.
                          </p>
                        </div>
                      </div>

                      {courses.length > 0 ? (
                        <div className="pt-2">
                          <label className="mb-2 block text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Alege cursul:</label>
                          <select
                            className="h-11 w-full rounded-xl border border-[#d9e4f4] bg-white px-3 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20"
                            value={selectedCourseId || ""}
                            onChange={(event) => setSelectedCourseId(event.target.value)}
                          >
                            <option value="" disabled>Selectează un curs...</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>{course.denumire}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-xs italic text-slate-500">Nu ești înrolat la niciun curs momentan.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {/* CONVERSATION LIST VIEW */}
              {view === "list" && (
                <div className="flex flex-col h-full">
                  <div className="p-6 pb-2">
                    <Button
                      onClick={handleNewConversation}
                      className={`w-full h-12 rounded-2xl bg-linear-to-r ${selectedTheme.accent} text-white shadow-md flex items-center justify-center gap-2`}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Începe o conversație nouă</span>
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3" onScroll={handleScrollConversations}>
                    <div className="flex items-center justify-between px-1 pb-1">
                      <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Istoric Conversații</h3>
                      {courseId ? (
                        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterMode("course")
                              fetchConversations(0, false, "course")
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${filterMode === "course"
                              ? "bg-white text-[#1e3a5f] shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                              }`}
                          >
                            Acest curs
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFilterMode("all")
                              fetchConversations(0, false, "all")
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${filterMode === "all"
                              ? "bg-white text-[#1e3a5f] shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                              }`}
                          >
                            Toate
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isLoadingConversations ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                      </div>
                    ) : conversatii.length === 0 ? (
                      <div className="text-center py-8 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
                        <MessageCircle className="h-9 w-9 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700">
                          {courseId && filterMode === "course"
                            ? "Nu ai conversații anterioare la acest curs."
                            : "Nu ai nicio conversație anterioară."}
                        </p>
                        {courseId && filterMode === "course" ? (
                          <p className="text-xs text-slate-400 pb-1">
                            Poți adresa prima întrebare la butonul de mai sus sau poți comuta pe separatoarea "Toate" pentru a vedea conversațiile de la celelalte cursuri.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conversatii.map(conv => {
                          const cursNume = courses.find(c => String(c.id) === String(conv.cursId))?.denumire
                          return (
                            <div
                              key={conv.id}
                              onClick={() => handleOpenConversation(conv.id, conv.cursId)}
                              className="group relative flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-[#bfd5eb] hover:shadow-md transition-all cursor-pointer overflow-hidden"
                            >
                              <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-linear-to-br ${selectedTheme.accent} opacity-10`} />
                              <div className={`absolute left-4 h-10 w-10 shrink-0 flex items-center justify-center ${selectedTheme.heroStatText}`}>
                                <MessageCircle className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#1e3a5f] truncate pr-8">{conv.titlu || "Conversație nouă"}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-slate-400">{formatDate(conv.createdAt)}</p>
                                  {!courseId && cursNume && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                                      <p className="text-[11px] font-medium text-[#3b6ea8] truncate">{cursNume}</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                className="absolute right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Șterge conversația"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {hasMoreConversations ? (
                      <div className="pt-3 pb-2 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fetchConversations(convPage + 1, true)}
                          disabled={isLoadingMoreConversations}
                          className="rounded-xl border-[#d9e4f4] text-xs font-semibold text-[#24385b] hover:bg-[#f4f8fd]"
                        >
                          {isLoadingMoreConversations ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Se încarcă mai multe conversații...
                            </>
                          ) : (
                            "Încarcă mai multe conversații"
                          )}
                        </Button>
                      </div>
                    ) : conversatii.length > 0 ? (
                      <p className="pt-3 pb-2 text-center text-xs font-medium text-slate-400">
                        — Toate cele {conversatii.length} conversații sunt afișate —
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* CHAT VIEW */}
              {selectedCourseId && view === "chat" && (
                <>
                  <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5" onScroll={handleScrollMessages}>
                    {messages.length === 0 && !isLoadingMessages ? (
                      <>
                        <Card className="border-[#d9e4f4] bg-linear-to-br from-[#edf7ff] via-[#f8fbff] to-white shadow-[0_18px_40px_rgba(32,46,84,0.08)] mb-6">
                          <CardContent className="space-y-4 px-5 py-5">
                            <div className="flex items-start gap-3">
                              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br ${selectedTheme.accent} ${selectedTheme.heroBorder} ${selectedTheme.heroStatText} shadow-[0_12px_24px_rgba(24,49,83,0.14)]`}>
                                <Sparkles className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[#24385b] text-base sm:text-lg">Salut! Sunt Aky.</p>
                                <p className="mt-1 text-base leading-relaxed text-slate-600">
                                  Sunt pregătit să-ți răspund la întrebări pe baza materialelor de la <span className="font-semibold text-slate-800">{activeCourseTitle}</span>. Adresează-mi o întrebare mai jos!
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="space-y-3">
                          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Întrebări rapide</p>
                          <div className="flex flex-wrap gap-2">
                            {QUICK_QUESTIONS.map((question) => (
                              <button
                                key={question}
                                type="button"
                                onClick={() => handleQuickQuestionClick(question)}
                                className="rounded-2xl border border-[#d9e4f4] bg-white px-3.5 py-2.5 text-left text-base text-[#3f698a] shadow-xs transition hover:border-[#bfd5eb] hover:bg-[#f4f8fd]"
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {isLoadingMessages ? (
                      <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <div className="flex-1 space-y-4">
                        {hasMoreMessages ? (
                          <div className="pb-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={loadOlderMessages}
                              disabled={isLoadingOlderMessages}
                              className="rounded-xl text-xs font-semibold text-[#3b6ea8] hover:bg-[#f4f8fd]"
                            >
                              {isLoadingOlderMessages ? (
                                <>
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                  Se încarcă mesajele mai vechi...
                                </>
                              ) : (
                                "Încărcare mesaje mai vechi"
                              )}
                            </Button>
                          </div>
                        ) : messages.length > 0 ? (
                          <p className="pb-2 text-center text-[11px] font-medium text-slate-400">
                            — Începutul conversației —
                          </p>
                        ) : null}
                        {messages.map((message) => {
                          const isUser = message.rol === "UTILIZATOR"

                          return (
                            <div key={message.id} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-[1.35rem] px-4 py-3 text-base sm:text-lg leading-relaxed shadow-xs",
                                  isUser
                                    ? "rounded-br-xs bg-[#24385b] text-white"
                                    : "rounded-bl-xs border border-[#e4d8cd] bg-white text-slate-800"
                                )}
                              >
                                <div className="whitespace-pre-wrap font-sans text-base sm:text-lg markdown-body">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.continut}
                                  </ReactMarkdown>
                                </div>

                                {!isUser && message.surseFolosite ? (
                                  <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2">
                                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Surse folosite:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {message.surseFolosite.split(",").filter(Boolean).map((sourceItem, index) => {
                                        const parts = sourceItem.split("|");
                                        const sourceId = parts[0];
                                        const sourceName = parts.length > 1 ? parts[1] : `Document ${sourceId}`;
                                        return (
                                          <span key={index} className="inline-flex items-center gap-1 rounded-xl border border-[#d9e4f4] bg-[#f4f8fd] px-2.5 py-1 text-[11px] font-semibold text-[#24385b]">
                                            <FileText className="h-3 w-3 text-[#3b6ea8]" />
                                            <span className="max-w-[140px] truncate">{sourceName}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 px-1">
                                {isUser && message.areRaspuns === false && (
                                  <div className="flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                                    <span className="text-[10px] font-medium text-rose-500">Nu s-a putut răspunde</span>
                                    <button
                                      onClick={() => handleRetry(message.id)}
                                      className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 transition-colors"
                                    >
                                      <RotateCcw className="h-3 w-3" /> Retry
                                    </button>
                                  </div>
                                )}
                                <span className="text-[10px] font-medium text-slate-400">{formatTime(message.createdAt)}</span>
                              </div>
                            </div>
                          )
                        })}

                        {isSending ? (
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-2 rounded-[1.35rem] rounded-bl-xs border border-[#e4d8cd] bg-white px-4 py-3 text-sm sm:text-base text-slate-600 shadow-xs">
                              <Loader2 className="h-4 w-4 animate-spin text-[#24385b]" />
                              <span>Aky analizează materialele cursului...</span>
                            </div>
                          </div>
                        ) : null}

                        {error ? (
                          <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90 px-4 py-3">
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <AlertDescription className="text-sm sm:text-base font-medium text-rose-800">{error}</AlertDescription>
                          </Alert>
                        ) : null}

                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <div className="mt-auto p-6 pt-2 bg-white/50 backdrop-blur-md border-t border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="rounded-[1.6rem] border border-[#d9e4f4] bg-white p-2 shadow-sm transition-shadow focus-within:shadow-md">
                        <div className="flex items-end gap-2">
                          <Input
                            disabled={!enabled || !selectedCourseId || isSending}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder="Scrie întrebarea ta pentru Aky..."
                            className="h-12 flex-1 rounded-2xl border-0 bg-transparent px-4 text-slate-700 text-base sm:text-lg shadow-none focus-visible:ring-0 disabled:opacity-60 placeholder:text-slate-400"
                          />
                          <Button
                            type="submit"
                            disabled={!enabled || !selectedCourseId || !draft.trim() || isSending}
                            className={`h-12 w-12 shrink-0 rounded-2xl bg-linear-to-r ${selectedTheme.accent} p-0 text-white shadow-md disabled:opacity-40 transition-transform active:scale-95`}
                          >
                            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* DREAPTA: Quiz-ul (dacă e activ) */}
          {quizMode && (
            <div className="flex flex-col flex-1 h-full min-w-[360px] border-l border-slate-200/80 bg-white">
              {/* Header-ul panoului de Quiz */}
              <div className={`p-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r ${selectedTheme.accent} text-white`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                  <div>
                    <h4 className="font-semibold text-base sm:text-lg">Teste Grilă Akadion</h4>
                    <p className="text-xs text-white/80">Gemini îți evaluează cunoștințele din curs</p>
                  </div>
                </div>
                <button
                  onClick={() => setQuizMode(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                >
                  <Minimize2 className="h-5 w-5" />
                </button>
              </div>

              {/* Sursă și acțiuni */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-sm font-bold tracking-wider text-slate-500 uppercase">Sursa de întrebări:</label>
                    <select
                      disabled={isQuizLoading}
                      value={selectedQuizDocId}
                      onChange={(e) => setSelectedQuizDocId(e.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-base sm:text-lg text-slate-700 outline-none focus:border-[#8bc8f1] transition-all"
                    >
                      <option value="">Toată materia parcursă (până în prezent)</option>
                      {accessibleDocuments.map((doc) => (
                        <option key={doc.documentId} value={doc.documentId}>
                          📄 {doc.numeFisier}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex flex-col gap-1.5">
                    <label className="text-sm font-bold tracking-wider text-slate-500 uppercase">Întrebări:</label>
                    <select
                      disabled={isQuizLoading}
                      value={quizNumQuestions}
                      onChange={(e) => setQuizNumQuestions(Number(e.target.value))}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-base sm:text-lg text-slate-700 outline-none focus:border-[#8bc8f1] transition-all"
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                    </select>
                  </div>
                </div>

                <Button
                  disabled={isQuizLoading}
                  onClick={handleStartQuiz}
                  className={cn(
                    "w-full h-12 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm text-white bg-linear-to-r",
                    selectedTheme.accent
                  )}
                >
                  {isQuizLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Se generează quiz-ul...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4" />
                      <span>Generează Quiz Nou</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Conținut Quiz */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isQuizLoading && (
                  <div className="flex flex-col items-center justify-center h-full space-y-3 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3b6ea8]" />
                    <p className="text-sm sm:text-base font-semibold text-slate-500 animate-pulse">Se citește materia și se pregătesc întrebările...</p>
                  </div>
                )}

                {!isQuizLoading && quizError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-2">
                    <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                    <p className="text-sm sm:text-base font-semibold text-rose-800">{quizError}</p>
                    <p className="text-xs sm:text-sm text-slate-500">Asigură-te că există documente încărcate și indexate în săptămânile parcurse de tine la acest curs.</p>
                  </div>
                )}

                {!isQuizLoading && !quizError && quizQuestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-500">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h5 className="font-bold text-base sm:text-lg text-slate-700">Verifică-ți cunoștințele!</h5>
                    <p className="text-sm sm:text-base text-slate-500 max-w-xs">
                      Alege o sursă și apasă pe butonul de mai sus pentru a genera un test grilă cu feedback instantaneu de la Gemini.
                    </p>
                  </div>
                )}

                {!isQuizLoading && !quizError && quizQuestions.length > 0 && (
                  <div className="space-y-5">
                    {/* Scorul și Progresul */}
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-400 uppercase">
                      <span>Întrebarea {currentQuestionIndex + 1} din {quizQuestions.length}</span>
                      <span>Scor: {getQuizScore()} / {Object.keys(answeredQuestions).length}</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3b6ea8] transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                      />
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                      <p className="text-xl sm:text-2xl font-bold text-slate-800 leading-snug">
                        {quizQuestions[currentQuestionIndex].intrebare}
                      </p>
                    </div>

                    {/* Opțiunile de răspuns */}
                    <div className="space-y-3">
                      {Object.entries(quizQuestions[currentQuestionIndex].optiuni || {}).map(([key, value]) => {
                        const isAnswered = answeredQuestions[currentQuestionIndex] !== undefined;
                        const questionState = answeredQuestions[currentQuestionIndex];
                        const isThisOptionSelected = questionState?.selectedOption === key;
                        const isThisOptionCorrect = quizQuestions[currentQuestionIndex].raspuns_corect === key;

                        let buttonStyle = "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50";
                        let iconBadge = null;

                        if (isAnswered) {
                          if (isThisOptionCorrect) {
                            buttonStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold shadow-xs";
                            iconBadge = <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5" /></div>;
                          } else if (isThisOptionSelected && !isThisOptionCorrect) {
                            buttonStyle = "border-rose-300 bg-rose-50 text-rose-800 font-semibold shadow-xs";
                            iconBadge = <div className="h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0"><AlertCircle className="h-3.5 w-3.5" /></div>;
                          } else {
                            buttonStyle = "border-slate-100 bg-white text-slate-400 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={key}
                            disabled={isAnswered}
                            onClick={() => handleAnswerClick(key)}
                            className={cn(
                              "w-full text-left p-4 sm:p-5 rounded-2xl border text-base sm:text-lg font-medium flex items-start gap-4 transition-all",
                              buttonStyle
                            )}
                          >
                            <span className={cn(
                              "h-9 w-9 rounded-xl border font-bold flex items-center justify-center shrink-0 text-base sm:text-lg",
                              isAnswered ? "border-transparent bg-slate-100 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-600"
                            )}>
                              {key}
                            </span>
                            <span className="flex-1 mt-0.5 leading-relaxed">{value}</span>
                            {iconBadge}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explicația */}
                    {answeredQuestions[currentQuestionIndex] !== undefined && (
                      <div className="p-6 bg-blue-50/70 border border-blue-100/60 rounded-2xl space-y-2.5">
                        <p className="text-sm font-bold tracking-wider text-blue-700 uppercase">Explicație:</p>
                        <p className="text-base sm:text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {quizQuestions[currentQuestionIndex].explicatie}
                        </p>
                      </div>
                    )}

                    {/* Navigare */}
                    {answeredQuestions[currentQuestionIndex] !== undefined && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          disabled={currentQuestionIndex === 0}
                          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                          className="flex-1 h-10 rounded-xl text-xs font-semibold text-slate-600 border-slate-200"
                        >
                          Înapoi
                        </Button>
                        {currentQuestionIndex < quizQuestions.length - 1 ? (
                          <Button
                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            className={cn(
                              "flex-1 h-10 rounded-xl text-xs font-semibold text-white bg-linear-to-r",
                              selectedTheme.accent
                            )}
                          >
                            Următoarea
                          </Button>
                        ) : (
                          <Button
                            onClick={handleResetQuiz}
                            className="flex-1 h-10 rounded-xl text-xs font-semibold text-white bg-linear-to-r from-amber-500 to-orange-600"
                          >
                            Finalizează & Reset
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
