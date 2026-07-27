import { AlertCircle, Check, FileText, Loader2, MessageCircle, Palette, Send, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import ragHeadLogo from "@/assets/logo_RAG_head.png"
import ragLogo from "@/assets/logo_RAG-removebg-preview.png"
import { useAuth } from "@/auth/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { sendAkyCourseQuestion, sendAkyCourseQuestionProfesor } from "@/lib/aky"
import { COURSE_THEME_KEYS, COURSE_THEMES, DEFAULT_COURSE_THEME, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"
import { cn } from "@/lib/utils"
import { isProfessorUser, isStudentUser } from "@/lib/user"
import { listProfessorCourses, listStudentCourses } from "@/lib/professorCourses"

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
  
  const isStudent = isStudentUser(user)
  const isProfessor = isProfessorUser(user)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(courseId)
  const [selectedThemeKey, setSelectedThemeKey] = useState(DEFAULT_COURSE_THEME)
  const selectedTheme = getCourseTheme(selectedThemeKey)

  const activeCourseTitle = courseTitle || courses.find(c => String(c.id) === String(selectedCourseId))?.denumire

  // Chat State
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  // Sync courseId prop to local state
  useEffect(() => {
    setSelectedCourseId(courseId)
  }, [courseId])

  // Reset messages and errors when selected course changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [selectedCourseId])

  // Fetch courses if in global mode
  useEffect(() => {
    if (courseId) return
    async function load() {
      try {
        if (isStudent) {
          const list = await listStudentCourses()
          setCourses(list.map(c => ({ id: c.id, denumire: c.denumire })))
        } else if (isProfessor) {
          const list = await listProfessorCourses()
          setCourses(list.map(c => ({ id: c.id, denumire: c.denumire })))
        }
      } catch (err) {
        console.error("Failed to load courses for Aky", err)
      }
    }
    if (open && courses.length === 0) {
      load()
    }
  }, [courseId, isStudent, isProfessor, open, courses.length])

  // Load saved theme
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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isSending, open])

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setThemePickerOpen(false)
    }
  }

  function handleThemeChange(themeKey) {
    if (!COURSE_THEME_KEYS.has(themeKey)) return
    setSelectedThemeKey(themeKey)
    setThemePickerOpen(false)
    try {
      window.localStorage.setItem(getAkyThemeStorageKey(user), themeKey)
    } catch {
      // Theme applies visually regardless of storage block
    }
  }

  function handleQuickQuestionClick(questionText) {
    if (!enabled || !selectedCourseId || isSending) return
    setDraft(questionText)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const questionText = draft.trim()
    if (!questionText || isSending || !enabled || !selectedCourseId) return

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: questionText,
      timestamp: now,
    }

    // Build history before updating state
    const historyPayload = messages.slice(-10).map((msg) => ({
      sender: msg.sender,
      text: msg.text,
    }))

    setMessages((prev) => [...prev, userMessage])
    setDraft("")
    setIsSending(true)
    setError(null)

    try {
      const chatFunc = isProfessor ? sendAkyCourseQuestionProfesor : sendAkyCourseQuestion;
      const response = await chatFunc(selectedCourseId, {
        intrebare: questionText,
        istoricConversatie: historyPayload,
      })

      const akyMessage = {
        id: `aky-${Date.now()}`,
        sender: "aky",
        text: response.raspuns || response.message || "Răspuns primit de la Aky.",
        surseFolosite: response.surseFolosite || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, akyMessage])
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Ai depășit limita de întrebări pe minut. Te rugăm să aștepți puțin înainte de a încerca din nou.")
      } else if (err.response?.status === 502 || err.response?.status === 503) {
        setError("Serviciul Aky este temporar indisponibil. Te rugăm să încerci din nou mai târziu.")
      } else if (err.response?.status === 404) {
        setError("Modulul Aky de chat pentru acest curs este în pregătire (API 404). Răspunsul va fi disponibil când backend-ul RAG este activat.")
      } else {
        setError(err.response?.data?.eroare || "Nu am putut primi un răspuns de la Aky. Te rugăm să reîncerci.")
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label="Deschide Aky"
        className="fixed right-6 bottom-6 z-40 h-[4.65rem] w-[4.65rem] overflow-hidden rounded-[1.6rem] border border-[#b8d2eb] bg-linear-to-br from-[#edf4fc] via-[#e2eefb] to-[#d3e4f7] p-0 shadow-[0_20px_48px_rgba(32,46,84,0.22)] transition hover:-translate-y-1 hover:shadow-[0_26px_56px_rgba(32,46,84,0.26)]"
      >
        <div className="flex h-full w-full items-center justify-center p-1.5">
          <img src={ragLogo} alt="Aky" className="h-full w-full scale-110 object-contain" />
        </div>
      </Button>

      {/* Slide-over Chat Sheet */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent onOpenChange={handleOpenChange} className="flex flex-col bg-linear-to-b from-[#fffdfa] via-[#fffdfb] to-[#f8fbff] p-0">
          {/* Header */}
          <SheetHeader className={`relative bg-linear-to-r ${selectedTheme.accent} px-6 py-5 text-white shrink-0`}>
            <div className="absolute -top-10 right-[-2rem] h-28 w-28 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -bottom-12 left-[-1.5rem] h-28 w-28 rounded-full bg-[#8bc8f1]/14 blur-sm" />

            {/* Theme Selector */}
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
                          className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-2 py-2 text-left text-sm font-medium transition ${
                            isSelected ? "border-[#7650d8] bg-[#f3edff] text-[#6840c5]" : "border-transparent hover:bg-white/80"
                          }`}
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
                onClick={() => setThemePickerOpen((curr) => !curr)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/32 bg-white/16 text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)] backdrop-blur-sm transition hover:bg-white/24"
              >
                <Palette className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 pr-12">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/12 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]">
                  <img src={ragHeadLogo} alt="Aky" className="h-7 w-7 object-contain" />
                </div>
              </div>
              <div className="relative z-10 min-w-0">
                <SheetTitle className="text-white">Aky</SheetTitle>
                <SheetDescription className="mt-0.5 truncate text-xs text-white/80">
                  {activeCourseTitle ? `Asistent: ${activeCourseTitle}` : "Chatbot Akadion"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Main Body */}
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5 space-y-4">
            {/* Context Notice if Not in Course */}
            {!selectedCourseId ? (
              <Card className="border-[#d9e4f4] bg-linear-to-br from-[#edf7ff] via-[#f8fbff] to-white shadow-[0_12px_32px_rgba(32,46,84,0.06)]">
                <CardContent className="flex flex-col gap-4 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#24385b] text-white shadow-xs">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[#1e3a5f]">Salut! Sunt Aky.</p>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Te pot ajuta cu informații din cursurile tale. Te rog să selectezi un curs pentru a începe conversația.
                      </p>
                    </div>
                  </div>
                  
                  {courses.length > 0 ? (
                    <div className="pt-2">
                      <label className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400 mb-2 block">Alege cursul:</label>
                      <select 
                        className="w-full h-11 rounded-xl border border-[#d9e4f4] bg-white px-3 text-sm text-[#1e3a5f] shadow-sm outline-hidden focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20 transition-all"
                        value={selectedCourseId || ""}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                      >
                        <option value="" disabled>Selectează un curs...</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.denumire}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Nu ești înrolat la niciun curs momentan.</p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Welcome Intro Card if Enabled & No Messages Yet */}
            {selectedCourseId && messages.length === 0 ? (
              <Card className="border-[#d9e4f4] bg-linear-to-br from-[#edf7ff] via-[#f8fbff] to-white shadow-[0_12px_32px_rgba(32,46,84,0.06)]">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#24385b] text-white shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#1e3a5f]">Salut! Sunt Aky.</p>
                      {/* Show button to change course if we are in global mode (courseId prop is null) */}
                      {!courseId && selectedCourseId && (
                        <button 
                          onClick={() => setSelectedCourseId(null)}
                          className="text-[10px] font-bold tracking-[0.1em] text-[#3f698a] uppercase hover:text-[#24385b] transition"
                        >
                          Schimbă cursul
                        </button>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Sunt pregătit să-ți răspund la întrebări pe baza materialelor încărcate la <span className="font-semibold text-slate-800">{activeCourseTitle}</span>. Adresează-mi o întrebare mai jos!
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Quick Questions Chips */}
            {selectedCourseId && messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400">Întrebări rapide</p>
                <div className="flex flex-col gap-2">
                  {QUICK_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleQuickQuestionClick(question)}
                      className="rounded-2xl border border-[#d9e4f4] bg-white/96 px-3.5 py-2.5 text-left text-xs font-medium text-[#3f698a] shadow-xs transition hover:border-[#bfd5eb] hover:bg-[#f4f8fd] hover:text-[#1e3a5f]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Chat Messages */}
            <div className="flex-1 space-y-3">
              {messages.map((msg) => {
                const isUser = msg.sender === "user"

                return (
                  <div key={msg.id} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed shadow-xs",
                        isUser
                          ? "bg-[#24385b] text-white rounded-br-xs"
                          : "border border-[#e4d8cd] bg-white text-slate-800 rounded-bl-xs"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Source document chips if returned by Aky */}
                      {!isUser && msg.surseFolosite && msg.surseFolosite.length > 0 ? (
                        <div className="mt-2.5 border-t border-slate-100 pt-2 space-y-1">
                          <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Surse folosite:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.surseFolosite.map((sursa, idx) => {
                              const docName = typeof sursa === "string" ? sursa : sursa.numeFisier
                              return (
                                <span key={idx} className="inline-flex items-center gap-1 rounded-xl bg-[#f4f8fd] border border-[#d9e4f4] px-2.5 py-1 text-[11px] font-semibold text-[#24385b]">
                                  <FileText className="h-3 w-3 text-[#3b6ea8]" />
                                  <span className="truncate max-w-[140px]">{docName}</span>
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <span className="px-1 text-[10px] font-medium text-slate-400">{msg.timestamp}</span>
                  </div>
                )
              })}

              {/* Typing Indicator */}
              {isSending ? (
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2 rounded-[1.35rem] rounded-bl-xs border border-[#e4d8cd] bg-white px-4 py-3 text-xs text-slate-600 shadow-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-[#24385b]" />
                    <span>Aky analizează materialele cursului...</span>
                  </div>
                </div>
              ) : null}

              {/* Inline Error Notice */}
              {error ? (
                <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <AlertDescription className="text-xs text-rose-800 font-medium">{error}</AlertDescription>
                </Alert>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Footer Input Area */}
          <div className="p-4 bg-white border-t border-[#e4d8cd]/80 shrink-0">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative flex items-center">
                <Input
                  disabled={!enabled || !selectedCourseId || isSending}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    !enabled || !selectedCourseId
                      ? "Selectează un curs pentru a întreba Aky..."
                      : "Adresează o întrebare lui Aky..."
                  }
                  className="h-12 rounded-2xl border-[#e4d8cd] bg-[#fcf8f3] pr-12 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10 disabled:opacity-60"
                />
                <Button
                  type="submit"
                  disabled={!enabled || !selectedCourseId || !draft.trim() || isSending}
                  className={cn(
                    "absolute right-1.5 h-9 w-9 rounded-xl p-0 font-semibold text-white shadow-xs transition",
                    selectedTheme.btnPrimaryBg,
                    "disabled:opacity-40"
                  )}
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-center text-slate-400">
                Aky răspunde pe baza fișierelor și resurselor asociate cursului.
              </p>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
