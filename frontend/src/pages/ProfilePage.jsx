import { useEffect, useState } from "react"
import { CheckCircle2, KeyRound, ShieldCheck, UserRound } from "lucide-react"
import AppShell from "@/components/AppShell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/useAuth"
import { getRoleLabel, getUserDisplayName, isAdminUser, requestMyPasswordReset, updateMyEmail, updateMyProfile } from "@/lib/user"
import { cn } from "@/lib/utils"
import profileLogo from "../../logo_profil.png"

function getInitials(displayName) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A"
}

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (data?.detalii && data?.eroare && data.detalii !== data.eroare) {
    return `${data.eroare} (${data.detalii})`
  }
  return data?.message ?? data?.eroare ?? fallback
}

function getFieldErrors(error) {
  return error.response?.data?.campuri ?? {}
}

export default function ProfilePage() {
  const { user, setUser, refreshAuth } = useAuth()
  const isAdmin = isAdminUser(user)
  const [profileForm, setProfileForm] = useState({ nume: "", prenume: "", facultate: "" })
  const [email, setEmail] = useState("")
  const [profileErrors, setProfileErrors] = useState({})
  const [emailErrors, setEmailErrors] = useState({})
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false)

  useEffect(() => {
    setProfileForm({
      nume: user?.nume ?? "",
      prenume: user?.prenume ?? "",
      facultate: user?.facultate ?? "",
    })
    setEmail(user?.mail ?? "")
  }, [user])

  function updateProfileField(field, value) {
    setProfileForm((currentForm) => ({ ...currentForm, [field]: value }))
    setProfileErrors((currentErrors) => ({ ...currentErrors, [field]: "" }))
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setSavingProfile(true)
    setNotice("")
    setError("")
    setProfileErrors({})

    try {
      const updatedUser = await updateMyProfile({
        nume: profileForm.nume.trim(),
        prenume: profileForm.prenume.trim(),
        facultate: profileForm.facultate.trim(),
      })
      setUser(updatedUser)
      setNotice("Datele personale au fost actualizate cu succes.")
    } catch (submitError) {
      setProfileErrors(getFieldErrors(submitError))
      setError(getErrorMessage(submitError, "Nu am putut actualiza datele personale."))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault()
    setSavingEmail(true)
    setNotice("")
    setError("")
    setEmailErrors({})

    try {
      const updatedUser = await updateMyEmail(email.trim())
      if (updatedUser) {
        setUser(updatedUser)
      } else {
        await refreshAuth()
      }
      setNotice("Adresa de email a fost actualizată cu succes.")
    } catch (submitError) {
      setEmailErrors(getFieldErrors(submitError))
      setError(getErrorMessage(submitError, "Nu am putut schimba adresa de email."))
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePasswordReset() {
    setSendingPasswordReset(true)
    setNotice("")
    setError("")

    try {
      await requestMyPasswordReset()
      setNotice("Un link pentru resetarea parolei a fost trimis pe adresa ta de email.")
    } catch (resetError) {
      setError(getErrorMessage(resetError, "Nu am putut trimite linkul pentru resetarea parolei."))
    } finally {
      setSendingPasswordReset(false)
    }
  }

  const emailChanged = email.trim() !== (user?.mail ?? "")
  const displayName = getUserDisplayName(user)
  const roleLabel = getRoleLabel(user?.rol)
  const initials = getInitials(displayName)

  const heroClassName = isAdmin
    ? "relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/14 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
    : "relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#0f9fbd] via-[#17b7d3] to-[#56d5ea] text-white shadow-[0_24px_60px_rgba(23,133,161,0.24)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/16 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"

  return (
    <AppShell
      title="Profilul meu"
      description="Gestionează-ți informațiile personale și setările de securitate ale contului."
      eyebrow="Cont"
      heroClassName={heroClassName}
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white font-bold"
      heroDescriptionClassName="text-white/84"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {notice ? (
          <Alert className="rounded-3xl border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <AlertTitle>Succes</AlertTitle>
            <AlertDescription className="text-emerald-800">{notice}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertTitle>Eroare</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-stretch">
          <div className="space-y-6 lg:flex lg:h-full lg:flex-col lg:space-y-0">
            {/* Compact Identity Card */}
            <Card className="overflow-hidden rounded-[1.75rem] border-[#e4d8cd] bg-white shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
              <div className="border-b border-[#e4d8cd] bg-[#fcf8f3] px-5 py-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#24385b] text-xl font-bold text-white shadow-xs">
                  {initials}
                </div>
                <h2 className="mt-3 truncate text-lg font-bold text-slate-900">{displayName}</h2>
                <span className="mt-1.5 inline-flex items-center rounded-full bg-[#24385b]/10 px-3 py-0.5 text-xs font-bold tracking-wide uppercase text-[#24385b]">
                  {roleLabel}
                </span>
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3 rounded-[1.25rem] border border-[#e4d8cd] bg-[#fcf8f3] px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5eee5] text-xl" aria-hidden="true">📧</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400">Email</p>
                    <p className="truncate text-sm font-semibold text-slate-800">{user?.mail || "-"}</p>
                  </div>
                </div>
                {user?.facultate ? (
                  <div className="flex items-center gap-3 rounded-[1.25rem] border border-[#e4d8cd] bg-[#fcf8f3] px-3.5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5eee5] text-xl" aria-hidden="true">🎓</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400">Facultate</p>
                      <p className="truncate text-sm font-semibold text-slate-800">{user.facultate}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex flex-1 items-center justify-center pt-6">
              <img
                src={profileLogo}
                alt="Profil Akadion"
                className="mx-auto max-h-[26rem] w-full object-contain drop-shadow-[0_14px_10px_rgba(32,46,84,0.09)]"
              />
            </div>
          </div>

          {/* Form & Security Cards */}
          <div className="space-y-6">
            {/* Date Personale */}
            <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
              <CardHeader className="px-6 pb-2 pt-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <UserRound className="h-5 w-5 text-[#24385b]" />
                  Informații personale
                </CardTitle>
                <CardDescription>Actualizează-ți numele, prenumele și facultatea.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-3">
                <form className="space-y-4" onSubmit={handleProfileSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-nume" className="text-xs font-bold uppercase tracking-wider text-slate-600">Nume</Label>
                      <Input
                        id="profile-nume"
                        value={profileForm.nume}
                        onChange={(event) => updateProfileField("nume", event.target.value)}
                        className="h-12 rounded-2xl border-[#e4d8cd] bg-[#fcf8f3] px-4 text-base focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                      />
                      {profileErrors.nume ? <p className="text-sm text-rose-600">{profileErrors.nume}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-prenume" className="text-xs font-bold uppercase tracking-wider text-slate-600">Prenume</Label>
                      <Input
                        id="profile-prenume"
                        value={profileForm.prenume}
                        onChange={(event) => updateProfileField("prenume", event.target.value)}
                        className="h-12 rounded-2xl border-[#e4d8cd] bg-[#fcf8f3] px-4 text-base focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                      />
                      {profileErrors.prenume ? <p className="text-sm text-rose-600">{profileErrors.prenume}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-facultate" className="text-xs font-bold uppercase tracking-wider text-slate-600">Facultate</Label>
                    <Input
                      id="profile-facultate"
                      value={profileForm.facultate}
                      onChange={(event) => updateProfileField("facultate", event.target.value)}
                      className="h-12 rounded-2xl border-[#e4d8cd] bg-[#fcf8f3] px-4 text-base focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                    />
                    {profileErrors.facultate ? <p className="text-sm text-rose-600">{profileErrors.facultate}</p> : null}
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={savingProfile} className="rounded-2xl bg-[#24385b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1a2b47]">
                      {savingProfile ? "Se salvează..." : "Salvează modificările"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Securitate & Cont */}
            <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
              <CardHeader className="px-6 pb-2 pt-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-[#24385b]" />
                  Securitate cont
                </CardTitle>
                <CardDescription>Modifică adresa de email sau cere resetarea parolei.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6 pt-3">
                {/* Schimbare Email */}
                <form className="space-y-3" onSubmit={handleEmailSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email" className="text-xs font-bold uppercase tracking-wider text-slate-600">Adresă email</Label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-12 rounded-2xl border-[#e4d8cd] bg-[#fcf8f3] px-4 text-base focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
                      />
                      <Button
                        type="submit"
                        variant={emailChanged ? "default" : "outline"}
                        disabled={savingEmail || !emailChanged}
                        className={cn(
                          "h-12 shrink-0 rounded-2xl px-6 font-semibold",
                          emailChanged
                            ? "bg-[#24385b] text-white hover:bg-[#1a2b47]"
                            : "border-[#d9ccbe] bg-white text-slate-400"
                        )}
                      >
                        {savingEmail ? "Se actualizează..." : "Schimbă emailul"}
                      </Button>
                    </div>
                    {emailErrors.email ? <p className="text-sm text-rose-600">{emailErrors.email}</p> : null}
                  </div>
                </form>

                <hr className="border-[#e4d8cd]/60" />

                {/* Resetare Parolă */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">Resetare parolă</h4>
                    <p className="text-sm text-slate-500">Trimite un link securizat pe email pentru schimbarea parolei.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasswordReset}
                    disabled={sendingPasswordReset}
                    className="shrink-0 rounded-2xl border-[#d9ccbe] bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-[#f7efe6]"
                  >
                    <KeyRound className="mr-2 h-4 w-4 text-[#24385b]" />
                    {sendingPasswordReset ? "Se trimite..." : "Schimbă parola"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
