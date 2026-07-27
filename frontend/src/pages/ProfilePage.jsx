import { useEffect, useState } from "react"
import { CheckCircle2, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react"
import AppShell from "@/components/AppShell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/auth/useAuth"
import { getRoleLabel, getUserDisplayName, isAdminUser, requestMyPasswordReset, updateMyEmail, updateMyProfile } from "@/lib/user"

function ProfileField({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#e4d8cd] bg-[#fffdfa] px-4 py-3">
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value || "-"}</p>
    </div>
  )
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message ?? error.response?.data?.eroare ?? fallback
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
      setNotice("Datele personale au fost actualizate.")
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
      setNotice("Adresa a fost schimbată, te rugăm să verifici Inbox-ul noului email pentru confirmare.")
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

  return (
    <AppShell
      title="Profilul meu"
      description="Aici îți poți vedea și actualiza datele personale și informațiile contului."
      eyebrow="Cont"
      heroClassName="relative overflow-hidden border-0 bg-linear-to-r from-[#edc9f1] via-[#e2b6eb] to-[#f0bfdc] shadow-[0_24px_60px_rgba(160,95,173,0.2)] before:absolute before:-top-12 before:right-[-3rem] before:h-52 before:w-52 before:rounded-full before:bg-white/24 before:content-[''] after:absolute after:-bottom-16 after:left-[-4rem] after:h-56 after:w-56 after:rounded-full after:bg-white/14 after:content-['']"
      heroEyebrowClassName="text-[#9154a0]"
      heroTitleClassName="text-[#643770]"
      heroDescriptionClassName="text-[#824f90]"
    >
      <div className="space-y-4">
        {notice ? (
          <Alert className="rounded-3xl border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <AlertTitle>Actualizare reușită</AlertTitle>
            <AlertDescription className="text-emerald-800">{notice}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
            <AlertTitle>Eroare</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
          <Card className={isAdmin
            ? "relative h-full overflow-hidden rounded-[1.75rem] border-0 bg-linear-to-r from-[#434f9f] via-[#5869bd] to-[#7c89dc] text-white shadow-[0_24px_60px_rgba(67,79,159,0.26)] before:absolute before:-top-10 before:right-[-2.5rem] before:h-44 before:w-44 before:rounded-full before:bg-white/10 before:content-[''] after:absolute after:-bottom-16 after:left-[-3rem] after:h-52 after:w-52 after:rounded-full after:bg-white/8 after:content-['']"
            : "h-full rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]"}
          >
            <CardHeader className="items-center px-6 pt-8 text-center">
              <div className={isAdmin
                ? "relative flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white/12 text-white backdrop-blur-sm"
                : "flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#f5eee5] text-[#4A5681]"}
              >
                <UserRound className="h-10 w-10" />
              </div>
              <CardTitle className={isAdmin ? "relative text-2xl text-white" : "text-2xl text-slate-900"}>{getUserDisplayName(user)}</CardTitle>
              <CardDescription className={isAdmin ? "relative text-white/72" : undefined}>{getRoleLabel(user?.rol)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6">
              <div className={isAdmin
                ? "relative flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-sm text-white/88 backdrop-blur-sm"
                : "flex items-center gap-3 rounded-2xl bg-[#f7efe6] px-4 py-3 text-sm text-slate-700"}
              >
                <Mail className={isAdmin ? "h-4 w-4 text-white/80" : "h-4 w-4 text-[#4A5681]"} />
                <span className="truncate">{user?.mail || "-"}</span>
              </div>
              <div className={isAdmin
                ? "relative flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-sm text-white/88 backdrop-blur-sm"
                : "flex items-center gap-3 rounded-2xl bg-[#eef1fb] px-4 py-3 text-sm text-slate-700"}
              >
                <ShieldCheck className={isAdmin ? "h-4 w-4 text-white/80" : "h-4 w-4 text-[#4A5681]"} />
                <span>Stare cont: {user?.stareCont || "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full rounded-[1.75rem] border-[#e4d8cd] bg-[#fcf8f3] shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-xl text-slate-900">Date personale</CardTitle>
              <CardDescription>Modifică numele, prenumele și facultatea asociate contului tău.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileField label="Rol" value={getRoleLabel(user?.rol)} />
                <ProfileField label="Stare" value={user?.stareCont} />
              </div>

              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleProfileSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="profile-nume">Nume</Label>
                  <Input id="profile-nume" value={profileForm.nume} onChange={(event) => updateProfileField("nume", event.target.value)} />
                  {profileErrors.nume ? <p className="text-sm text-rose-600">{profileErrors.nume}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-prenume">Prenume</Label>
                  <Input id="profile-prenume" value={profileForm.prenume} onChange={(event) => updateProfileField("prenume", event.target.value)} />
                  {profileErrors.prenume ? <p className="text-sm text-rose-600">{profileErrors.prenume}</p> : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profile-facultate">Facultate</Label>
                  <Input id="profile-facultate" value={profileForm.facultate} onChange={(event) => updateProfileField("facultate", event.target.value)} />
                  {profileErrors.facultate ? <p className="text-sm text-rose-600">{profileErrors.facultate}</p> : null}
                </div>

                <div className="sm:col-span-2">
                  <Button type="submit" disabled={savingProfile} className="rounded-2xl bg-[#4A5681] px-5 text-white hover:bg-[#3f4a72]">
                    {savingProfile ? "Se salvează..." : "Salvează datele"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card className="flex h-full flex-col rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Mail className="h-5 w-5 text-[#4A5681]" />
                Email
              </CardTitle>
              <CardDescription>Schimbarea emailului va cere confirmare pe noua adresă.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 px-6 pb-6">
              <form className="flex flex-1 flex-col justify-end space-y-4" onSubmit={handleEmailSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Adresa email</Label>
                  <Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  {emailErrors.email ? <p className="text-sm text-rose-600">{emailErrors.email}</p> : null}
                </div>
                <Button
                  type="submit"
                  variant={emailChanged ? "default" : "outline"}
                  disabled={savingEmail || !emailChanged}
                  className={emailChanged ? "rounded-2xl bg-[#4A5681] px-5 text-white hover:bg-[#3f4a72]" : "rounded-2xl border-[#d9ccbe] bg-white"}
                >
                  {savingEmail ? "Se actualizează..." : "Schimbă emailul"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <KeyRound className="h-5 w-5 text-[#4A5681]" />
                Parola
              </CardTitle>
              <CardDescription>Primeste un link securizat pentru schimbarea parolei prin Keycloak.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-end px-6 pb-6">
              <Button type="button" onClick={handlePasswordReset} disabled={sendingPasswordReset} className="rounded-2xl bg-[#4A5681] px-5 text-white hover:bg-[#3f4a72]">
                {sendingPasswordReset ? "Se trimite..." : "Schimbă parola"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
