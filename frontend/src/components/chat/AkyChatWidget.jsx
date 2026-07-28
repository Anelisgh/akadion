import { AlertCircle, Check, ChevronLeft, FileText, Loader2, MessageCircle, Palette, Plus, Send, Sparkles, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import ragHeadLogo from "@/assets/logo_RAG_head.png"
import ragLogo from "@/assets/logo_RAG-removebg-preview.png"
import { useAuth } from "@/auth/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { adaugaMesaj, creareConversatieSiMesaj, getConversatii, getIstoric, stergeConversatie } from "@/lib/conversatii"
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
  const [view, setView] = useState("list") // "list" | "chat"
  const [selectedConversationId, setSelectedConversationId] = useState(null)
  
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    setSelectedCourseId(courseId)
  }, [courseId])

  // Load conversations
  useEffect(() => {
    if (!open) return

    setMessages([])
    setError(null)
    setConversatii([])
    setSelectedConversationId(null)
    
    // Reset course selection if it's the global widget
    if (!courseId) {
      setSelectedCourseId(null)
    } else {
      setSelectedCourseId(courseId)
    }
    
    async function fetchConversations() {
      try {
        setIsLoadingConversations(true)
        const data = courseId ? await getConversatii(courseId) : await getConversatiiGlobale()
        setConversatii(data)
        
        if (data.length === 0) {
          setView("chat") // Skip empty list
        } else {
          setView("list")
        }
      } catch (err) {
        console.error("Failed to load conversations", err)
      } finally {
        setIsLoadingConversations(false)
      }
    }
    
    fetchConversations()
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
    try {
      setIsLoadingMessages(true)
      const data = await getIstoric(convId)
      setMessages(data)
    } catch (err) {
      setError("Nu s-a putut încărca istoricul conversației.")
    } finally {
      setIsLoadingMessages(false)
    }
  }
  
  function handleNewConversation() {
    setSelectedConversationId(null)
    if (!courseId) {
      setSelectedCourseId(null)
    }
    setMessages([])
    setError(null)
    setView("chat")
  }
  
  async function handleDeleteConversation(convId, e) {
    e.stopPropagation()
    try {
      await stergeConversatie(convId)
      setConversatii((prev) => prev.filter(c => c.id !== convId))
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
        setSelectedConversationId(response.conversatieId)
        
        // Refresh conversatii list in background
        const refreshPromise = courseId ? getConversatii(courseId) : getConversatiiGlobale()
        refreshPromise.then(data => setConversatii(data)).catch(() => {})
        
        const akyMessage = response.raspuns
        setMessages((current) => [...current, akyMessage])
      } else {
        // Adaugare la conversatie existenta
        response = await adaugaMesaj(selectedConversationId, questionText)
        const akyMessage = response
        setMessages((current) => [...current, akyMessage])
      }

    } catch (requestError) {
      if (requestError.response?.status === 429) {
        setError("Ai depășit limita de întrebări pe minut. Te rugăm să aștepți puțin înainte de a încerca din nou.")
      } else if (requestError.response?.status === 502 || requestError.response?.status === 503) {
        setError("Serviciul Aky este temporar indisponibil. Te rugăm să încerci din nou mai târziu.")
      } else if (requestError.response?.status === 404) {
        setError("Modulul Aky de chat pentru acest curs este în pregătire (API 404). Răspunsul va fi disponibil când backend-ul RAG este activat.")
      } else {
        setError(requestError.response?.data?.eroare || "Nu am putut primi un răspuns de la Aky. Te rugăm să reîncerci.")
      }
      
      // Remove optimistic user message on failure since we use Pas 1 which saves it, 
      // but wait, if it fails at pas 2, the message IS in the DB.
      // We will reload messages from DB on fail to be perfectly in sync.
      if (selectedConversationId) {
        getIstoric(selectedConversationId).then(setMessages).catch(() => {})
      } else {
        // We don't have the conversation ID if pas 1 failed entirely.
        // We'll just pop the last optimistic message.
        setMessages((current) => current.filter(m => m.id !== userMessage.id))
      }
      
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
        <SheetContent onOpenChange={handleOpenChange} className="flex flex-col bg-linear-to-b from-[#fffdfa] via-[#fffdfb] to-[#f8fbff] p-0 sm:max-w-md w-full">
          <SheetHeader className={`relative bg-linear-to-r ${selectedTheme.accent} text-white`}>
            <div className="absolute -top-10 right-[-2rem] h-28 w-28 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -bottom-12 left-[-1.5rem] h-28 w-28 rounded-full bg-[#8bc8f1]/14 blur-sm" />
            
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
            
            <div className="flex items-center gap-3 pr-12 relative z-10 pt-2 pb-1">
              {view === "chat" && (
                <button 
                  onClick={() => {
                    if (!courseId) setSelectedCourseId(null)
                    setView("list")
                    // Optional: refresh list
                    const refreshPromise = courseId ? getConversatii(courseId) : getConversatiiGlobale()
                    refreshPromise.then(data => setConversatii(data)).catch(() => {})
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
                
                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3">
                  <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-1 pb-1">Istoric Conversații</h3>
                  
                  {isLoadingConversations ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                  ) : conversatii.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <MessageCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Nu ai nicio conversație anterioară la acest curs.</p>
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
                      )})}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHAT VIEW */}
            {selectedCourseId && view === "chat" && (
              <>
                <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
                  {messages.length === 0 && !isLoadingMessages ? (
                    <>
                      <Card className="border-[#d9e4f4] bg-linear-to-br from-[#edf7ff] via-[#f8fbff] to-white shadow-[0_18px_40px_rgba(32,46,84,0.08)] mb-6">
                        <CardContent className="space-y-4 px-5 py-5">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br ${selectedTheme.accent} ${selectedTheme.heroBorder} ${selectedTheme.heroStatText} shadow-[0_12px_24px_rgba(24,49,83,0.14)]`}>
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#24385b]">Salut! Sunt Aky.</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
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
                              className="rounded-2xl border border-[#d9e4f4] bg-white px-3.5 py-2.5 text-left text-sm text-[#3f698a] shadow-xs transition hover:border-[#bfd5eb] hover:bg-[#f4f8fd]"
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
                      {messages.map((message) => {
                        const isUser = message.rol === "UTILIZATOR"

                        return (
                          <div key={message.id} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
                            <div
                              className={cn(
                                "max-w-[85%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed shadow-xs",
                                isUser
                                  ? "rounded-br-xs bg-[#24385b] text-white"
                                  : "rounded-bl-xs border border-[#e4d8cd] bg-white text-slate-800"
                              )}
                            >
                              <p className="whitespace-pre-wrap">{message.continut}</p>

                              {!isUser && message.surseFolosite ? (
                                <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2">
                                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Surse folosite:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {message.surseFolosite.split(",").filter(Boolean).map((sourceId, index) => (
                                      <span key={index} className="inline-flex items-center gap-1 rounded-xl border border-[#d9e4f4] bg-[#f4f8fd] px-2.5 py-1 text-[11px] font-semibold text-[#24385b]">
                                        <FileText className="h-3 w-3 text-[#3b6ea8]" />
                                        <span className="max-w-[140px] truncate">Document {sourceId}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <span className="px-1 text-[10px] font-medium text-slate-400">{formatTime(message.createdAt)}</span>
                          </div>
                        )
                      })}

                      {isSending ? (
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex items-center gap-2 rounded-[1.35rem] rounded-bl-xs border border-[#e4d8cd] bg-white px-4 py-3 text-xs text-slate-600 shadow-xs">
                            <Loader2 className="h-4 w-4 animate-spin text-[#24385b]" />
                            <span>Aky analizează materialele cursului...</span>
                          </div>
                        </div>
                      ) : null}

                      {error ? (
                        <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90 px-4 py-3">
                          <AlertCircle className="h-4 w-4 text-rose-600" />
                          <AlertDescription className="text-xs font-medium text-rose-800">{error}</AlertDescription>
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
                          className="h-12 flex-1 rounded-2xl border-0 bg-transparent px-4 text-slate-700 shadow-none focus-visible:ring-0 disabled:opacity-60 placeholder:text-slate-400"
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
        </SheetContent>
      </Sheet>
    </>
  )
}
