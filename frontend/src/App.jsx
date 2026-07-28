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
import AppShell from "@/components/AppShell"
import { getRoleLabel, getUserDisplayName, getUserInitials, isAdminUser, isProfessorUser } from "@/lib/user"
import { startLogout } from "@/auth/logout"
import completeProfileLogo from "../folder_inspiratie2/logo_bufnita.jpeg"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  RefreshCcw,
  Sparkles,
  UserCog,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react"
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom"

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

  return <Navigate to={isAdminUser(user) ? "/admin/users" : getActiveHomeRoute(user)} replace />
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

function UserStateBadge({ state, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase ${stateBadgeClasses[state] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}
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
  const brandBenefits = [
    "Cursuri alese de tine",
    "Progres urmărit săptămânal",
    "Acces pentru studenți și profesori",
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
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Înapoi
            </Link>

            <div className="complete-profile-brand-header">
              <div className="complete-profile-brand-logo-shell">
                <img src={completeProfileLogo} alt="Akadion" className="h-full w-full rounded-xl object-cover" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">Akadion</p>
                <p className="text-sm text-white/72">Profil academic verificat manual</p>
              </div>
            </div>

            <div className="complete-profile-brand-copy">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Înveți ce iubești, în ritmul tău.
              </h1>
              <p className="max-w-xl text-base leading-8 text-white/80 sm:text-lg sm:leading-9">
                Aici nu ești legat de programa fixă a specializării tale. Alegi
                cursurile care te interesează, îți vezi progresul săptămânal și
                înveți din curiozitate.
              </p>
            </div>

            <div className="complete-profile-brand-benefits">
              {[
                { icon: Clock3, title: brandBenefits[0] },
                { icon: Sparkles, title: brandBenefits[1] },
                { icon: AlertCircle, title: brandBenefits[2] },
              ].map(({ icon: Icon, title }) => (
                <div key={title} className="complete-profile-brand-benefit-card">
                  <div className="complete-profile-brand-benefit-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-base font-medium text-white/90">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="complete-profile-form-panel">
          <div className="mx-auto w-full max-w-xl">
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
              <div className="space-y-3 pb-6">
                <p className="complete-profile-eyebrow">Cont AKADION</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Completează profilul</h1>
                <p className="text-base leading-7 text-slate-500">
                  Pasul final. Introdu datele necesare pentru continuare.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {submitError ? (
                  <Alert variant="destructive" className="rounded-3xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nu am putut salva profilul</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label htmlFor="last-name" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">
                      NUME *
                    </Label>
                    <Input
                      id="last-name"
                      value={formData.nume}
                      onChange={(event) => updateField("nume", event.target.value)}
                      placeholder="Ex: Popescu"
                      className="h-13 rounded-2xl border-[#e4d8cd] bg-[#f7efe6] px-4 text-base shadow-none placeholder:text-slate-400 focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                    />
                    {fieldErrors.nume ? <p className="text-sm text-rose-600">{fieldErrors.nume}</p> : null}
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="first-name" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">
                      PRENUME *
                    </Label>
                    <Input
                      id="first-name"
                      value={formData.prenume}
                      onChange={(event) => updateField("prenume", event.target.value)}
                      placeholder="Ex: Andrei"
                      className="h-13 rounded-2xl border-[#e4d8cd] bg-[#f7efe6] px-4 text-base shadow-none placeholder:text-slate-400 focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                    />
                    {fieldErrors.prenume ? <p className="text-sm text-rose-600">{fieldErrors.prenume}</p> : null}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="faculty" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">
                    FACULTATEA
                  </Label>
                  <Input
                    id="faculty"
                    value={formData.facultate}
                    onChange={(event) => updateField("facultate", event.target.value)}
                    placeholder="Ex: Facultatea de Informatică"
                    className="h-13 rounded-2xl border-[#e4d8cd] bg-[#f7efe6] px-4 text-base shadow-none placeholder:text-slate-400 focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                  />
                  {fieldErrors.facultate ? <p className="text-sm text-rose-600">{fieldErrors.facultate}</p> : null}
                </div>
                <fieldset className="space-y-2.5">
                  <legend className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">
                    ROL *
                  </legend>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "STUDENT", label: "Student" },
                      { value: "PROFESOR", label: "Profesor" },
                    ].map(({ value, label }) => {
                      const isSelected = formData.rolDorit === value

                      return (
                        <label
                          key={value}
                          className={`flex h-13 cursor-pointer items-center justify-center rounded-2xl border px-4 text-base font-semibold transition focus-within:border-[#24385b] focus-within:ring-2 focus-within:ring-[#24385b]/15 ${
                            isSelected
                              ? "border-[#24385b] bg-[#24385b] text-white shadow-[0_14px_30px_rgba(36,56,91,0.18)]"
                              : "border-[#e4d8cd] bg-[#f7efe6] text-slate-600 hover:border-[#24385b]/45"
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

                <Alert className="rounded-3xl border-[#e4d8cd] bg-[#f6efe6] px-4 py-4 text-slate-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-[#24385b]" />
                  <AlertTitle className="mb-1 font-semibold text-slate-900">Aprobare manuală</AlertTitle>
                  <AlertDescription className="text-sm leading-7 text-slate-600">
                    Contul necesită aprobare din partea echipei Akadion.
                  </AlertDescription>
                </Alert>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 w-full rounded-2xl bg-[#d8ccbf] text-lg font-semibold text-white hover:bg-[#cdbdac]"
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
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                      isSelected
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
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

function StatusPage({ title, description, accentState, accentLabel, primaryAction, secondaryAction }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl border-border/60 bg-card/95 shadow-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#f7efe6] p-1.5">
            <img src={completeProfileLogo} alt="Akadion" className="h-full w-full rounded-xl object-cover" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-center">
              <UserStateBadge state={accentState} label={accentLabel} />
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
      title="Cont dezactivat"
      description="Contul tău a fost dezactivat de un administrator. Pentru clarificări, contactează echipa Akadion."
      accentState="INACTIV"
      primaryAction={
        <Button onClick={startLogout} size="lg" className="px-8 text-base">
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
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <ActiveHomePage />
          </RequireAuthenticatedState>
        }
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
        path="/profile"
        element={
          <RequireAuthenticatedState allowedStates={["ACTIV"]}>
            <ProfilePage />
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App