import { AlertCircle, Check, ChevronLeft, ChevronRight, FileText, GripVertical, Loader2, MessageCircle, Palette, PanelLeftClose, PanelLeftOpen, Plus, Send, Sparkles, Trash2, RotateCcw } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useCallback, useEffect, useRef, useState } from "react"
import ragHeadLogo from "@/assets/logo_RAG_head.png"
import ragLogo from "@/assets/logo_RAG-removebg-preview.png"
import { useAuth } from "@/auth/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { adaugaMesaj, creareConversatieSiMesaj, genereazaFlashcards, genereazaQuiz, getConversatii, getConversatiiGlobale, getDocumenteAccesibile, getIstoric, retryMesaj, stergeConversatie } from "@/lib/conversatii"
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
const AKY_PANEL_MIN_WIDTH = 800
const AKY_PANEL_DEFAULT_WIDTH = AKY_PANEL_MIN_WIDTH
const AKY_PANEL_MAX_WIDTH = 1344
const AKY_PANEL_VIEWPORT_GAP = 32
const AKY_HISTORY_MIN_WIDTH = 260
const AKY_HISTORY_DEFAULT_WIDTH = 320
const AKY_HISTORY_MAX_WIDTH = 430
const AKY_CHAT_MIN_WIDTH = 380

function getQuizOptionEntries(optiuni) {
  if (Array.isArray(optiuni)) {
    return optiuni.map((value, index) => [String.fromCharCode(65 + index), value])
  }

  if (optiuni && typeof optiuni === "object") {
    return Object.entries(optiuni)
  }

  return []
}

function isQuizCorrectAnswer(question, key, value) {
  const correctAnswer = String(question?.raspuns_corect || "").trim()
  return correctAnswer === String(key).trim() || correctAnswer === String(value).trim()
}

function getTimelineTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getAkyThemeStorageKey(user) {
  return `${AKY_THEME_STORAGE_PREFIX}:${getThemeUserKey(user)}`
}

export default function AkyChatWidget({ courseId = null, courseTitle = null, enabled = true }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(AKY_PANEL_DEFAULT_WIDTH)
  const [historyWidth, setHistoryWidth] = useState(AKY_HISTORY_DEFAULT_WIDTH)
  const [historyVisible, setHistoryVisible] = useState(true)
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
  const filterModeRef = useRef(filterMode)
  const isResizingPanelRef = useRef(false)
  const isResizingHistoryRef = useRef(false)
  const themePickerRef = useRef(null)

  const [quizOpen, setQuizOpen] = useState(false)
  const [quizDocuments, setQuizDocuments] = useState([])
  const [quizDocumentId, setQuizDocumentId] = useState("")
  const [quizNrIntrebari, setQuizNrIntrebari] = useState(5)
  const [localTimelineItems, setLocalTimelineItems] = useState([])
  const [quizError, setQuizError] = useState(null)
  const [isLoadingQuizDocuments, setIsLoadingQuizDocuments] = useState(false)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)

  const [rightPanelMode, setRightPanelMode] = useState(null)
  const flashcardMode = rightPanelMode === "flashcards"
  const [accessibleDocuments, setAccessibleDocuments] = useState([])
  const [flashcardQuestions, setFlashcardQuestions] = useState([])
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false)
  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false)
  const [flashcardNumQuestions, setFlashcardNumQuestions] = useState(5)
  const [selectedFlashcardDocId, setSelectedFlashcardDocId] = useState("")
  const [flashcardError, setFlashcardError] = useState(null)
  const [isResizing, setIsResizing] = useState(false)

  const clampPanelWidth = useCallback((nextWidth) => {
    const maxAllowedWidth = rightPanelMode ? 1536 : AKY_PANEL_MAX_WIDTH
    const maxWidth = Math.min(maxAllowedWidth, window.innerWidth - AKY_PANEL_VIEWPORT_GAP)
    const minWidth = Math.min(AKY_PANEL_MIN_WIDTH, maxWidth)
    return Math.max(minWidth, Math.min(nextWidth, maxWidth))
  }, [rightPanelMode])

  const clampHistoryWidth = useCallback((nextWidth) => {
    const maxWidth = Math.min(AKY_HISTORY_MAX_WIDTH, panelWidth - AKY_CHAT_MIN_WIDTH)
    const minWidth = Math.min(AKY_HISTORY_MIN_WIDTH, maxWidth)
    return Math.max(minWidth, Math.min(nextWidth, maxWidth))
  }, [panelWidth])

  useEffect(() => {
    if (rightPanelMode) {
      setPanelWidth((currentWidth) => Math.max(currentWidth, Math.min(1150, window.innerWidth - 32)))
    } else {
      setPanelWidth(AKY_PANEL_DEFAULT_WIDTH)
    }
  }, [rightPanelMode])

  async function loadAccessibleDocuments() {
    if (!selectedCourseId) return

    try {
      const documents = await getDocumenteAccesibile(selectedCourseId)
      setAccessibleDocuments(Array.isArray(documents) ? documents : [])
    } catch (err) {
      console.error("Nu s-au putut încărca documentele accesibile pentru flashcards", err)
    }
  }

  function toggleFlashcardMode() {
    if (!selectedCourseId) return
    const nextMode = rightPanelMode === "flashcards" ? null : "flashcards"
    setRightPanelMode(nextMode)
    if (nextMode) {
      loadAccessibleDocuments()
      setQuizOpen(false)
    }
  }

  useEffect(() => {
    filterModeRef.current = filterMode
  }, [filterMode])

  useEffect(() => {
    if (!open) return undefined

    function handleWindowResize() {
      setPanelWidth((currentWidth) => clampPanelWidth(currentWidth))
      setHistoryWidth((currentWidth) => clampHistoryWidth(currentWidth))
    }

    handleWindowResize()
    window.addEventListener("resize", handleWindowResize)

    return () => {
      window.removeEventListener("resize", handleWindowResize)
    }
  }, [clampHistoryWidth, clampPanelWidth, open])

  useEffect(() => {
    if (!open) return

    setHistoryWidth((currentWidth) => clampHistoryWidth(currentWidth))
  }, [clampHistoryWidth, open])

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

  useEffect(() => {
    setSelectedCourseId(courseId)
    setFilterMode("course")
  }, [courseId])

  useEffect(() => {
    setQuizOpen(false)
    setQuizDocuments([])
    setQuizDocumentId("")
    setRightPanelMode(null)
    setAccessibleDocuments([])
    setSelectedFlashcardDocId("")
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)
    setFlashcardNumQuestions(5)
    setLocalTimelineItems([])
    setQuizError(null)
    setFlashcardError(null)
  }, [selectedCourseId])

  useEffect(() => {
    if ((!quizOpen && !flashcardMode) || !selectedCourseId) return

    async function loadQuizDocuments() {
      try {
        setIsLoadingQuizDocuments(true)
        setQuizError(null)
        setFlashcardError(null)
        const documents = await getDocumenteAccesibile(selectedCourseId)
        setQuizDocuments(Array.isArray(documents) ? documents : [])
        if (flashcardMode) {
          setAccessibleDocuments(Array.isArray(documents) ? documents : [])
        }
      } catch (err) {
        console.error("Nu s-au putut încărca documentele pentru quiz", err)
        setQuizError("Nu s-au putut încărca documentele accesibile pentru quiz.")
        if (flashcardMode) {
          setFlashcardError("Nu s-au putut încărca documentele accesibile pentru flashcards.")
        }
      } finally {
        setIsLoadingQuizDocuments(false)
      }
    }

    loadQuizDocuments()
  }, [flashcardMode, quizOpen, selectedCourseId])

  const fetchConversations = useCallback(async function fetchConversations(pageToLoad = 0, append = false, overrideFilter = null) {
    const activeFilter = overrideFilter || filterModeRef.current
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
  }, [courseId])

  // Load conversations
  useEffect(() => {
    if (!open) return

    setMessages([])
    setLocalTimelineItems([])
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
  }, [open, courseId, fetchConversations])

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
  }, [currentFlashcardIndex, flashcardError, flashcardMode, flashcardQuestions, isFlashcardFlipped, isSending, localTimelineItems, messages, open, quizError, quizOpen, rightPanelMode, view])

  if (isAdmin) {
    return null
  }

  function handleOpenChange(nextOpen) {
    if (nextOpen) {
      setPanelWidth(AKY_PANEL_MIN_WIDTH)
    }
    setOpen(nextOpen)
    if (!nextOpen) {
      setThemePickerOpen(false)
      setQuizOpen(false)
      setRightPanelMode(null)
    }
  }

  function handlePanelResizePointerDown(event) {
    event.preventDefault()
    isResizingPanelRef.current = true
    setIsResizing(true)

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"

    function handlePointerMove(moveEvent) {
      if (!isResizingPanelRef.current) return
      setPanelWidth(clampPanelWidth(window.innerWidth - moveEvent.clientX))
    }

    function handlePointerUp() {
      isResizingPanelRef.current = false
      setIsResizing(false)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
  }

  function handleHistoryResizePointerDown(event) {
    event.preventDefault()
    event.stopPropagation()
    isResizingHistoryRef.current = true
    setIsResizing(true)

    const startX = event.clientX
    const startWidth = historyWidth
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"

    function handlePointerMove(moveEvent) {
      if (!isResizingHistoryRef.current) return
      setHistoryWidth(clampHistoryWidth(startWidth + moveEvent.clientX - startX))
    }

    function handlePointerUp() {
      isResizingHistoryRef.current = false
      setIsResizing(false)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
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
    setLocalTimelineItems([])
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
    } catch {
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
    setLocalTimelineItems([])
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

  async function handleGenerateQuiz() {
    if (!selectedCourseId || isGeneratingQuiz) return
    const nrIntrebari = Number(quizNrIntrebari) || 5
    const selectedDocument = quizDocumentId
      ? quizDocuments.find((document) => String(document.documentId) === String(quizDocumentId))
      : null

    try {
      setIsGeneratingQuiz(true)
      setQuizError(null)
      const response = await genereazaQuiz(selectedCourseId, {
        documentId: quizDocumentId ? Number(quizDocumentId) : null,
        nrIntrebari,
      })
      const questions = Array.isArray(response) ? response : (response?.intrebari || [])
      if (questions.length === 0) {
        setQuizError("Aky nu a putut genera întrebări din materialele accesibile.")
        return
      }

      setLocalTimelineItems((currentItems) => [
        ...currentItems,
        {
          id: `quiz-${Date.now()}`,
          type: "quiz",
          createdAt: new Date().toISOString(),
          documentLabel: selectedDocument?.numeFisier || "Toate documentele accesibile",
          nrIntrebari,
          questions,
          answers: {},
        },
      ])
      setQuizOpen(false)
    } catch (err) {
      console.error("Nu s-a putut genera quiz-ul", err)
      setQuizError(err.response?.data?.eroare || "Nu s-a putut genera quiz-ul. Încearcă din nou.")
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  async function handleStartFlashcards() {
    if (!selectedCourseId) return
    setIsFlashcardsLoading(true)
    setFlashcardError(null)
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)

    try {
      const docId = selectedFlashcardDocId ? Number(selectedFlashcardDocId) : null
      const data = await genereazaFlashcards(selectedCourseId, docId, flashcardNumQuestions)
      if (Array.isArray(data) && data.length > 0) {
        setFlashcardQuestions(data)
      } else {
        setFlashcardError("Gemini nu a putut returna flashcard-uri structurate corect. Te rugăm să reîncerci.")
      }
    } catch (err) {
      console.error("Eroare la generare flashcards", err)
      const errorMsg = err.response?.data?.eroare || err.response?.data?.detail || "Nu am putut genera flashcard-urile. Te rugăm să verifici conexiunea sau indexarea documentelor."
      setFlashcardError(errorMsg)
    } finally {
      setIsFlashcardsLoading(false)
    }
  }

  function handleQuizAnswer(quizId, questionIndex, answerKey) {
    setLocalTimelineItems((currentItems) => currentItems.map((item) => (
      item.id === quizId
        ? { ...item, answers: { ...item.answers, [questionIndex]: answerKey } }
        : item
    )))
  }

  function handleNewQuiz() {
    setQuizError(null)
    setQuizDocumentId("")
    setQuizNrIntrebari(5)
    setRightPanelMode(null)
    setQuizOpen(true)
  }

  function handleResetFlashcards() {
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)
    setFlashcardError(null)
  }

  function formatTime(isoString) {
    if (!isoString) return ""
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  function formatDate(isoString) {
    if (!isoString) return ""
    return new Date(isoString).toLocaleDateString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  const timelineItems = [
    ...messages.map((message, index) => ({
      id: `message-${message.id ?? index}`,
      type: "message",
      createdAt: message.createdAt,
      order: index,
      message,
    })),
    ...localTimelineItems.map((item, index) => ({
      ...item,
      order: messages.length + index,
    })),
  ].sort((firstItem, secondItem) => {
    const timeDifference = getTimelineTimestamp(firstItem.createdAt) - getTimelineTimestamp(secondItem.createdAt)
    return timeDifference || firstItem.order - secondItem.order
  })

  return (
    <>
      <Button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label="Deschide Aky"
        className="fixed right-7 bottom-7 z-40 h-[5.8rem] w-[5.8rem] overflow-hidden rounded-[2rem] border border-[#b8d2eb] bg-linear-to-br from-[#edf4fc] via-[#e2eefb] to-[#d3e4f7] p-0 shadow-[0_24px_58px_rgba(32,46,84,0.28)] transition hover:-translate-y-1 hover:shadow-[0_30px_68px_rgba(32,46,84,0.32)]"
      >
        <div className="flex h-full w-full items-center justify-center p-1.5">
          <img src={ragLogo} alt="Aky" className="h-full w-full object-contain scale-[1.18]" />
        </div>
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          onOpenChange={handleOpenChange}
          style={{
            "--aky-panel-width": `${panelWidth}px`,
            "--aky-history-width": `${historyWidth}px`,
            width: (typeof window !== "undefined" && window.innerWidth >= 1024) ? `${panelWidth}px` : undefined,
          }}
          className={cn(
            "flex w-full max-w-none bg-linear-to-b from-[#fffdfa] via-[#fffdfb] to-[#f8fbff] p-0 sm:max-w-[58rem]",
            !isResizing && "transition-all duration-300",
            flashcardMode ? "lg:max-w-[min(96rem,calc(100vw-2rem))] flex-row" : "lg:w-[var(--aky-panel-width)] lg:max-w-[min(84rem,calc(100vw-2rem))] flex-col",
          )}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionează Aky"
            onPointerDown={handlePanelResizePointerDown}
            className="absolute left-[-0.5rem] top-1/2 z-50 hidden h-16 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center lg:flex"
          >
            <div className="flex h-14 w-3 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-300 shadow-[0_4px_12px_rgba(32,46,84,0.08)] backdrop-blur-sm transition hover:border-slate-300/90 hover:text-slate-400">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className={cn("flex h-full min-w-[350px] flex-1 flex-col", flashcardMode && "lg:max-w-[50%] border-r border-slate-200/80")}>
          <SheetHeader className={`relative bg-linear-to-r ${selectedTheme.accent} text-white`}>
            <div className="absolute -top-10 right-[-2rem] h-28 w-28 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -bottom-12 left-[-1.5rem] h-28 w-28 rounded-full bg-[#8bc8f1]/14 blur-sm" />

<div ref={themePickerRef} className="absolute right-16 top-4 z-20">
              {themePickerOpen ? (
                <div className="absolute right-0 top-12 w-56 rounded-[1.35rem] border border-[#d9c9ff] bg-[#fbf8ff]/98 p-2.5 text-[#3a2e66] shadow-[0_18px_48px_rgba(62,42,120,0.2)] backdrop-blur-md">
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
                aria-label="Schimbă tema Aky"
                onClick={() => setThemePickerOpen((currentValue) => !currentValue)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/32 bg-white/16 text-white shadow-[0_10px_22px_rgba(15,23,42,0.14)] backdrop-blur-sm transition hover:bg-white/24"
              >
                <Palette className="h-4 w-4" />
              </button>
            </div>

            {!isProfessor && selectedCourseId ? (
              <div className="absolute right-28 top-4 z-20 flex gap-2">
                <button
                  type="button"
                  aria-label="Generare Quiz"
                  onClick={() => {
                    setRightPanelMode(null)
                    setQuizOpen((currentValue) => !currentValue)
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 px-3 rounded-2xl border text-xs font-semibold shadow-[0_10px_22px_rgba(15,23,42,0.14)] backdrop-blur-sm transition",
                    quizOpen
                      ? "border-amber-300 bg-amber-400/20 text-amber-200 hover:bg-amber-400/30"
                      : "border-white/32 bg-white/16 text-white hover:bg-white/24"
                  )}
                >
                  <span className="whitespace-nowrap font-medium text-white/90">Aky e gata de examen. Tu?</span>
                  <ChevronRight className="h-4 w-4 text-white/70" />
                  <span className="font-bold tracking-[0.08em] text-white">QUIZ</span>
                </button>
                <button
                  type="button"
                  aria-label="Flashcards"
                  onClick={toggleFlashcardMode}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 px-3 rounded-2xl border text-xs font-semibold shadow-[0_10px_22px_rgba(15,23,42,0.14)] backdrop-blur-sm transition",
                    flashcardMode
                      ? "border-emerald-300 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
                      : "border-white/32 bg-white/16 text-white hover:bg-white/24"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  <span>Flashcards</span>
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-3 pr-12 relative z-10 pt-2 pb-1">
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

          <div className={cn("grid min-h-0 flex-1 bg-slate-50/50", historyVisible ? "lg:grid-cols-[var(--aky-history-width)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)]")}>
            {/* CONVERSATION LIST VIEW */}
            <div className={cn("relative min-h-0 flex-col border-r border-slate-100 bg-white/42", view === "chat" ? "hidden lg:flex" : "flex", !historyVisible && "lg:hidden")}>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Redimensionează istoricul conversațiilor"
                  onPointerDown={handleHistoryResizePointerDown}
                  className="absolute right-[-0.5rem] top-[calc(50%-3.5rem)] z-30 hidden h-16 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center lg:flex"
                >
                  <div className="flex h-14 w-3 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-300 shadow-[0_4px_12px_rgba(32,46,84,0.08)] backdrop-blur-sm transition hover:border-slate-300/90 hover:text-slate-400">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <div className="mb-3 hidden items-center justify-end lg:flex">
                    <button
                      type="button"
                      aria-label="Închide istoricul conversațiilor"
                      title="Închide istoricul"
                      onClick={() => setHistoryVisible(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/60 bg-white/70 text-slate-400 transition hover:border-slate-300 hover:bg-white hover:text-[#24385b]"
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </button>
                  </div>
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
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            filterMode === "course"
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
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            filterMode === "all"
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
                      )})}
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

            <div className={cn("min-h-0 flex-col bg-slate-50/50", view === "list" ? "hidden lg:flex" : "flex")}>
              {!historyVisible ? (
                <div className="hidden items-center border-b border-slate-100 bg-white/45 px-5 py-3 lg:flex">
                  <button
                    type="button"
                    onClick={() => setHistoryVisible(true)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-[#bfd5eb] hover:bg-white hover:text-[#24385b]"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                    Istoric
                  </button>
                </div>
              ) : null}
              {/* NO COURSE SELECTED (SELECT COURSE VIEW) */}
              {!selectedCourseId ? (
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

              {/* CHAT VIEW */}
              {selectedCourseId ? (
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
                    <div className={cn("flex-1 space-y-4", messages.length === 0 && (quizOpen || flashcardMode) ? "mt-6" : null)}>
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
                      {timelineItems.map((timelineItem, timelineIndex) => {
                        if (timelineItem.type === "quiz") {
                          return (
                            <Card
                              key={timelineItem.id}
                              className={cn(
                                "border-[#d9e4f4] bg-white shadow-[0_14px_34px_rgba(32,46,84,0.08)]",
                                messages.length === 0 && timelineIndex === 0 ? "mt-6" : null
                              )}
                            >
                              <CardContent className="space-y-4 px-5 py-5">
                                <div>
                                  <p className="font-semibold text-[#24385b]">Quiz Aky</p>
                                  <p className="mt-1 text-xs font-medium text-slate-400">
                                    {timelineItem.documentLabel} • {timelineItem.nrIntrebari} întrebări • {formatTime(timelineItem.createdAt)}
                                  </p>
                                </div>

                                <div className="space-y-4">
                                  {timelineItem.questions.map((question, questionIndex) => {
                                    const selectedAnswer = timelineItem.answers?.[questionIndex]
                                    const optionEntries = getQuizOptionEntries(question.optiuni)

                                    return (
                                      <div key={`${timelineItem.id}-${question.intrebare}-${questionIndex}`} className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-4">
                                        <p className="text-sm font-semibold leading-6 text-[#24385b]">{questionIndex + 1}. {question.intrebare}</p>
                                        <div className="mt-3 space-y-2">
                                          {optionEntries.map(([key, value]) => {
                                            const isSelected = selectedAnswer === key
                                            const isCorrect = isQuizCorrectAnswer(question, key, value)
                                            const showResult = Boolean(selectedAnswer)

                                            return (
                                              <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleQuizAnswer(timelineItem.id, questionIndex, key)}
                                                className={cn(
                                                  "flex w-full items-start gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm transition",
                                                  showResult && isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[#d9e4f4] text-slate-700 hover:border-[#bfd5eb] hover:bg-[#f4f8fd]",
                                                  showResult && isSelected && !isCorrect ? "border-rose-200 bg-rose-50 text-rose-800" : null
                                                )}
                                              >
                                                <span className="font-semibold">{key}.</span>
                                                <span>{value}</span>
                                              </button>
                                            )
                                          })}
                                        </div>
                                        {selectedAnswer ? (
                                          <p className="mt-3 text-xs leading-5 text-slate-600">
                                            <span className="font-semibold text-[#24385b]">Explicație: </span>
                                            {question.explicatie || "Răspunsul corect este evidențiat mai sus."}
                                          </p>
                                        ) : null}
                                      </div>
                                    )
                                  })}
                                </div>

                                <div className="flex justify-end pt-3">
                                  <Button
                                    type="button"
                                    onClick={handleNewQuiz}
                                    className={`h-11 rounded-xl bg-linear-to-r ${selectedTheme.accent} px-5 text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-[0.98]`}
                                  >
                                    Quiz nou
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        }

                        const message = timelineItem.message
                        const isUser = message.rol === "UTILIZATOR"

                        return (
                          <div key={timelineItem.id} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
                            <div
                              className={cn(
                                "max-w-[85%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed shadow-xs",
                                isUser
                                  ? `rounded-br-xs bg-linear-to-r ${selectedTheme.accent} text-white`
                                  : "rounded-bl-xs border border-[#e4d8cd] bg-white text-slate-800"
                              )}
                            >
                              <div className="whitespace-pre-wrap font-sans text-sm markdown-body">
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

                      {quizOpen ? (
                        <Card className="border-[#d9e4f4] bg-white shadow-[0_14px_34px_rgba(32,46,84,0.08)]">
                          <CardContent className="space-y-4 px-5 py-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#24385b]">Quiz Aky</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">Generează întrebări din materialele accesibile pentru acest curs.</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setQuizOpen(false)}
                                className="rounded-xl text-xs font-semibold text-slate-500 hover:bg-[#f4f8fd]"
                              >
                                Închide
                              </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                              <select
                                value={quizDocumentId}
                                onChange={(event) => setQuizDocumentId(event.target.value)}
                                disabled={isLoadingQuizDocuments || isGeneratingQuiz}
                                className="h-11 rounded-xl border border-[#d9e4f4] bg-white px-3 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20 disabled:opacity-60"
                              >
                                <option value="">Toate documentele accesibile</option>
                                {quizDocuments.map((document) => (
                                  <option key={document.documentId} value={document.documentId}>{document.numeFisier}</option>
                                ))}
                              </select>
                              <select
                                value={quizNrIntrebari}
                                onChange={(event) => setQuizNrIntrebari(event.target.value)}
                                disabled={isGeneratingQuiz}
                                className="h-11 rounded-xl border border-[#d9e4f4] bg-white px-3 text-sm text-[#1e3a5f] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-2 focus:ring-[#8bc8f1]/20 disabled:opacity-60"
                              >
                                {[3, 5, 7, 10].map((count) => (
                                  <option key={count} value={count}>{count} întrebări</option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                onClick={handleGenerateQuiz}
                                disabled={isGeneratingQuiz || isLoadingQuizDocuments}
                                className={`h-11 rounded-xl bg-linear-to-r ${selectedTheme.accent} px-4 text-white shadow-md disabled:opacity-50`}
                              >
                                {isGeneratingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Generează
                              </Button>
                            </div>

                            {quizError ? (
                              <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90 px-4 py-3">
                                <AlertCircle className="h-4 w-4 text-rose-600" />
                                <AlertDescription className="text-xs font-medium text-rose-800">{quizError}</AlertDescription>
                              </Alert>
                            ) : null}

                          </CardContent>
                        </Card>
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
              ) : null}
            </div>
          </div>
          </div>

          {flashcardMode ? (
            <div className={cn("flex h-full min-w-[360px] flex-1 flex-col", selectedTheme.heroBg)}>
              <div className={`relative bg-linear-to-r ${selectedTheme.accent} text-white`}>
                <div className="absolute -top-10 right-[-2rem] h-28 w-28 rounded-full bg-white/10 blur-sm" />
                <div className="absolute -bottom-12 left-[-1.5rem] h-28 w-28 rounded-full bg-[#8bc8f1]/14 blur-sm" />
                <div className="relative z-10 flex min-h-[109px] items-center justify-between gap-3 px-5 pt-2 pb-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12 backdrop-blur-sm">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]">
                        <FileText className="h-5 w-5 text-[#24385b]" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Flashcards Smart Aky</h4>
                      <p className="text-[10px] text-white/80">Memorare rapidă prin repetiție!</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleFlashcardMode}
                    className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ChevronLeft className="h-5 w-5 rotate-180" />
                  </button>
                </div>
              </div>

              <div className={cn("flex-1 space-y-6 overflow-y-auto border-l border-slate-100 p-6", selectedTheme.heroBg)}>
                {flashcardQuestions.length === 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className={cn("mb-1.5 block text-[10px] font-bold tracking-wider uppercase font-sans", selectedTheme.sectionLabel)}>Sursa Flashcard-urilor</label>
                      <select
                        disabled={isFlashcardsLoading}
                        value={selectedFlashcardDocId}
                        onChange={(event) => setSelectedFlashcardDocId(event.target.value)}
                        className="h-10 w-full rounded-xl border border-[#d9e4f4] bg-white px-3 text-xs font-semibold text-[#24385b] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-1 focus:ring-[#8bc8f1]/25 disabled:opacity-60"
                      >
                        <option value="">Toate documentele accesibile</option>
                        {accessibleDocuments.map((document) => (
                          <option key={document.documentId} value={document.documentId}>{document.numeFisier}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={cn("mb-1.5 block text-[10px] font-bold tracking-wider uppercase font-sans", selectedTheme.sectionLabel)}>Număr Fișe</label>
                      <select
                        disabled={isFlashcardsLoading}
                        value={flashcardNumQuestions}
                        onChange={(event) => setFlashcardNumQuestions(Number(event.target.value))}
                        className="h-10 w-full rounded-xl border border-[#d9e4f4] bg-white px-3 text-xs font-semibold text-[#24385b] shadow-sm outline-hidden transition-all focus:border-[#8bc8f1] focus:ring-1 focus:ring-[#8bc8f1]/25 disabled:opacity-60"
                      >
                        {[3, 5, 8, 12].map((count) => (
                          <option key={count} value={count}>{count} Flashcard-uri</option>
                        ))}
                      </select>
                    </div>

                    <Button
                      disabled={isFlashcardsLoading}
                      onClick={handleStartFlashcards}
                      className={`h-11 w-full rounded-xl bg-linear-to-r ${selectedTheme.accent} text-xs font-bold text-white shadow-[0_14px_34px_rgba(15,23,42,0.28)]`}
                    >
                      Generează Flashcards
                    </Button>
                  </div>
                ) : null}

                {isFlashcardsLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-3 py-12">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: selectedTheme.heroAccent }} />
                    <p className="text-sm sm:text-base font-semibold text-slate-500 animate-pulse">Se extrag conceptele cheie din materie...</p>
                  </div>
                ) : null}

                {!isFlashcardsLoading && flashcardError ? (
                  <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                    <p className="text-sm sm:text-base font-semibold text-rose-800">{flashcardError}</p>
                    <p className="text-xs sm:text-sm text-slate-500">Asigură-te că există documente încărcate și indexate în săptămânile parcurse de tine la acest curs.</p>
                  </div>
                ) : null}

                {!isFlashcardsLoading && !flashcardError && flashcardQuestions.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center space-y-3 p-4 text-center">
                    <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", selectedTheme.heroStatBg, selectedTheme.iconText)}>
                      <FileText className="h-7 w-7" />
                    </div>
                    <h5 className="font-sans text-base sm:text-lg font-bold text-[#24385b]">Memorare prin Flashcards</h5>
                    <p className="max-w-xs font-sans text-sm sm:text-base text-slate-500">
                      Generează fișe cu concepte cheie și explicații pentru a le memora vizual prin repetiție activă.
                    </p>
                  </div>
                ) : null}

                {!isFlashcardsLoading && !flashcardError && flashcardQuestions.length > 0 ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between font-sans text-xs font-bold text-slate-400 uppercase">
                      <span>Fișa {currentFlashcardIndex + 1} din {flashcardQuestions.length}</span>
                      <span style={{ color: selectedTheme.heroAccent }}>Memorare activă</span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ backgroundColor: selectedTheme.heroAccent, width: `${((currentFlashcardIndex + 1) / flashcardQuestions.length) * 100}%` }}
                      />
                    </div>

                    <div onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)} className="h-64 w-full cursor-pointer" style={{ perspective: "1000px" }}>
                      <div
                        className="relative h-full w-full rounded-3xl duration-500"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: isFlashcardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        <div className={cn("absolute inset-0 flex h-full w-full flex-col items-center justify-between rounded-3xl border p-6 text-center shadow-xs", selectedTheme.heroBg, selectedTheme.heroBorder)} style={{ backfaceVisibility: "hidden" }}>
                          <span className={cn("rounded-full px-3 py-1 font-sans text-[10px] font-extrabold tracking-widest uppercase", selectedTheme.badge)} style={{ color: selectedTheme.heroAccent }}>Concept / Întrebare</span>
                          <p className="flex flex-1 items-center justify-center p-2 font-sans text-lg sm:text-xl font-bold leading-snug text-[#24385b]">
                            {flashcardQuestions[currentFlashcardIndex].fata}
                          </p>
                          <span className="flex items-center gap-1.5 font-sans text-xs font-semibold text-slate-500">
                            <RotateCcw className="h-3.5 w-3.5" /> Apasă pentru răspuns
                          </span>
                        </div>

                        <div className={cn("absolute inset-0 flex h-full w-full flex-col items-center justify-between rounded-3xl border bg-white p-6 text-center shadow-xs", selectedTheme.heroBorder)} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                          <span className={cn("rounded-full px-3 py-1 font-sans text-[10px] font-extrabold tracking-widest uppercase", selectedTheme.badge)} style={{ color: selectedTheme.heroAccent }}>Răspuns / Definiție</span>
                          <p className="flex max-h-[140px] w-full flex-1 items-center justify-center overflow-y-auto whitespace-pre-wrap p-2 font-sans text-sm sm:text-base font-medium leading-relaxed text-slate-700">
                            {flashcardQuestions[currentFlashcardIndex].verso}
                          </p>
                          <span className="flex items-center gap-1.5 font-sans text-xs font-semibold text-slate-500">
                            <RotateCcw className="h-3.5 w-3.5" /> Apasă pentru întoarcere
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        disabled={currentFlashcardIndex === 0}
                        onClick={(event) => {
                          event.stopPropagation()
                          setIsFlashcardFlipped(false)
                          setTimeout(() => {
                            setCurrentFlashcardIndex((currentValue) => currentValue - 1)
                          }, 150)
                        }}
                        className="h-10 flex-1 rounded-xl border-slate-200 font-sans text-xs font-semibold text-slate-600"
                      >
                        Înapoi
                      </Button>
                      {currentFlashcardIndex < flashcardQuestions.length - 1 ? (
                        <Button
                        onClick={(event) => {
                          event.stopPropagation()
                          setIsFlashcardFlipped(false)
                          setTimeout(() => {
                            setCurrentFlashcardIndex((currentValue) => currentValue + 1)
                          }, 150)
                        }}
                        className={`h-10 flex-1 rounded-xl bg-linear-to-r ${selectedTheme.accent} font-sans text-xs font-semibold text-white`}
                      >
                        Următorul
                      </Button>
                      ) : (
                        <Button
                          onClick={handleResetFlashcards}
                          className={`h-10 flex-1 rounded-xl bg-linear-to-r ${selectedTheme.accent} font-sans text-xs font-semibold text-white`}
                        >
                          Finalizează & Reset
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
