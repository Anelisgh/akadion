import { Fragment, useEffect, useEffectEvent, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import axiosInstance from "@/api/axiosInstance"
import { useAuth } from "@/auth/useAuth"
import DashboardPage from "@/pages/DashboardPage"
import CoursesPage from "@/pages/CoursesPage"
import CourseDetailPage from "@/pages/CourseDetailPage"
import NewCoursePage from "@/pages/NewCoursePage"
import ProfilePage from "@/pages/ProfilePage"
import DiscoverAkyPage from "@/pages/DiscoverAkyPage"
import AdminAuditLogPage from "@/pages/AdminAuditLogPage"
import OwlHall from "@/pages/OwlHall"
import LogoutPage from "@/pages/LogoutPage"
import QuizPage from "@/pages/QuizPage"
import FlashcardsPage from "@/pages/FlashcardsPage"
import AppShell from "@/components/AppShell"
import { getRoleLabel, getUserDisplayName, getUserInitials, isAdminUser, isProfessorUser } from "@/lib/user"
import { startLogout } from "@/auth/logout"
import completeProfileLogo from "@/assets/logo_bufnita.png"
import akyRagLogo from "@/assets/logo_RAG-removebg-preview.png"

import {
  AlertCircle,
  Check,
  CheckCheck,
  UserCog,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react"
import { Link, Navigate, Route, Routes, useNavigate, useLocation, useSearchParams } from "react-router-dom"

const USER_STATES = ["ALL", "PENDING", "ACTIV", "INACTIV", "RESPINS", "INCOMPLET"]

const stateLabels = {
  ALL: "Toți",
  PENDING: "În așteptare",
  ACTIV: "Activi",
  RESPINS: "Respinși",
  INACTIV: "Inactivi",
  INCOMPLET: "Profil incomplet",
}

const stateBadgeClasses = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  ACTIV: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RESPINS: "border-rose-200 bg-rose-50 text-rose-700",
  INACTIV: "border-slate-200 bg-slate-100 text-slate-600",
  INCOMPLET: "border-indigo-200 bg-indigo-50 text-indigo-700",
}

const successMessages = {
  approve: "Cererea a fost acceptată.",
  reject: "Cererea a fost respinsă.",
  deactivate: "Utilizatorul a fost dezactivat.",
  activate: "Utilizatorul a fost reactivat.",
}

const routeByState = {
  INCOMPLET: "/complete-profile",
  PENDING: "/asteptare-aprobare",
  RESPINS: "/cerere-respinsa",
  INACTIV: "/cont-dezactivat",
  ACTIV: "/",
}

const ADMIN_USERS_PER_PAGE = 5

function getActiveHomeRoute() {
  return "/"
}

function formatDateTime(value) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getAdminUserState(user) {
  return user?.stare ?? user?.stareCont ?? "NECUNOSCUT"
}

function normalizeAdminFilter(value) {
  const normalizedValue = String(value || "").toUpperCase()
  return USER_STATES.includes(normalizedValue) ? normalizedValue : "ALL"
}

function getErrorMessage(error, fallbackMessage) {
  const status = error.response?.status
  const backendMessage = error.response?.data?.message ?? error.response?.data?.eroare

  if (backendMessage) {
    return backendMessage
  }

  if (status === 401) {
    return "Sesiunea a expirat. Autentifică-te din nou."
  }

  if (status === 403) {
    return "Nu ai permisiunea necesară pentru această acțiune."
  }

  if (status === 400) {
    return "Cererea trimisă nu este validă."
  }

  if (status === 404) {
    return "Resursa cerută nu a fost găsită."
  }

  if (status >= 500) {
    return "Serverul a răspuns cu o eroare. Încearcă din nou."
  }

  return fallbackMessage
}

function getFieldErrors(error) {
  const fieldErrors = error.response?.data?.campuri
  return fieldErrors && typeof fieldErrors === "object" ? fieldErrors : {}
}

function startLogin() {
  window.location.assign("/oauth2/authorization/keycloak")
}

function LoginRedirect() {
  useEffect(() => {
    startLogin()
  }, [])

  return <LoadingPage message="Redirecționare către autentificare..." />
}

function LoadingPage({ message = "Se verifică sesiunea curentă..." }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>AKADION</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}

function AuthErrorPage() {
  const { error } = useAuth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle>Nu am putut valida sesiunea</CardTitle>
          <CardDescription>{error || "A apărut o problemă de comunicare. Încearcă din nou."}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            Reîncearcă
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

function RequireAuthenticatedState({ allowedStates, children }) {
  const { loading, authenticated, user, error } = useAuth()

  if (loading) {
    return <LoadingPage />
  }

  if (error) {
    return <AuthErrorPage />
  }

  if (!authenticated) {
    return <LoginRedirect />
  }

  if (allowedStates && !allowedStates.includes(user?.stareCont)) {
    return <Navigate to={routeByState[user?.stareCont] ?? "/"} replace />
  }

  return children
}

function RequireAdmin({ children }) {
  const { loading, authenticated, user, error } = useAuth()

  if (loading) {
    return <LoadingPage />
  }

  if (error) {
    return <AuthErrorPage />
  }

  if (!authenticated) {
    return <LoginRedirect />
  }

  if (user?.stareCont !== "ACTIV") {
    return <Navigate to={routeByState[user?.stareCont] ?? "/"} replace />
  }

  if (!isAdminUser(user)) {
    return <AccessDeniedPage />
  }

  return children
}

function LegacyUsersRedirect() {
  const { loading, authenticated, user, error } = useAuth()

  if (loading) {
    return <LoadingPage />
  }

  if (error) {
    return <AuthErrorPage />
  }

  if (!authenticated) {
    return <LoginRedirect />
  }

  if (user?.stareCont !== "ACTIV") {
    return <Navigate to={routeByState[user?.stareCont] ?? "/"} replace />
  }

  return <Navigate to={getActiveHomeRoute(user)} replace />
}

function RequireActiveProfessor({ children }) {
  const { loading, authenticated, user, error } = useAuth()

  if (loading) {
    return <LoadingPage />
  }

  if (error) {
    return <AuthErrorPage />
  }

  if (!authenticated) {
    return <LoginRedirect />
  }

  if (user?.stareCont !== "ACTIV") {
    return <Navigate to={routeByState[user?.stareCont] ?? "/"} replace />
  }

  if (!isProfessorUser(user)) {
    return <Navigate to="/" replace />
  }

  return children
}

function ActiveHomePage() {
  return <DashboardPage />
}

function RootRoute() {
  if (window.sessionStorage.getItem("akadion:logout-success-pending") === "1") {
    return <Navigate to="/logout-success" replace />
  }

  return (
    <RequireAuthenticatedState allowedStates={["ACTIV"]}>
      <ActiveHomePage />
    </RequireAuthenticatedState>
  )
}

function UserStateBadge({ state, label, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase ${stateBadgeClasses[state] ?? "border-slate-200 bg-slate-50 text-slate-600"} ${className}`}
    >
      {label ?? stateLabels[state] ?? state}
    </span>
  )
}

function UserRoleBadge({ role }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#d9ccbe] bg-white px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#4A5681] uppercase">
      {role ? getRoleLabel(role) : "-"}
    </span>
  )
}

function CompleteProfilePage() {
  const navigate = useNavigate()
  const { user, refreshAuth } = useAuth()
  const [formData, setFormData] = useState({
    nume: "",
    prenume: "",
    facultate: "",
    rolDorit: "",
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const profileSteps = [
    { id: 1, label: "Cont", stateText: "Pasul 1 finalizat", state: "completed" },
    { id: 2, label: "Profil", stateText: "Pasul 2 curent", state: "current" },
  ]

  useEffect(() => {
    if (user) {
      setFormData((current) => ({
        ...current,
        nume: current.nume || user.nume || "",
        prenume: current.prenume || user.prenume || "",
      }))
    }
  }, [user])

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: "" }))
    setSubmitError("")
  }

  function validateForm() {
    const nextErrors = {}

    if (!formData.nume.trim()) {
      nextErrors.nume = "Numele este obligatoriu."
    }

    if (!formData.prenume.trim()) {
      nextErrors.prenume = "Prenumele este obligatoriu."
    }

    if (!formData.rolDorit) {
      nextErrors.rolDorit = "Alege rolul dorit."
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      await axiosInstance.post("/api/auth/complete-profile", {
        nume: formData.nume.trim(),
        prenume: formData.prenume.trim(),
        facultate: formData.facultate.trim(),
        rolDorit: formData.rolDorit,
      })
      await refreshAuth()
      navigate("/asteptare-aprobare", { replace: true })
    } catch (error) {
      setFieldErrors((current) => ({ ...current, ...getFieldErrors(error) }))
      setSubmitError(getErrorMessage(error, "Nu am putut salva profilul."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="complete-profile-page min-h-screen text-slate-900">
      <div className="complete-profile-layout">
        <section className="complete-profile-brand-panel">
          <div className="complete-profile-brand-content">
            {/* Brand header — identic cu Keycloak */}
            <div className="brand-header">
              <div className="brand-header__left">
                <img src={completeProfileLogo} alt="Akadion" className="brand-logo" />
                <div className="brand-header__copy">
                  <span className="brand-caption">Curiozitate fără limite</span>
                </div>
              </div>
            </div>

            {/* Brand copy — identic cu Keycloak */}
            <div className="brand-copy brand-copy--single">
              <h1 className="brand-title">
                Înveți ce iubești, în ritmul tău.
              </h1>
              <p className="brand-description">
                Aici nu ești legat de programa fixă a specializării tale — alegi
                cursurile care te interesează, fie din domeniul tău, fie din altele.
                Urmărești materialele, îți vezi progresul săptămânal și înveți din
                curiozitate și dorința de a descoperi lucruri noi.
              </p>

              {/* Beneficii — identice cu Keycloak (SVG-uri identice) */}
              <div className="brand-benefits">
                <div className="brand-benefit-card">
                  <span className="brand-benefit-card__icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </span>
                  <span className="brand-benefit-card__copy">
                    <span>Cursuri alese de tine</span>
                  </span>
                </div>
                <div className="brand-benefit-card">
                  <span className="brand-benefit-card__icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                      <polyline points="16 7 22 7 22 13"/>
                    </svg>
                  </span>
                  <span className="brand-benefit-card__copy">
                    <span>Progres urmărit săptămânal</span>
                  </span>
                </div>
                <div className="brand-benefit-card">
                  <span className="brand-benefit-card__icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </span>
                  <span className="brand-benefit-card__copy">
                    <span>Acces pentru studenți și profesori</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="complete-profile-form-panel">
          <div className="mx-auto w-full max-w-xl">
            {/* Badge Aky RAG — aliniat la dreapta identic cu Keycloak */}
            <div className="flex w-full justify-end">
              <div className="auth-aky-badge" aria-label="Aky AI Assistant">
                <div className="auth-aky-badge__logo-shell">
                  <img src={akyRagLogo} alt="Aky AI" className="auth-aky-badge__logo" />
                </div>
                <div className="auth-aky-badge__copy">
                  <span className="auth-aky-badge__eyebrow">Powered by</span>
                  <span className="auth-aky-badge__title">Aky RAG</span>
                  <span className="auth-aky-badge__subtitle">Asistent pentru materiale academice</span>
                </div>
              </div>
            </div>

            {/* Stepper original */}
            <div className="complete-profile-stepper">
              {profileSteps.map(({ id, label, stateText, state }, index) => {
                const isCurrent = state === "current"
                const isCompleted = state === "completed"

                return (
                  <Fragment key={id}>
                    <div className={`complete-profile-stepper-item ${isCurrent ? "is-current" : "is-completed"}`}>
                      <div className="complete-profile-stepper-badge">
                        {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : id}
                      </div>
                      <div className="flex flex-col">
                        <span className="block">{label}</span>
                        <span className="complete-profile-stepper-state">{stateText}</span>
                      </div>
                    </div>
                    {index < profileSteps.length - 1 ? <div className="complete-profile-stepper-connector" /> : null}
                  </Fragment>
                )
              })}
            </div>

            <div className="complete-profile-card">
              <div className="space-y-2 pb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Completează profilul</h1>
                <p className="text-sm text-slate-500">
                  Pasul final. Introdu datele necesare pentru continuare.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {submitError ? (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nu am putut salva profilul</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="last-name" className="text-sm font-medium text-slate-700">
                      Nume <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="last-name"
                      value={formData.nume}
                      onChange={(event) => updateField("nume", event.target.value)}
                      placeholder="Ex: Popescu"
                      className="h-12 rounded-xl border-[#d8dcef] bg-[#fef9f3] px-4 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-[#595f8f] focus-visible:ring-[#595f8f]/10"
                    />
                    {fieldErrors.nume ? <p className="text-sm text-rose-600">{fieldErrors.nume}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first-name" className="text-sm font-medium text-slate-700">
                      Prenume <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="first-name"
                      value={formData.prenume}
                      onChange={(event) => updateField("prenume", event.target.value)}
                      placeholder="Ex: Andrei"
                      className="h-12 rounded-xl border-[#d8dcef] bg-[#fef9f3] px-4 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-[#595f8f] focus-visible:ring-[#595f8f]/10"
                    />
                    {fieldErrors.prenume ? <p className="text-sm text-rose-600">{fieldErrors.prenume}</p> : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faculty" className="text-sm font-medium text-slate-700">
                    Facultatea
                  </Label>
                  <Input
                    id="faculty"
                    value={formData.facultate}
                    onChange={(event) => updateField("facultate", event.target.value)}
                    placeholder="Ex: Facultatea de Informatică"
                    className="h-12 rounded-xl border-[#d8dcef] bg-[#fef9f3] px-4 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-[#595f8f] focus-visible:ring-[#595f8f]/10"
                  />
                  {fieldErrors.facultate ? <p className="text-sm text-rose-600">{fieldErrors.facultate}</p> : null}
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-700">
                    Rol <span className="text-rose-500">*</span>
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "STUDENT", label: "Student" },
                      { value: "PROFESOR", label: "Profesor" },
                    ].map(({ value, label }) => {
                      const isSelected = formData.rolDorit === value

                      return (
                        <label
                          key={value}
                          className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-semibold transition focus-within:border-[#24385b] focus-within:ring-2 focus-within:ring-[#24385b]/15 ${isSelected
                            ? "border-[#24385b] bg-[#24385b] text-white shadow-[0_8px_20px_rgba(36,56,91,0.18)]"
                            : "border-[#d8dcef] bg-[#fef9f3] text-slate-600 hover:border-[#24385b]/45"
                            }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={value}
                            checked={isSelected}
                            onChange={() => updateField("rolDorit", value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      )
                    })}
                  </div>
                  {fieldErrors.rolDorit ? <p className="text-sm text-rose-600">{fieldErrors.rolDorit}</p> : null}
                </fieldset>

                <Alert className="rounded-2xl border-[#d8dcef] bg-[#fbf6f0] px-4 py-3 text-slate-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-[#24385b]" />
                  <AlertTitle className="mb-0.5 text-sm font-semibold text-slate-900">Aprobare manuală</AlertTitle>
                  <AlertDescription className="text-xs leading-5 text-slate-600">
                    Contul necesită aprobare din partea echipei Akadion.
                  </AlertDescription>
                </Alert>

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary btn-block btn-lg text-sm font-semibold"
                  >
                    {isSubmitting ? "Se trimite..." : "Trimite cererea"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function AdminUsersPage() {
  const { refreshAuth } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedState = normalizeAdminFilter(searchParams.get("stare"))
  const [allUsers, setAllUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [pageNotice, setPageNotice] = useState("")
  const [activeAction, setActiveAction] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const stateCounts = allUsers.reduce(
    (accumulator, user) => {
      const state = getAdminUserState(user)
      accumulator[state] = (accumulator[state] ?? 0) + 1
      return accumulator
    },
    { PENDING: 0, ACTIV: 0, INACTIV: 0, RESPINS: 0, INCOMPLET: 0 },
  )

  const tabs = USER_STATES.filter((state) => state !== "INCOMPLET" || stateCounts.INCOMPLET > 0 || selectedState === "INCOMPLET")
  const visibleUsers = selectedState === "ALL"
    ? allUsers
    : allUsers.filter((user) => getAdminUserState(user) === selectedState)
  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / ADMIN_USERS_PER_PAGE))
  const pageStart = (currentPage - 1) * ADMIN_USERS_PER_PAGE
  const paginatedUsers = visibleUsers.slice(pageStart, pageStart + ADMIN_USERS_PER_PAGE)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  async function loadUsers() {
    setUsersLoading(true)
    setPageError("")

    try {
      const response = await axiosInstance.get("/api/admin/users", {
        params: { stare: "ALL" },
      })
      setAllUsers(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshAuth()
      }
      setPageError(getErrorMessage(error, "Nu am putut încărca utilizatorii."))
    } finally {
      setUsersLoading(false)
    }
  }

  const syncAdminPage = useEffectEvent(async () => {
    await loadUsers()
  })

  useEffect(() => {
    syncAdminPage()
  }, [])

  function handleFilterChange(state) {
    setCurrentPage(1)
    setSearchParams(state === "ALL" ? {} : { stare: state })
  }

  async function handleUserAction(userId, action) {
    if (action === "reject" && !window.confirm("Confirmi respingerea acestei cereri?")) {
      return
    }

    if (action === "deactivate" && !window.confirm("Confirmi dezactivarea acestui cont?")) {
      return
    }

    setActiveAction(`${action}-${userId}`)
    setPageError("")
    setPageNotice("")

    try {
      const method = action === "approve" || action === "reject" ? "patch" : "post"
      await axiosInstance[method](`/api/admin/users/${userId}/${action}`)
      setPageNotice(successMessages[action] ?? "Acțiunea a fost aplicată.")
      await loadUsers()
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshAuth()
      }
      setPageError(getErrorMessage(error, "Acțiunea nu a putut fi finalizată."))
    } finally {
      setActiveAction("")
    }
  }

  return (
    <AppShell
      title="Utilizatori"
      description={`Total: ${usersLoading ? "..." : allUsers.length}. Cereri pending: ${usersLoading ? "..." : stateCounts.PENDING}.`}
      eyebrow="Akadion Admin"
      heroClassName="relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
    >
      <div className="space-y-5">
        {pageError ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare la încărcare</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}

        {pageNotice ? (
          <Alert className="rounded-3xl border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <CheckCheck className="h-4 w-4 text-emerald-700" />
            <AlertTitle>Actualizare reușită</AlertTitle>
            <AlertDescription className="text-emerald-800">{pageNotice}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="admin-users-surface rounded-[1.75rem] border-0 py-0 shadow-[0_22px_60px_rgba(32,46,84,0.12)]">
          <CardHeader className="border-b border-[#e4d8cd] px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                  <UserCog className="h-5 w-5 text-[#4A5681]" />
                  Lista utilizatori
                </CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-slate-500">
                  Gestionează utilizatorii și filtrează lista după stare.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-[#e4d8cd] bg-white px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Afișați</p>
                <p className="text-2xl font-semibold text-slate-900">{usersLoading ? "..." : visibleUsers.length}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 py-6 sm:px-7">
            <div className="flex flex-wrap gap-2">
              {tabs.map((state) => {
                const isSelected = selectedState === state
                const count = state === "ALL" ? allUsers.length : stateCounts[state] ?? 0

                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => handleFilterChange(state)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${isSelected
                      ? "border-[#24385b] bg-[#24385b] text-white shadow-sm"
                      : "border-[#d8ccbf] bg-white text-slate-700 hover:bg-[#f7efe6] hover:text-[#24385b]"
                      }`}
                  >
                    {stateLabels[state] ?? state}
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{usersLoading ? "..." : count}</span>
                  </button>
                )
              })}
            </div>

            {usersLoading ? <p className="text-sm text-slate-500">Se încarcă utilizatorii...</p> : null}

            {!usersLoading && visibleUsers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#d8ccbf] bg-[#fbf6f0] px-5 py-8 text-center text-sm text-slate-500">
                Nu există utilizatori pentru filtrul selectat.
              </div>
            ) : null}

            {paginatedUsers.map((user) => {
              const state = getAdminUserState(user)
              const role = user.rolDorit || user.rol
              const isAccepting = activeAction === `approve-${user.id}`
              const isRejecting = activeAction === `reject-${user.id}`
              const isActivating = activeAction === `activate-${user.id}`
              const isDeactivating = activeAction === `deactivate-${user.id}`
              const canReview = state === "PENDING"
              const canActivate = state === "INACTIV"
              const canDeactivate = state === "ACTIV"

              return (
                <article key={`${state}-${user.id ?? user.mail}`} className="admin-user-entry">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eef1fb] text-base font-semibold text-[#4A5681]">
                        {getUserInitials(user)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-slate-900">{getUserDisplayName(user)}</h2>
                          <UserRoleBadge role={role} />
                          <UserStateBadge state={state} />
                        </div>

                        <p className="truncate text-sm font-medium text-slate-600">{user.mail || "-"}</p>

                        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                          <p><span className="font-semibold text-slate-900">Facultate:</span> {user.facultate || "-"}</p>
                          <p><span className="font-semibold text-slate-900">Creat la:</span> {formatDateTime(user.createdAt)}</p>
                          <p><span className="font-semibold text-slate-900">Respingeri anterioare:</span> {user.nrRespingeriAnterioare ?? 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {canReview ? (
                        <>
                          <Button
                            type="button"
                            onClick={() => handleUserAction(user.id, "approve")}
                            disabled={Boolean(activeAction)}
                            className="rounded-xl bg-[#4A5681] px-4 text-white hover:bg-[#3f4a72]"
                          >
                            <Check className="h-4 w-4" />
                            {isAccepting ? "Se aprobă..." : "Aprobă"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleUserAction(user.id, "reject")}
                            disabled={Boolean(activeAction)}
                            className="rounded-xl border-rose-200 bg-rose-50 px-4 text-rose-700 hover:bg-rose-100"
                          >
                            <X className="h-4 w-4" />
                            {isRejecting ? "Se respinge..." : "Respinge"}
                          </Button>
                        </>
                      ) : null}

                      {canDeactivate ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleUserAction(user.id, "deactivate")}
                          disabled={Boolean(activeAction)}
                          className="rounded-xl border-amber-200 bg-amber-50 px-4 text-amber-700 hover:bg-amber-100"
                        >
                          <UserMinus className="h-4 w-4" />
                          {isDeactivating ? "Se dezactivează..." : "Dezactivează"}
                        </Button>
                      ) : null}

                      {canActivate ? (
                        <Button
                          type="button"
                          onClick={() => handleUserAction(user.id, "activate")}
                          disabled={Boolean(activeAction)}
                          className="rounded-xl bg-[#4A5681] px-4 text-white hover:bg-[#3f4a72]"
                        >
                          <UserPlus className="h-4 w-4" />
                          {isActivating ? "Se reactivează..." : "Reactivează"}
                        </Button>
                      ) : null}

                      {!canReview && !canActivate && !canDeactivate ? (
                        <span className="inline-flex items-center rounded-xl border border-[#ddd3c7] bg-[#f8f2eb] px-3 py-2 text-sm text-slate-500">
                          Nicio acțiune disponibilă pentru această stare.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}

            {!usersLoading && visibleUsers.length > ADMIN_USERS_PER_PAGE ? (
              <div className="flex justify-end pt-2">
                <div className="flex flex-wrap justify-end gap-2">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const pageNumber = index + 1
                    const isCurrent = pageNumber === currentPage

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${isCurrent
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
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

function StatusPage({ title, description, accentState, accentLabel, accentClassName, primaryAction, secondaryAction }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl border-border/60 bg-card/95 shadow-sm">
        <CardHeader className="space-y-4 text-center">
          <img src={completeProfileLogo} alt="Akadion" className="mx-auto h-20 w-auto object-contain" />
          <div className="space-y-3">
            <div className="flex justify-center">
              <UserStateBadge state={accentState} label={accentLabel} className={accentClassName} />
            </div>
            {title ? <CardTitle className="text-3xl tracking-tight">{title}</CardTitle> : null}
            <CardDescription className="mx-auto max-w-xl text-base leading-7">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-center gap-3">
          {primaryAction}
          {secondaryAction}
        </CardContent>
      </Card>
    </main>
  )
}

function PendingApprovalPage() {

  return (
    <StatusPage
      description="Profilul a fost trimis cu succes. Un administrator va verifica datele, iar după aprobare vei putea intra în aplicație."
      accentState="PENDING"
      accentLabel="Cererea este în așteptare"
      primaryAction={
        <Button onClick={startLogout} variant="outline" size="lg" className="px-8 text-base">
          Logout
        </Button>
      }
    />
  )
}

function RejectedRequestPage() {
  return (
    <StatusPage
      description="Cererea ta a fost respinsă. Editează profilul pentru a retrimite datele corectate. Dacă te deconectezi, revino folosind opțiunea Login."
      accentState="RESPINS"
      accentLabel="Cerere respinsă"
      primaryAction={
        <Button asChild size="lg" className="px-8 text-base">
          <Link to="/complete-profile">Editează profilul</Link>
        </Button>
      }
      secondaryAction={
        <Button onClick={startLogout} variant="outline" size="lg" className="px-8 text-base">
          Logout
        </Button>
      }
    />
  )
}

function DeactivatedAccountPage() {

  return (
    <StatusPage
      description="Contul tău a fost dezactivat de un administrator. Pentru clarificări, contactează echipa Akadion."
      accentState="INACTIV"
      accentLabel="CONT DEZACTIVAT"
      accentClassName="border-slate-200 bg-slate-50 px-5 py-1.5 text-sm text-slate-700"
      primaryAction={
        <Button onClick={startLogout} variant="outline" size="lg" className="bg-white px-8 text-base text-black hover:bg-white hover:text-black">
          Logout
        </Button>
      }
    />
  )
}

function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Acces interzis</CardTitle>
          <CardDescription>Pagina de administrare este disponibilă doar utilizatorilor cu rol ADMIN.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          <Button asChild>
            <Link to="/">Mergi la home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Pagină inexistentă</CardTitle>
          <CardDescription>Pagina pe care o cauți nu există.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">Mergi la home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

function App() {
  const location = useLocation()

  useEffect(() => {
    const routeTitles = {
      "/": "Acasă",
      "/complete-profile": "Finalizare Profil",
      "/asteptare-aprobare": "Așteptare Aprobare",
      "/cerere-respinsa": "Cerere Respinsă",
      "/cont-dezactivat": "Cont Dezactivat",
      "/logout-success": "Logout Finalizat",
      "/courses": "Cursuri",
      "/courses/new": "Adaugă Curs",
      "/quiz": "Quiz",
      "/flashcards": "Flashcards",
      "/profile": "Profilul Meu",
      "/discover-aky": "Descoperă Aky",
      "/owl-hall": "Galeria Bufnițelor Legendare",
      "/users": "Utilizatori",
      "/admin/users": "Administrare Utilizatori",
      "/admin/audit-log": "Istoric modificări",
    }

    let title = "AKADION - Platformă Academică"
    if (routeTitles[location.pathname]) {
      title = `${routeTitles[location.pathname]} - AKADION`
    } else if (location.pathname.startsWith("/courses/")) {
      title = "Detalii Curs - AKADION"
    }

    document.title = title
  }, [location])

  return (
    <Routes>
      <Route
        path="/"
        element={<RootRoute />}
      />
      <Route
        path="/complete-profile"
        element={
          <RequireAuthenticatedState allowedStates={["INCOMPLET", "RESPINS"]}>
            <CompleteProfilePage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/asteptare-aprobare"
        element={
          <RequireAuthenticatedState allowedStates={["PENDING"]}>
            <PendingApprovalPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/cerere-respinsa"
        element={
          <RequireAuthenticatedState allowedStates={["RESPINS"]}>
            <RejectedRequestPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/cont-dezactivat"
        element={
          <RequireAuthenticatedState allowedStates={["INACTIV"]}>
            <DeactivatedAccountPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/logout-success"
        element={<LogoutPage />}
      />
      <Route
        path="/courses"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <CoursesPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/courses/new"
        element={
          <RequireActiveProfessor>
            <NewCoursePage />
          </RequireActiveProfessor>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <CourseDetailPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/quiz"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <QuizPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/flashcards"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <FlashcardsPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <ProfilePage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/discover-aky"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <DiscoverAkyPage />
          </RequireAuthenticatedState>
        }
      />
      <Route
        path="/owl-hall"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <OwlHall />
          </RequireAuthenticatedState>
        }
      />
      <Route path="/users" element={<LegacyUsersRedirect />} />
      <Route
        path="/admin/users"
        element={
          <RequireAdmin>
            <AdminUsersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <RequireAdmin>
            <AdminAuditLogPage />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App




