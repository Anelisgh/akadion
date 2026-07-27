import {
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  FileText,
  Loader2,
  Menu,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import AppShell from "@/components/AppShell"
import AkyChatWidget from "@/components/chat/AkyChatWidget"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/useAuth"
import {
  createCourseWeek,
  completeStudentWeek,
  deleteCourseWeek,
  deleteWeekDocument,
  getAdminCourse,
  getAdminCourseProfessor,
  getCourseErrorMessage,
  getCourseFieldErrors,
  getProfessorCourse,
  getStudentCourseProfessor,
  listAdminCourseStudents,
  listAdminCourseWeeks,
  listAdminWeekDocuments,
  listCourseWeeks,
  listProfessorCourseStudents,
  listStudentAvailableCourses,
  listStudentCourseWeeks,
  listStudentCourses,
  listStudentWeekDocuments,
  listWeekDocuments,
  retryDocumentIngest,
  setProfessorCourseActive,
  uncompleteStudentWeek,
  updateCourseWeek,
  updateProfessorCourse,
  updateWeekDocument,
  uploadWeekDocument,
  withdrawStudentCourse,
} from "@/lib/professorCourses"
import { COURSE_THEME_KEYS, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"
import { isAdminUser, isProfessorUser, isStudentUser } from "@/lib/user"
import { cn } from "@/lib/utils"

function formatDisplayDate(value) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(date)
}

function formatInputDate(value) {
  return value ? String(value).slice(0, 10) : ""
}

function getProfessorName(course) {
  return [course?.profesorPrenume, course?.profesorNume].filter(Boolean).join(" ") || course?.profesorMail || "Profesor nealocat"
}

function getInitials(value, fallback = "P") {
  const initials = String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return initials || fallback
}

function getStudentName(student) {
  return [student?.prenume, student?.nume].filter(Boolean).join(" ") || student?.mail || "Student"
}

function extractFilename(url) {
  if (!url) return ""
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    let lastPart = pathParts[pathParts.length - 1] || ""
    if (lastPart.length > 37 && lastPart[8] === '-' && lastPart[13] === '-') {
      return decodeURIComponent(lastPart.substring(37))
    }
    return decodeURIComponent(lastPart)
  } catch {
    return ""
  }
}

function getDocumentHref(document) {
  return document?.urlVizualizare || document?.urlDescarcare || ""
}

function getDocumentStatusClasses(document) {
  if (document && !("statusIndex" in document) && !("activ" in document)) {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }

  if (!document.activ) {
    return "border-slate-200 bg-slate-100 text-slate-600"
  }

  switch (String(document.statusIndex || "").toUpperCase()) {
    case "PRELUAT":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "TRIMIS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "ERONAT":
      return "border-rose-200 bg-rose-50 text-rose-700"
    default:
      return "border-amber-200 bg-amber-50 text-amber-700"
  }
}

function canRetryDocumentIngest(document) {
  return document.retryable === true || String(document.statusIndex || "").toUpperCase() === "ERONAT"
}

function getDocumentStatusLabel(document) {
  if (document && !("statusIndex" in document) && !("activ" in document)) {
    return "Disponibil"
  }

  return document.statusIndex || (document.activ ? "Activ" : "Inactiv")
}

function normalizeStudentEnrolledCourse(course) {
  return {
    ...course,
    inscris: true,
    activ: true,
  }
}

function normalizeStudentAvailableCourse(course) {
  return {
    ...course,
    inscris: false,
    activ: true,
    nrSaptamaniCurente: course.nrSaptamani,
  }
}

function StatusBadge({ children, className }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase ${className}`}>
      {children}
    </span>
  )
}

function DetailTab({ active, theme, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-5 py-2.5 text-sm font-semibold transition",
        active
          ? cn("text-white shadow-sm border-transparent", theme?.btnPrimaryBg || "bg-[#24385b]")
          : "border-[#d8ccbf] bg-white text-slate-700 hover:bg-[#f7efe6] hover:text-slate-900"
      )}
    >
      {children}
    </button>
  )
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, refreshAuth } = useAuth()
  const isProfessor = isProfessorUser(user)
  const isAdmin = isAdminUser(user)
  const isStudent = isStudentUser(user)
  const canEdit = isProfessor
  const canViewStudents = isProfessor || isAdmin
  const [course, setCourse] = useState(location.state?.course ?? null)
  const [professorDetails, setProfessorDetails] = useState(null)
  const [students, setStudents] = useState([])
  const [courseForm, setCourseForm] = useState({ denumire: "", descriere: "", dataInceput: "" })
  const [fieldErrors, setFieldErrors] = useState({})
  const [weeks, setWeeks] = useState([])
  const [weekDrafts, setWeekDrafts] = useState({})
  const [newWeekDescription, setNewWeekDescription] = useState("")
  const [documentsByWeek, setDocumentsByWeek] = useState({})
  const [uploadDrafts, setUploadDrafts] = useState({})
  const [documentDrafts, setDocumentDrafts] = useState({})
  const [expandedWeekIds, setExpandedWeekIds] = useState({})
  const [indexExpandedWeekIds, setIndexExpandedWeekIds] = useState({})
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [pageNotice, setPageNotice] = useState("")
  const [activeAction, setActiveAction] = useState("")
  const [activeTab, setActiveTab] = useState("saptamani")
  const [courseIndexOpen, setCourseIndexOpen] = useState(false)
  const [courseEditorOpen, setCourseEditorOpen] = useState(false)
  const [newWeekOpen, setNewWeekOpen] = useState(false)
  const [editingDocumentIds, setEditingDocumentIds] = useState({})
  const uploadFileInputRefs = useRef({})
  const documentFileInputRefs = useRef({})

  useEffect(() => {
    setExpandedWeekIds((current) => {
      if (weeks.length === 0) {
        return {}
      }

      const next = {}
      let hasExpandedWeek = false

      weeks.forEach((week, index) => {
        const isExpanded = current[week.id] ?? index === 0
        next[week.id] = isExpanded
        hasExpandedWeek ||= isExpanded
      })

      if (!hasExpandedWeek) {
        next[weeks[0].id] = true
      }

      return next
    })
  }, [weeks])

  useEffect(() => {
    setIndexExpandedWeekIds((current) => {
      if (weeks.length === 0) {
        return {}
      }

      return Object.fromEntries(weeks.map((week, index) => [week.id, current[week.id] ?? index === 0]))
    })
  }, [weeks])

  function getCourseApi() {
    if (isAdmin) {
      return getAdminCourse
    }
    return getProfessorCourse
  }

  function getWeeksApi() {
    if (isAdmin) {
      return listAdminCourseWeeks
    }
    if (isStudent) {
      return listStudentCourseWeeks
    }
    return listCourseWeeks
  }

  function getDocumentsApi() {
    if (isAdmin) {
      return listAdminWeekDocuments
    }
    if (isStudent) {
      return listStudentWeekDocuments
    }
    return listWeekDocuments
  }

  function getStudentsApi() {
    return isAdmin ? listAdminCourseStudents : listProfessorCourseStudents
  }

  async function runCourseRequest(request, fallbackMessage) {
    setPageError("")
    setPageNotice("")

    try {
      return await request()
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshAuth()
      }
      setPageError(getCourseErrorMessage(error, fallbackMessage))
      throw error
    }
  }

  async function loadCourseWorkflow() {
    setPageLoading(true)
    setPageError("")

    try {
      if (isStudent) {
        const [enrolledCourses, availableCourses] = await Promise.all([
          listStudentCourses(),
          listStudentAvailableCourses(),
        ])
        const normalizedEnrolledCourses = enrolledCourses.map(normalizeStudentEnrolledCourse)
        const normalizedAvailableCourses = availableCourses.map(normalizeStudentAvailableCourse)
        const loadedCourse = normalizedEnrolledCourses.find((item) => String(item.id) === String(courseId))
          ?? normalizedAvailableCourses.find((item) => String(item.id) === String(courseId))

        if (!loadedCourse) {
          throw new Error("Cursul cerut nu a putut fi găsit.")
        }

        const loadedProfessor = await getStudentCourseProfessor(courseId)
        const loadedWeeks = loadedCourse.inscris ? await listStudentCourseWeeks(courseId) : []
        const sortedWeeks = [...loadedWeeks].sort((first, second) => (first.nrSaptamana ?? 0) - (second.nrSaptamana ?? 0))
        const documentsEntries = await Promise.all(
          sortedWeeks.map(async (week) => [week.id, await listStudentWeekDocuments(week.id)]),
        )

        setCourse(loadedCourse)
        setProfessorDetails(loadedProfessor)
        setCourseForm({
          denumire: loadedCourse?.denumire ?? "",
          descriere: loadedCourse?.descriere ?? "",
          dataInceput: formatInputDate(loadedCourse?.dataInceput),
        })
        setWeeks(sortedWeeks)
        setStudents([])
        setWeekDrafts(Object.fromEntries(sortedWeeks.map((week) => [week.id, week.descriere ?? ""])))
        setDocumentsByWeek(Object.fromEntries(documentsEntries))
        return
      }

      const [loadedCourse, loadedWeeks, loadedStudents, loadedProfessor] = await Promise.all([
        getCourseApi()(courseId),
        getWeeksApi()(courseId),
        canViewStudents ? getStudentsApi()(courseId) : Promise.resolve([]),
        isAdmin ? getAdminCourseProfessor(courseId) : Promise.resolve(null),
      ])
      const sortedWeeks = [...loadedWeeks].sort((first, second) => (first.nrSaptamana ?? 0) - (second.nrSaptamana ?? 0))
      const documentsEntries = await Promise.all(
        sortedWeeks.map(async (week) => [week.id, await getDocumentsApi()(week.id)]),
      )

      setCourse(loadedCourse)
      setProfessorDetails(loadedProfessor)
      setCourseForm({
        denumire: loadedCourse?.denumire ?? "",
        descriere: loadedCourse?.descriere ?? "",
        dataInceput: formatInputDate(loadedCourse?.dataInceput),
      })
      setWeeks(sortedWeeks)
      setStudents(loadedStudents)
      setWeekDrafts(Object.fromEntries(sortedWeeks.map((week) => [week.id, week.descriere ?? ""])))
      setDocumentsByWeek(Object.fromEntries(documentsEntries))
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshAuth()
      }
      setPageError(getCourseErrorMessage(error, "Nu am putut încărca detaliile cursului."))
    } finally {
      setPageLoading(false)
    }
  }

  const syncCourseWorkflow = useEffectEvent(async () => {
    await loadCourseWorkflow()
  })

  useEffect(() => {
    syncCourseWorkflow()
  }, [courseId, isAdmin, isProfessor, isStudent])

  function updateCourseField(field, value) {
    setCourseForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: "" }))
    setPageError("")
    setPageNotice("")
  }

  async function handleSaveCourse(event) {
    event.preventDefault()
    const nextErrors = {}

    if (!courseForm.denumire.trim()) {
      nextErrors.denumire = "Denumirea cursului este obligatorie."
    }

    if (!courseForm.dataInceput) {
      nextErrors.dataInceput = "Data de început este obligatorie."
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setActiveAction("save-course")

    try {
      const updatedCourse = await runCourseRequest(
        () => updateProfessorCourse(courseId, courseForm),
        "Nu am putut actualiza cursul.",
      )
      setCourse((current) => ({ ...current, ...updatedCourse }))
      setPageNotice("Cursul a fost actualizat.")
    } catch (error) {
      setFieldErrors((current) => ({ ...current, ...getCourseFieldErrors(error) }))
    } finally {
      setActiveAction("")
    }
  }

  async function handleToggleActive() {
    const nextActive = !course?.activ
    setActiveAction("toggle-course")

    try {
      await runCourseRequest(
        () => setProfessorCourseActive(courseId, nextActive),
        nextActive ? "Nu am putut reactiva cursul." : "Nu am putut dezactiva cursul.",
      )
      setCourse((current) => ({ ...current, activ: nextActive }))
      setPageNotice(nextActive ? "Cursul a fost reactivat." : "Cursul a fost dezactivat.")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleWithdrawCourse() {
    if (!window.confirm("Confirmi retragerea din acest curs?")) {
      return
    }

    setActiveAction("withdraw-course")

    try {
      await runCourseRequest(
        () => withdrawStudentCourse(courseId),
        "Nu am putut finaliza retragerea din curs.",
      )
      navigate("/courses")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleToggleWeekCompletion(week) {
    setActiveAction(`toggle-week-${week.id}`)

    try {
      await runCourseRequest(
        () => week.finalizata ? uncompleteStudentWeek(week.id) : completeStudentWeek(week.id),
        week.finalizata ? "Nu am putut demarca săptămâna." : "Nu am putut marca săptămâna ca finalizată.",
      )
      const refreshedWeeks = await listStudentCourseWeeks(courseId)
      const sortedWeeks = [...refreshedWeeks].sort((first, second) => (first.nrSaptamana ?? 0) - (second.nrSaptamana ?? 0))
      setWeeks(sortedWeeks)
      setWeekDrafts(Object.fromEntries(sortedWeeks.map((currentWeek) => [currentWeek.id, currentWeek.descriere ?? ""])))
      setCourse((current) => {
        if (!current) {
          return current
        }

        const totalWeeks = sortedWeeks.length
        const completedWeeks = sortedWeeks.filter((currentWeek) => currentWeek.finalizata).length
        return {
          ...current,
          procentajProgres: totalWeeks > 0 ? (completedWeeks / totalWeeks) * 100 : 0,
        }
      })
      setPageNotice(week.finalizata ? "Săptămâna a fost demarcată." : "Săptămâna a fost marcată ca finalizată.")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleCreateWeek(event) {
    event.preventDefault()

    if (newWeekDescription.length > 500) {
      setPageError("Descrierea săptămânii poate avea maximum 500 de caractere.")
      return
    }

    setActiveAction("create-week")

    try {
      await runCourseRequest(
        () => createCourseWeek(courseId, { descriere: newWeekDescription }),
        "Nu am putut adăuga săptămâna.",
      )
      setNewWeekDescription("")
      setPageNotice("Săptămâna a fost adăugată.")
      await loadCourseWorkflow()
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleUpdateWeek(week) {
    const descriere = weekDrafts[week.id] ?? ""

    if (descriere.length > 500) {
      setPageError("Descrierea săptămânii poate avea maximum 500 de caractere.")
      return
    }

    setActiveAction(`update-week-${week.id}`)

    try {
      await runCourseRequest(
        () => updateCourseWeek(week.id, { descriere }),
        "Nu am putut actualiza săptămâna.",
      )
      setWeeks((current) => current.map((currentWeek) => currentWeek.id === week.id ? { ...currentWeek, descriere } : currentWeek))
      setPageNotice("Săptămâna a fost actualizată.")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleDeleteWeek(week) {
    if (!window.confirm(`Ștergi săptămâna ${week.nrSaptamana}? Documentele asociate pot fi eliminate.`)) {
      return
    }

    setActiveAction(`delete-week-${week.id}`)

    try {
      await runCourseRequest(() => deleteCourseWeek(week.id), "Nu am putut șterge săptămâna.")
      setPageNotice("Săptămâna a fost ștearsă.")
      await loadCourseWorkflow()
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleUploadDocument(event, week) {
    event.preventDefault()
    const draft = uploadDrafts[week.id] ?? {}

    if (!draft.titlu?.trim() || !draft.file) {
      setPageError("Titlul și fișierul sunt obligatorii pentru upload.")
      return
    }

    setActiveAction(`upload-document-${week.id}`)

    try {
      await runCourseRequest(
        () => uploadWeekDocument(week.id, { titlu: draft.titlu, file: draft.file }),
        "Nu am putut încărca documentul.",
      )
      const refreshedDocuments = await listWeekDocuments(week.id)
      setUploadDrafts((current) => ({ ...current, [week.id]: { titlu: "", file: null } }))
      if (uploadFileInputRefs.current[week.id]) {
        uploadFileInputRefs.current[week.id].value = ""
      }
      setDocumentsByWeek((current) => ({ ...current, [week.id]: refreshedDocuments }))
      setPageNotice("Documentul a fost încărcat.")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleUpdateDocument(document, week) {
    const draft = documentDrafts[document.id] ?? {}
    const titlu = draft.titlu ?? document.titlu ?? ""

    if (!titlu.trim() && !draft.file) {
      setPageError("Adaugă un titlu sau alege un fișier nou pentru document.")
      return
    }

    setActiveAction(`update-document-${document.id}`)

    try {
      await runCourseRequest(
        () => updateWeekDocument(document.id, { titlu, file: draft.file }),
        "Nu am putut actualiza documentul.",
      )
      const refreshedDocuments = await listWeekDocuments(week.id)
      setDocumentDrafts((current) => ({ ...current, [document.id]: { titlu, file: null } }))
      if (documentFileInputRefs.current[document.id]) {
        documentFileInputRefs.current[document.id].value = ""
      }
      setDocumentsByWeek((current) => ({ ...current, [week.id]: refreshedDocuments }))
      setPageNotice("Documentul a fost actualizat.")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleDeleteDocument(document, week) {
    if (!window.confirm(`Ștergi documentul "${document.titlu}"?`)) {
      return
    }

    setActiveAction(`delete-document-${document.id}`)

    try {
      await runCourseRequest(() => deleteWeekDocument(document.id), "Nu am putut șterge documentul.")
      const refreshedDocuments = await listWeekDocuments(week.id)
      setDocumentsByWeek((current) => ({ ...current, [week.id]: refreshedDocuments }))
      setPageNotice("Documentul a fost șters.")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  async function handleRetryDocument(document, week) {
    if (!canRetryDocumentIngest(document)) {
      setPageError("Indexarea poate fi repornită doar pentru documente eronate.")
      return
    }

    setActiveAction(`retry-document-${document.id}`)

    try {
      await runCourseRequest(() => retryDocumentIngest(document.id), "Nu am putut reporni indexarea documentului.")
      const refreshedDocuments = await listWeekDocuments(week.id)
      setDocumentsByWeek((current) => ({ ...current, [week.id]: refreshedDocuments }))
      setPageNotice("Indexarea documentului a fost repornită.")
    } catch {
      // Error message is already mapped by runCourseRequest.
    } finally {
      setActiveAction("")
    }
  }

  function toggleWeekExpanded(weekId) {
    setExpandedWeekIds((current) => ({
      ...current,
      [weekId]: !current[weekId],
    }))
  }

  function toggleIndexWeekExpanded(weekId) {
    setIndexExpandedWeekIds((current) => ({
      ...current,
      [weekId]: !current[weekId],
    }))
  }

  function scrollToWeek(weekId) {
    setActiveTab("saptamani")
    setExpandedWeekIds((current) => ({ ...current, [weekId]: true }))
    setCourseIndexOpen(false)

    window.requestAnimationFrame(() => {
      document.getElementById(`course-week-${weekId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const [selectedThemeKey, setSelectedThemeKey] = useState(() => {
    try {
      const key = window.localStorage.getItem(`akadion:course-theme:${getThemeUserKey(user)}:${courseId}`)
      if (COURSE_THEME_KEYS.has(key)) return key
    } catch { }
    return "akadion"
  })

  useEffect(() => {
    try {
      const key = window.localStorage.getItem(`akadion:course-theme:${getThemeUserKey(user)}:${courseId}`)
      setSelectedThemeKey(COURSE_THEME_KEYS.has(key) ? key : "akadion")
    } catch {
      setSelectedThemeKey("akadion")
    }
  }, [user, courseId])

  const theme = getCourseTheme(selectedThemeKey)

  const lastWeekNumber = weeks.reduce((highest, week) => Math.max(highest, week.nrSaptamana ?? 0), 0)
  const tabs = ["saptamani"]
  if (canViewStudents) {
    tabs.push("studenti")
  }
  if (isAdmin || isStudent) {
    tabs.push("profesor")
  }
  const professorName = getProfessorName(course)
  const professorEmail = professorDetails?.mail || course?.profesorMail || "Email indisponibil"
  const professorFaculty = professorDetails?.facultate || "Facultate indisponibilă"
  const totalCourseDocuments = weeks.reduce((total, week) => total + (documentsByWeek[week.id]?.length ?? 0), 0)
  const courseIndexPanel = (
    <aside
      className="relative z-20 flex max-h-[70vh] w-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-[#e4d8cd] bg-linear-to-b from-[#f8fafc] via-[#fffdfa] to-[#fbf6f0] shadow-[18px_22px_54px_rgba(32,46,84,0.12)] lg:h-[calc(100vh-9rem)] lg:max-h-none lg:rounded-l-none lg:rounded-r-[2rem] lg:border-l-0"
      aria-label="Cuprins curs"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#e4d8cd] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Cuprins curs</h2>
          <p className="mt-1 text-sm text-slate-500">
            {weeks.length} săptămâni · {totalCourseDocuments} documente
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCourseIndexOpen(false)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#e4d8cd] bg-white text-slate-500 transition hover:bg-[#f7efe6] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24385b]/20"
          aria-label="Închide cuprins curs"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {weeks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#d8ccbf] bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
            Nu există săptămâni pentru acest curs.
          </div>
        ) : null}

        <div className="space-y-3">
          {weeks.map((week) => {
            const documents = documentsByWeek[week.id] ?? []
            const isIndexExpanded = indexExpandedWeekIds[week.id] ?? false

            return (
              <article key={week.id} className="overflow-hidden rounded-3xl border border-[#e4d8cd] bg-white shadow-[0_12px_30px_rgba(32,46,84,0.07)]">
                <div className="flex items-center gap-2 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleIndexWeekExpanded(week.id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-[#f7efe6] hover:text-slate-900"
                    aria-expanded={isIndexExpanded}
                    aria-label={`${isIndexExpanded ? "Închide" : "Deschide"} documentele săptămânii ${week.nrSaptamana}`}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isIndexExpanded ? "rotate-180" : "-rotate-90"}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToWeek(week.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[#f7efe6]"
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold", theme.weekNumBg, theme.weekNumText)}>
                      S{week.nrSaptamana}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">Săptămâna {week.nrSaptamana}</span>
                      <span className="block truncate text-xs font-medium text-slate-500">{documents.length} documente</span>
                    </span>
                  </button>
                </div>

                {isIndexExpanded ? (
                  <div className="border-t border-[#eee4da] bg-[#fbf7f1]/78 px-3 py-3">
                    {documents.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-[#d8ccbf] bg-white/70 px-3 py-3 text-sm text-slate-500">
                        Nu există documente în această săptămână.
                      </p>
                    ) : null}

                    <div className="space-y-2">
                      {documents.map((document) => {
                        const documentHref = getDocumentHref(document)
                        const filename = extractFilename(document.urlDescarcare)

                        if (!documentHref) {
                          return (
                            <div key={document.id} className="flex items-start gap-2 rounded-2xl border border-[#e4d8cd] bg-white/70 px-3 py-3 text-sm text-slate-400">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                              <span className="min-w-0 truncate">{document.titlu || filename || "Document indisponibil"}</span>
                            </div>
                          )
                        }

                        return (
                          <a
                            key={document.id}
                            href={documentHref}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setCourseIndexOpen(false)}
                            className="flex items-start gap-2 rounded-2xl border border-[#e4d8cd] bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#cdbca9] hover:bg-white hover:text-slate-950"
                            title={filename || document.titlu}
                          >
                            <FileText className={cn("mt-0.5 h-4 w-4 shrink-0", theme.fileIconText)} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{document.titlu || filename || "Document"}</span>
                              {filename ? <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{filename}</span> : null}
                            </span>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </aside>
  )

  return (
    <AppShell
      title={course?.denumire || "Detalii curs"}
      description={course ? course.descriere || `Începe la ${formatDisplayDate(course.dataInceput)}.` : "Se încarcă datele cursului."}
      eyebrow={isAdmin ? "Admin" : isStudent ? "Student" : "Profesor"}
      heroClassName={cn(
        "relative overflow-hidden border",
        theme.heroBg,
        theme.heroBorder
      )}
      heroEyebrowClassName={cn("font-bold tracking-[0.22em]", theme.heroStatLabel)}
      heroTitleClassName="text-slate-900 font-bold tracking-tight"
      heroDescriptionClassName="text-slate-600"
      heroContent={course ? (
        <div className="mt-1">
          {/* Accent bar */}
          <div
            className="mb-5 h-1 w-12 rounded-full opacity-80"
            style={{ backgroundColor: theme.heroAccent }}
          />
          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "Status", value: course.activ ? "Activ" : "Inactiv", icon: course.activ ? "●" : "○" },
              { label: "Perioadă", value: `${formatDisplayDate(course.dataInceput)} — ${formatDisplayDate(course.dataSfarsit)}`, small: true },
              { label: "Săptămâni", value: weeks.length },
              { label: "Profesor", value: getProfessorName(course), small: true },
            ].map(({ label, value, small, icon }) => (
              <div key={label} className={cn("rounded-2xl px-4 py-3", theme.heroStatBg)}>
                <p className={cn("text-[10px] font-bold tracking-[0.18em] uppercase", theme.heroStatLabel)}>{label}</p>
                <p className={cn("mt-1.5 font-semibold leading-tight", theme.heroStatText, small ? "text-sm" : "text-base")}>
                  {icon ? <span className="mr-1.5 text-xs opacity-70">{icon}</span> : null}{value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      actions={isStudent && course?.inscris ? (
        <Button type="button" variant="outline" onClick={handleWithdrawCourse} disabled={Boolean(activeAction)} className="rounded-2xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 shadow-xs">
          <Trash2 className="h-4 w-4" />
          Retragere
        </Button>
      ) : null}
      sideContent={!pageLoading && course && courseIndexOpen ? courseIndexPanel : null}
    >
      <div className="space-y-6">
        {!pageLoading && course ? (
          <>
            {!courseIndexOpen ? (
              <button
                type="button"
                onClick={() => setCourseIndexOpen(true)}
                className={cn(
                  "group fixed left-0 top-28 z-20 flex h-14 w-14 items-center justify-center rounded-r-[1.75rem] border border-l-0 bg-white/95 text-slate-700 shadow-[12px_14px_34px_rgba(32,46,84,0.14)] transition hover:w-16 hover:bg-white hover:text-slate-950 focus-visible:w-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24385b]/20",
                  theme.heroBorder,
                )}
                aria-label="Deschide cuprins curs"
              >
                <Menu className="h-5 w-5" />
                <span className="pointer-events-none absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Deschide cuprins curs
                </span>
              </button>
            ) : null}
          </>
        ) : null}

        {pageError ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}

        {pageNotice ? (
          <Alert className="rounded-3xl border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <AlertTitle>Actualizare reușită</AlertTitle>
            <AlertDescription className="text-emerald-800">{pageNotice}</AlertDescription>
          </Alert>
        ) : null}

        {pageLoading ? (
          <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardContent className="flex items-center gap-3 px-6 py-8 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Se încarcă fluxul cursului...
            </CardContent>
          </Card>
        ) : null}

        {!pageLoading && course ? (
          <>
            {canEdit ? (
              <Card className="gap-0 overflow-hidden rounded-[1.75rem] border-[#e4d8cd] bg-white/92 py-0 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
                <button
                  type="button"
                  onClick={() => setCourseEditorOpen((currentValue) => !currentValue)}
                  className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-[#fbf6f0] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  aria-expanded={courseEditorOpen}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg text-slate-900">Editare curs</CardTitle>
                      <StatusBadge className={course.activ ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>
                        {course.activ ? "Activ" : "Inactiv"}
                      </StatusBadge>
                    </div>
                    <CardDescription className="mt-1">Doar profesorul proprietar poate modifica datele cursului.</CardDescription>
                  </div>
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", theme.btnIconBg, theme.btnIconBorder, theme.btnIconText)}>
                    <ChevronDown className={`h-5 w-5 transition-transform ${courseEditorOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {courseEditorOpen ? (
                  <CardContent className="border-t border-[#eadfd4] px-5 py-5 sm:px-6 sm:py-6">
                    <form className="grid gap-5 lg:grid-cols-[1fr_220px]" onSubmit={handleSaveCourse}>
                      <div className="space-y-2.5">
                        <Label htmlFor="course-name" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">DENUMIRE *</Label>
                        <Input
                          id="course-name"
                          value={courseForm.denumire}
                          onChange={(event) => updateCourseField("denumire", event.target.value)}
                          className="h-13 rounded-2xl border-[#e4d8cd] bg-[#f7efe6] px-4 text-base shadow-none focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                        />
                        {fieldErrors.denumire ? <p className="text-sm text-rose-600">{fieldErrors.denumire}</p> : null}
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="course-start" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">DATA ÎNCEPUT *</Label>
                        <Input
                          id="course-start"
                          type="date"
                          value={courseForm.dataInceput}
                          onChange={(event) => updateCourseField("dataInceput", event.target.value)}
                          className="h-13 rounded-2xl border-[#e4d8cd] bg-[#f7efe6] px-4 text-base shadow-none focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                        />
                        {fieldErrors.dataInceput ? <p className="text-sm text-rose-600">{fieldErrors.dataInceput}</p> : null}
                      </div>

                      <div className="space-y-2.5 lg:col-span-2">
                        <Label htmlFor="course-description" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">DESCRIERE</Label>
                        <textarea
                          id="course-description"
                          value={courseForm.descriere}
                          onChange={(event) => updateCourseField("descriere", event.target.value)}
                          className="min-h-28 w-full rounded-2xl border border-[#e4d8cd] bg-[#f7efe6] px-4 py-3 text-base text-slate-900 outline-none focus:border-[#24385b] focus:ring-2 focus:ring-[#24385b]/10"
                        />
                        {fieldErrors.descriere ? <p className="text-sm text-rose-600">{fieldErrors.descriere}</p> : null}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:col-span-2">
                        <Button type="submit" disabled={Boolean(activeAction)} className={cn("rounded-2xl px-5 text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                          <Save className="h-4 w-4" />
                          {activeAction === "save-course" ? "Se salvează..." : "Salvează"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleToggleActive} disabled={Boolean(activeAction)} className="rounded-2xl border-[#d9ccbe] bg-white">
                          {activeAction === "toggle-course" ? "Se actualizează..." : course.activ ? "Dezactivează" : "Reactivează"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                ) : null}
              </Card>
            ) : null}

            <div className="flex w-fit max-w-full flex-wrap gap-2 rounded-[1.6rem] border border-[#e4d8cd] bg-white/74 p-2 shadow-[0_14px_34px_rgba(32,46,84,0.06)]">
              {tabs.map((tab) => (
                <DetailTab key={tab} active={activeTab === tab} theme={theme} onClick={() => setActiveTab(tab)}>
                  {tab === "saptamani" ? "Săptămâni" : tab === "studenti" ? "Studenți" : "Profesor"}
                </DetailTab>
              ))}
            </div>

            {activeTab === "saptamani" ? (
              <div className="space-y-6">
                {canEdit ? (
                  <Card className="gap-0 overflow-hidden rounded-[1.75rem] border-[#e4d8cd] bg-white/92 py-0 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
                    <button
                      type="button"
                      onClick={() => setNewWeekOpen((currentValue) => !currentValue)}
                      className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-[#fbf6f0] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      aria-expanded={newWeekOpen}
                    >
                      <div className="min-w-0">
                        <CardTitle className="text-lg text-slate-900">Săptămână nouă</CardTitle>
                        <CardDescription className="mt-1">Adaugă conținutul pentru următoarea săptămână a cursului.</CardDescription>
                      </div>
                      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", theme.btnIconBg, theme.btnIconBorder, theme.btnIconText)}>
                        <ChevronDown className={`h-5 w-5 transition-transform ${newWeekOpen ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {newWeekOpen ? (
                      <CardContent className="border-t border-[#eadfd4] px-5 py-5 sm:px-6 sm:py-6">
                        <form className="space-y-4" onSubmit={handleCreateWeek}>
                          <textarea
                            value={newWeekDescription}
                            onChange={(event) => setNewWeekDescription(event.target.value)}
                            placeholder="Descrierea săptămânii"
                            className="min-h-24 w-full rounded-2xl border border-[#e4d8cd] bg-[#f7efe6] px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#24385b] focus:ring-2 focus:ring-[#24385b]/10"
                          />
                          <Button type="submit" disabled={Boolean(activeAction)} className={cn("rounded-2xl text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                            <Plus className="h-4 w-4" />
                            {activeAction === "create-week" ? "Se adaugă..." : "Adaugă săptămâna"}
                          </Button>
                        </form>
                      </CardContent>
                    ) : null}
                  </Card>
                ) : null}

                <div className={cn("rounded-[1.75rem] border px-5 py-5 shadow-[0_14px_34px_rgba(32,46,84,0.04)] sm:px-6", theme.heroBg, theme.heroBorder)}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className={cn("text-xs font-semibold tracking-[0.18em] uppercase", theme.sectionLabel)}>Conținut curs</p>
                      <h2 className={cn("mt-1 text-2xl font-semibold tracking-tight", theme.sectionTitle)}>Săptămâni și documente</h2>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total: {weeks.length} săptămâni</p>
                  </div>
                </div>

                {weeks.length === 0 ? (
                  <Card className="rounded-[1.75rem] border-dashed border-[#d8ccbf] bg-[#fbf6f0]">
                    <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center text-slate-500">
                      <FileText className={cn("h-8 w-8", theme.iconText)} />
                      <div>
                        <p className="font-semibold text-slate-800">Nu există săptămâni pentru acest curs.</p>
                        <p className="mt-1 text-sm">Conținutul va apărea aici după ce este adăugat.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="space-y-5">
                  {weeks.map((week) => {
                    const documents = documentsByWeek[week.id] ?? []
                    const isExpanded = expandedWeekIds[week.id] ?? false

                    return (
                      <Card id={`course-week-${week.id}`} key={week.id} className={`scroll-mt-28 overflow-hidden rounded-[1.75rem] bg-white/94 shadow-[0_18px_48px_rgba(32,46,84,0.08)] ${isStudent && week.finalizata ? "border-emerald-200" : "border-[#e4d8cd]"}`}>
                        <div className="flex flex-col gap-4 border-b border-[#eadfd4] bg-[#fffdfa] px-5 py-5 sm:px-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <button
                              type="button"
                              onClick={() => toggleWeekExpanded(week.id)}
                              className="flex min-w-0 flex-1 items-start gap-4 text-left"
                            >
                              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold", isStudent && week.finalizata ? "bg-emerald-100 text-emerald-700" : cn(theme.weekNumBg, theme.weekNumText))}>
                                S{week.nrSaptamana}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xl font-semibold text-slate-900">Săptămâna {week.nrSaptamana}</h3>
                                  {isStudent && week.finalizata ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                      Finalizată
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                                  {week.descriere || "Fără descriere pentru această săptămână."}
                                </p>
                              </div>
                            </button>

                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pl-4">
                              <div className="text-right text-sm text-slate-500">
                                <p>{documents.length} documente{isStudent ? ` • ${week.finalizata ? "Finalizată" : "În progres"}` : ""}</p>
                              </div>
                              {canEdit && week.nrSaptamana === lastWeekNumber ? (
                                <Button type="button" variant="outline" onClick={() => handleDeleteWeek(week)} disabled={Boolean(activeAction)} className="rounded-2xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                                  <Trash2 className="h-4 w-4" />
                                  Șterge
                                </Button>
                              ) : null}
                              {isStudent ? (
                                <Button type="button" variant="outline" onClick={() => handleToggleWeekCompletion(week)} disabled={Boolean(activeAction) || !course?.inscris} className={cn("rounded-2xl border bg-white", theme.btnIconBorder, theme.sectionTitle)}>
                                  <CheckCircle2 className="h-4 w-4" />
                                  {activeAction === `toggle-week-${week.id}` ? "Se actualizează..." : week.finalizata ? "Marchează neparcursă" : "Marchează finalizată"}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => toggleWeekExpanded(week.id)}
                                className={cn("h-11 w-11 rounded-2xl border p-0", theme.btnIconBg, theme.btnIconBorder, theme.btnIconText)}
                              >
                                <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {isExpanded ? (
                          <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
                            {canEdit ? (
                              <div className="space-y-3 rounded-3xl border border-[#e4d8cd] bg-[#fbf6f0] p-4">
                                <div>
                                  <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Descriere săptămână</p>
                                  <p className="mt-1 text-sm text-slate-500">Actualizează pe scurt ce acoperă această etapă.</p>
                                </div>
                                <textarea
                                  value={weekDrafts[week.id] ?? ""}
                                  onChange={(event) => setWeekDrafts((current) => ({ ...current, [week.id]: event.target.value }))}
                                  className="min-h-24 w-full rounded-2xl border border-[#e4d8cd] bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[#24385b] focus:ring-2 focus:ring-[#24385b]/10"
                                />
                                <Button type="button" variant="outline" onClick={() => handleUpdateWeek(week)} disabled={Boolean(activeAction)} className="rounded-2xl border-[#d9ccbe] bg-white">
                                  <Save className="h-4 w-4" />
                                  {activeAction === `update-week-${week.id}` ? "Se salvează..." : "Salvează săptămâna"}
                                </Button>
                              </div>
                            ) : null}

                            {canEdit ? (
                              <form className="space-y-4 rounded-3xl border border-[#e4d8cd] bg-[#fbf6f0] p-4" onSubmit={(event) => handleUploadDocument(event, week)}>
                                <div>
                                  <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Document nou</p>
                                  <p className="mt-1 text-sm text-slate-500">Încarcă materiale pentru această săptămână.</p>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                                  <div className="space-y-2">
                                    <Label htmlFor={`upload-title-${week.id}`} className="text-xs font-semibold tracking-[0.16em] text-slate-600">TITLU DOCUMENT</Label>
                                    <Input
                                      id={`upload-title-${week.id}`}
                                      value={uploadDrafts[week.id]?.titlu ?? ""}
                                      onChange={(event) => setUploadDrafts((current) => ({ ...current, [week.id]: { ...current[week.id], titlu: event.target.value } }))}
                                      className="h-11 rounded-2xl border-[#e4d8cd] bg-white px-4 shadow-none focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`upload-file-${week.id}`} className="text-xs font-semibold tracking-[0.16em] text-slate-600">FIȘIER</Label>
                                    <Input
                                      id={`upload-file-${week.id}`}
                                      type="file"
                                      ref={(element) => {
                                        uploadFileInputRefs.current[week.id] = element
                                      }}
                                      onChange={(event) => setUploadDrafts((current) => ({ ...current, [week.id]: { ...current[week.id], file: event.target.files?.[0] ?? null } }))}
                                      className={cn("h-11 rounded-2xl border-[#e4d8cd] bg-white px-4 shadow-none file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold focus-visible:ring-[#24385b]/10", theme.fileIconText)}
                                    />
                                  </div>
                                  <Button type="submit" disabled={Boolean(activeAction)} className={cn("rounded-2xl text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                                    <Upload className="h-4 w-4" />
                                    {activeAction === `upload-document-${week.id}` ? "Se încarcă..." : "Upload"}
                                  </Button>
                                </div>
                              </form>
                            ) : null}

                            <div className="space-y-3">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                  <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Documente</p>
                                  <p className="text-sm text-slate-500">Materialele disponibile pentru săptămâna {week.nrSaptamana}.</p>
                                </div>
                                <span className="text-sm font-medium text-slate-500">{documents.length} documente</span>
                              </div>

                              {documents.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-[#d8ccbf] bg-[#fbf6f0] px-5 py-7 text-center text-sm text-slate-500">
                                  Nu există documente în această săptămână.
                                </div>
                              ) : null}

                              {documents.map((document) => {
                                const draft = documentDrafts[document.id] ?? {}
                                const canRetryIngest = canEdit && canRetryDocumentIngest(document)
                                const isEditing = Boolean(editingDocumentIds[document.id])
                                const currentFilename = extractFilename(document.urlDescarcare)
                                const previewUrl = document.urlVizualizare || document.urlDescarcare

                                return (
                                  <article key={document.id} className="rounded-3xl border border-[#e4d8cd] bg-white overflow-hidden">
                                    {/* View mode */}
                                    <div className="flex flex-col gap-0">
                                      <div className="flex items-start gap-3 p-4">
                                        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", theme.fileIconBg, theme.fileIconText)}>
                                          <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-slate-900">{document.titlu}</h3>
                                            <StatusBadge className={getDocumentStatusClasses(document)}>{getDocumentStatusLabel(document)}</StatusBadge>
                                          </div>
                                          {currentFilename ? (
                                            <div className="mt-1 flex items-center gap-1.5">
                                              {previewUrl ? (
                                                <a
                                                  href={previewUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className={cn("text-sm font-medium truncate underline-offset-4 hover:underline", theme.linkColor)}
                                                  title={currentFilename}
                                                >
                                                  📎 {currentFilename}
                                                </a>
                                              ) : (
                                                <span className="text-sm text-slate-500 truncate" title={currentFilename}>📎 {currentFilename}</span>
                                              )}
                                            </div>
                                          ) : null}
                                          {document.statusIndex === "ERONAT" && (
                                            <p className="mt-1 text-xs text-amber-600 font-medium">⚠ Fișier stocat, dar neindexat în AI. Apasă "Reîncearcă indexarea" pentru conectarea cu serviciul RAG.</p>
                                          )}
                                        </div>
                                        {canEdit ? (
                                          <div className="flex shrink-0 items-center gap-2">
                                            {canRetryIngest ? (
                                              <Button type="button" variant="outline" size="sm" onClick={() => handleRetryDocument(document, week)} disabled={Boolean(activeAction)} className="rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs gap-1.5">
                                                <RefreshCcw className="h-3.5 w-3.5" />
                                                Reîncearcă indexarea
                                              </Button>
                                            ) : null}
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setEditingDocumentIds((c) => ({ ...c, [document.id]: !c[document.id] }))}
                                              disabled={Boolean(activeAction)}
                                              className={cn("rounded-xl text-xs gap-1.5", isEditing ? "border-slate-300 bg-slate-100 text-slate-700" : cn("bg-white hover:bg-white/80", theme.btnIconBorder, theme.iconText))}
                                            >
                                              {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                                              {isEditing ? "Anulează" : "Editează"}
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteDocument(document, week)} disabled={Boolean(activeAction)} className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs gap-1.5">
                                              <Trash2 className="h-3.5 w-3.5" />
                                              Șterge
                                            </Button>
                                          </div>
                                        ) : (
                                          document.urlDescarcare ? (
                                            <a href={document.urlDescarcare} rel="noreferrer" className={cn("shrink-0 text-sm font-semibold underline-offset-4 hover:underline", theme.linkColor)}>
                                              Descarcă
                                            </a>
                                          ) : null
                                        )}
                                      </div>

                                      {/* Download link visible when can edit */}
                                      {canEdit && document.urlDescarcare ? (
                                        <div className="border-t border-[#f0eae3] px-4 py-2.5">
                                          <a href={document.urlDescarcare} download={currentFilename || true} rel="noreferrer" className={cn("text-sm font-medium underline-offset-4 hover:underline", theme.linkColor)}>
                                            ↓ Descarcă documentul
                                          </a>
                                        </div>
                                      ) : null}

                                      {/* Edit form — revealed only when editing */}
                                      {canEdit && isEditing ? (
                                        <div className="border-t border-[#e4d8cd] bg-[#faf6f1] p-4">
                                          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">Editare document</p>
                                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                                            <div className="space-y-1.5">
                                              <Label htmlFor={`document-title-${document.id}`} className="text-xs font-semibold tracking-[0.14em] text-slate-600">TITLU</Label>
                                              <Input
                                                id={`document-title-${document.id}`}
                                                value={draft.titlu ?? document.titlu ?? ""}
                                                onChange={(event) => setDocumentDrafts((current) => ({ ...current, [document.id]: { ...current[document.id], titlu: event.target.value } }))}
                                                className="h-11 rounded-2xl border-[#e4d8cd] bg-white px-4 shadow-none focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                                              />
                                            </div>
                                            <div className="space-y-1.5">
                                              <Label htmlFor={`document-file-${document.id}`} className="text-xs font-semibold tracking-[0.14em] text-slate-600">ÎNLOCUIEȘTE FIȘIERUL (OPȚIONAL)</Label>
                                              <Input
                                                id={`document-file-${document.id}`}
                                                type="file"
                                                ref={(element) => {
                                                  documentFileInputRefs.current[document.id] = element
                                                }}
                                                onChange={(event) => setDocumentDrafts((current) => ({ ...current, [document.id]: { ...current[document.id], file: event.target.files?.[0] ?? null } }))}
                                                className={cn("h-11 rounded-2xl border-[#e4d8cd] bg-white px-4 shadow-none file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold focus-visible:ring-[#24385b]/10", theme.fileIconText)}
                                              />
                                            </div>
                                            <Button
                                              type="button"
                                              onClick={async () => {
                                                await handleUpdateDocument(document, week)
                                                setEditingDocumentIds((c) => ({ ...c, [document.id]: false }))
                                              }}
                                              disabled={Boolean(activeAction)}
                                              className={cn("rounded-2xl text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}
                                            >
                                              <Save className="h-4 w-4" />
                                              {activeAction === `update-document-${document.id}` ? "Se salvează..." : "Salvează"}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </article>
                                )
                              })}
                            </div>
                          </CardContent>
                        ) : null}
                      </Card>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {activeTab === "studenti" ? (
              <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
                <CardHeader className="border-b border-[#eadfd4] px-6 py-6">
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                    <Users className={cn("h-5 w-5", theme.iconText)} />
                    Studenți înscriși
                  </CardTitle>
                  <CardDescription>Total: {students.length} studenți.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-6 py-6">
                  {students.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-[#d8ccbf] bg-[#fbf6f0] px-5 py-8 text-center text-sm text-slate-500">
                      Nu există studenți înscriși la acest curs.
                    </div>
                  ) : null}
                  {students.map((student) => (
                    <article key={student.id ?? student.mail} className="flex flex-col gap-2 rounded-3xl border border-[#e4d8cd] bg-[#fbf6f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold", theme.studentInitialBg, theme.studentInitialText)}>
                          {String(student.prenume || student.mail || "S").charAt(0).toUpperCase()}{String(student.nume || "").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{getStudentName(student)}</h3>
                          <p className="text-sm text-slate-500">{student.mail || "-"}</p>
                          {student.facultate ? <p className="text-sm text-slate-500">{student.facultate}</p> : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "profesor" ? (
              <Card className={cn("mx-auto w-full max-w-[25rem] overflow-hidden rounded-[1.65rem] border bg-white shadow-sm", theme.heroBorder)}>
                <CardContent className="flex flex-col p-0">
                  <div className={cn("relative flex overflow-hidden border-b px-5 py-4.5 text-left sm:px-6", theme.heroStatBg)}>
                    <div className="relative flex items-center gap-3.5 min-w-0">
                      <div className={cn("flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] border text-lg font-bold shadow-xs", theme.heroBorder, theme.weekNumBg, theme.weekNumText)}>
                        {getInitials(professorName)}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-[10px] font-bold tracking-[0.22em] uppercase", theme.heroStatLabel)}>Titular curs</p>
                        <h3 className={cn("mt-0.5 truncate text-lg font-bold tracking-tight", theme.heroStatText)}>{professorName}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3 bg-white px-5 py-5 text-left sm:px-6 sm:py-6">
                    <div className="flex items-center gap-3 rounded-[1.25rem] border border-[#e4d8cd] bg-[#fcf8f3] px-3.5 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5eee5] text-xl" aria-hidden="true">📧</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400">Email</p>
                        <p className="truncate text-sm font-semibold text-slate-800 sm:text-base">{professorEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-[1.25rem] border border-[#e4d8cd] bg-[#fcf8f3] px-3.5 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5eee5] text-xl" aria-hidden="true">🎓</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400">Facultate</p>
                        <p className="truncate text-sm font-semibold text-slate-800 sm:text-base">{professorFaculty}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <AkyChatWidget
              courseId={course?.id}
              courseTitle={course?.titlu || course?.denumire}
              enabled={isStudent}
            />
          </>
        ) : null}

        {!pageLoading && !course ? (
          <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardContent className="space-y-4 px-6 py-8 text-center text-slate-600">
              <p>Cursul cerut nu a putut fi găsit sau nu ai acces la el.</p>
              <Button type="button" onClick={() => navigate("/courses")} className={cn("rounded-2xl text-white", theme.btnPrimaryBg, theme.btnPrimaryHover)}>
                Înapoi la cursuri
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  )
}