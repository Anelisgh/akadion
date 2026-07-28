import { Check, MessageCircle, Palette, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import ragHeadLogo from "@/assets/logo_RAG_head.png"
import ragLogo from "@/assets/logo_RAG-removebg-preview.png"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { COURSE_THEME_KEYS, COURSE_THEMES, DEFAULT_COURSE_THEME, getCourseTheme, getThemeUserKey } from "@/lib/courseThemes"

const QUICK_QUESTIONS = [
  "Cum găsesc materialele pentru curs?",
  "Cum mă înscriu la un curs?",
  "Cum urmăresc progresul pe săptămâni?",
]
const AKY_THEME_STORAGE_PREFIX = "akadion:aky-theme"

function getAkyThemeStorageKey(user) {
  return `${AKY_THEME_STORAGE_PREFIX}:${getThemeUserKey(user)}`
}

export default function AkyChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [selectedThemeKey, setSelectedThemeKey] = useState(DEFAULT_COURSE_THEME)
  const selectedTheme = getCourseTheme(selectedThemeKey)

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
      // Visual change still applies even if persistence is blocked.
    }
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
        <SheetContent onOpenChange={handleOpenChange} className="bg-linear-to-b from-[#fffdfa] via-[#fffdfb] to-[#f8fbff]">
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
                aria-label="Schimba tema Aky"
                onClick={() => setThemePickerOpen((currentValue) => !currentValue)}
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
              <div className="relative z-10">
                <SheetTitle className="text-white">Aky</SheetTitle>
                <SheetDescription className="mt-1 text-white/74">Chatbot Akadion</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-hidden px-6 py-5">
            <Card className="border-[#d9e4f4] bg-linear-to-br from-[#edf7ff] via-[#f8fbff] to-white py-0 shadow-[0_18px_40px_rgba(32,46,84,0.08)]">
              <CardContent className="space-y-4 px-5 py-5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br ${selectedTheme.accent} ${selectedTheme.heroBorder} ${selectedTheme.heroStatText} shadow-[0_12px_24px_rgba(24,49,83,0.14)]`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#24385b]">Salut! Sunt Aky.</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Curând voi putea răspunde aici la întrebări despre cursuri, materiale și navigarea prin Akadion.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Intrebari rapide</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="rounded-2xl border border-[#d9e4f4] bg-white/96 px-3.5 py-2.5 text-left text-sm text-[#3f698a] shadow-[0_8px_18px_rgba(32,46,84,0.04)] transition hover:border-[#bfd5eb] hover:bg-[#f4f8fd]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-6">
              <div className="rounded-[1.6rem] border border-[#d9e4f4] bg-white p-3 shadow-[0_18px_34px_rgba(32,46,84,0.08)]">
                <div className="flex items-end gap-3">
                  <Input
                    disabled
                    value=""
                    placeholder="Scrie întrebarea ta pentru Aky..."
                    className="h-12 rounded-2xl border-0 bg-[#f8fafc] px-4 text-slate-600 shadow-none focus-visible:ring-0"
                  />
                  <Button type="button" disabled className={`h-12 rounded-2xl bg-linear-to-r ${selectedTheme.accent} px-4 text-white shadow-[0_10px_22px_rgba(24,49,83,0.18)]`}>
                    <MessageCircle className="h-4 w-4" />
                    Trimite
                  </Button>
                </div>
              </div>
              <p className="text-xs leading-5 text-slate-400">
                Interfața este pregătită. Conectarea la Aky va fi adăugată când este gata partea de API.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
