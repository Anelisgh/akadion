import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Crown, Gem, Sparkles } from "lucide-react"
import { useAuth } from "@/auth/useAuth"
import AppShell from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import { LEGENDARY_OWLS, DEFAULT_STUDENT_HOMEPAGE_OWL, getStudentHomepageOwlId, markOwlHallDiscovered, setStudentHomepageOwlId } from "@/lib/legendaryOwls"
import { isStudentUser } from "@/lib/user"

export default function OwlHall() {
  const { user } = useAuth()
  const isStudent = isStudentUser(user)
  const [selectedOwlId, setSelectedOwlId] = useState(LEGENDARY_OWLS[0].id)
  const [homepageOwlId, setHomepageOwlId] = useState(DEFAULT_STUDENT_HOMEPAGE_OWL)
  const selectedOwl = LEGENDARY_OWLS.find((owl) => owl.id === selectedOwlId) ?? LEGENDARY_OWLS[0]
  const isSelectedOnHomepage = homepageOwlId === selectedOwl.id

  useEffect(() => {
    if (!isStudent) {
      setHomepageOwlId(DEFAULT_STUDENT_HOMEPAGE_OWL)
      return
    }

    const persistedOwlId = getStudentHomepageOwlId(user)
    setHomepageOwlId(persistedOwlId)
    if (persistedOwlId !== DEFAULT_STUDENT_HOMEPAGE_OWL) {
      setSelectedOwlId(persistedOwlId)
    }
  }, [isStudent, user])

  useEffect(() => {
    if (!isStudent) return
    markOwlHallDiscovered(user)
  }, [isStudent, user])

  function handleSetHomepageOwl(owlId) {
    if (!isStudent) return
    setSelectedOwlId(owlId)
    const nextOwlId = setStudentHomepageOwlId(user, owlId)
    setHomepageOwlId(nextOwlId)
  }

  function handleResetHomepageOwl() {
    if (!isStudent) return
    const nextOwlId = setStudentHomepageOwlId(user, DEFAULT_STUDENT_HOMEPAGE_OWL)
    setHomepageOwlId(nextOwlId)
  }

  return (
    <AppShell
      title="Galeria Bufnițelor Legendare"
      description="Un sanctuar interior Akadion, scăldat în indigo, lilac și lumină de stele, unde fiecare bufniță păstrează o virtute rară pentru exploratorii cursurilor."
      eyebrow="Legendă Akadion"
      actions={(
        <div className="flex w-fit flex-col items-end gap-3">
          {isStudent ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetHomepageOwl}
              disabled={homepageOwlId === DEFAULT_STUDENT_HOMEPAGE_OWL}
              className="w-fit rounded-2xl border-white/28 bg-white px-5 py-2.5 text-sm font-semibold text-[#24385b] shadow-[0_14px_34px_rgba(8,18,38,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-white/90 hover:text-[#24385b] hover:shadow-[0_20px_42px_rgba(8,18,38,0.24)] disabled:opacity-50 active:scale-[0.98]"
            >
              Resetează Avatar
            </Button>
          ) : null}
          <Button asChild variant="outline" className="w-fit rounded-2xl border-white/28 bg-white px-5 py-2.5 text-sm font-semibold text-[#24385b] shadow-[0_14px_34px_rgba(8,18,38,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-white/90 hover:text-[#24385b] hover:shadow-[0_20px_42px_rgba(8,18,38,0.24)] active:scale-[0.98]">
            <Link to="/courses">
              <ArrowLeft className="h-4 w-4" />
              Ieșire din galerie
            </Link>
          </Button>
        </div>
      )}
      heroClassName="relative z-10 overflow-hidden border border-white/10 bg-linear-to-br from-[#111827] via-[#312e81] to-[#a78bfa] text-white shadow-[0_34px_100px_rgba(49,46,129,0.34)] before:absolute before:-top-24 before:right-[-4rem] before:h-72 before:w-72 before:rounded-full before:bg-[#ddd6fe]/18 before:blur-sm before:content-[''] after:absolute after:-bottom-28 after:left-[-5rem] after:h-80 after:w-80 after:rounded-full after:bg-[#4f46e5]/24 after:content-['']"
      heroEyebrowClassName="text-[#ddd6fe]/80"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-[#ede9fe]/88"
      shellClassName="bg-[radial-gradient(circle_at_15%_10%,rgba(124,58,237,0.14),transparent_28%),radial-gradient(circle_at_88%_6%,rgba(129,140,248,0.12),transparent_24%),linear-gradient(180deg,#1a2040_0%,#101634_34%,#090d23_100%)]"
      hideHeader
      contentSectionClassName="py-4 lg:py-5"
    >
      <section className="relative z-10 overflow-hidden rounded-[2.4rem] border border-[#c4b5fd]/22 bg-[#030617] p-4 text-white shadow-[0_34px_110px_rgba(15,23,42,0.42)] sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(196,181,253,0.24),transparent_30%),radial-gradient(circle_at_86%_14%,rgba(79,70,229,0.28),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.18),transparent_34%),linear-gradient(180deg,rgba(17,24,39,0.38),rgba(3,6,23,0.96))]" />
        <div className="pointer-events-none absolute inset-0 opacity-35 bg-[linear-gradient(90deg,transparent_0,rgba(196,181,253,0.12)_1px,transparent_1px),linear-gradient(180deg,transparent_0,rgba(129,140,248,0.08)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
        <div className="pointer-events-none absolute inset-x-8 top-10 h-px bg-linear-to-r from-transparent via-[#c4b5fd]/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-10 bottom-8 h-px bg-linear-to-r from-transparent via-[#818cf8]/28 to-transparent" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-stretch">
          <div className="flex min-h-full flex-col rounded-[1.8rem] border border-[#c4b5fd]/18 bg-[#0b102a]/76 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur">
            <div className={`relative min-h-[28rem] overflow-hidden rounded-[1.5rem] bg-linear-to-br ${selectedOwl.aura} p-5`} style={{ boxShadow: `0 26px 80px ${selectedOwl.glow}` }}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.26),transparent_30%),linear-gradient(180deg,transparent_55%,rgba(2,6,23,0.48))]" />
              <div className="absolute left-6 right-6 top-8 h-28 rounded-t-full border-x border-t border-white/18" />
              <div className="absolute bottom-0 left-1/2 h-36 w-[82%] -translate-x-1/2 rounded-t-[999px] bg-[#020617]/28 blur-sm" />
              <div className="relative z-10 flex h-full min-h-[25rem] flex-col justify-between">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#f5f3ff]">
                    <Crown className="h-3.5 w-3.5" />
                    {isSelectedOnHomepage ? "Pe homepage" : "Aleasă acum"}
                  </span>
                  <Sparkles className="h-6 w-6 text-[#fef3c7] drop-shadow" />
                </div>
                <div className="flex flex-1 items-end justify-center py-5">
                  <img src={selectedOwl.image} alt={selectedOwl.name} className="h-72 w-full max-w-[21rem] object-contain object-bottom drop-shadow-[0_24px_28px_rgba(2,6,23,0.48)] transition duration-500 lg:h-80 lg:max-w-[23rem]" />
                </div>
                <div className="rounded-[1.25rem] border border-white/16 bg-[#070a1c]/58 p-4 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-[#c4b5fd]">{selectedOwl.role}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{selectedOwl.name}</h2>
                </div>
              </div>
            </div>
            <div className="mt-5 flex-1 rounded-[1.5rem] border border-[#c4b5fd]/16 bg-[#050816]/84 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[#c4b5fd]">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">Cronica legendei</p>
              </div>
              <p className="mt-4 text-base leading-8 text-[#f5f3ff]/88">{selectedOwl.longDescription}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {LEGENDARY_OWLS.map((owl) => {
              const isSelected = owl.id === selectedOwlId
              const isOwlOnHomepage = homepageOwlId === owl.id

              return (
                <div
                  key={owl.id}
                  className={`group relative min-h-80 overflow-hidden rounded-[1.6rem] border p-0 text-left transition duration-300 focus-visible:ring-3 focus-visible:ring-[#c4b5fd]/60 focus-visible:outline-none ${isSelected ? "-translate-y-1 border-[#ddd6fe]/70 shadow-[0_24px_70px_rgba(124,58,237,0.3)]" : "border-[#c4b5fd]/18 shadow-[0_16px_46px_rgba(2,6,23,0.2)] hover:-translate-y-1 hover:border-[#c4b5fd]/44"}`}
                >
                  <div className={`absolute inset-0 bg-linear-to-br ${owl.aura}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.24),transparent_30%),linear-gradient(180deg,rgba(8,11,34,0.04),rgba(8,11,34,0.78))]" />
                  <div className="absolute left-4 right-4 top-5 h-20 rounded-t-full border-x border-t border-white/14 opacity-70" />
                  <div className="relative z-10 flex h-full min-h-80 flex-col justify-between p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#f5f3ff] backdrop-blur">
                        {isOwlOnHomepage ? "Activă" : "Legendă"}
                      </span>
                      <Gem className={`h-5 w-5 transition ${isOwlOnHomepage ? "text-[#fef3c7]" : "text-white/52 group-hover:text-[#fef3c7]"}`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOwlId(owl.id)}
                      className="flex flex-1 flex-col justify-between text-left"
                      aria-pressed={isSelected}
                    >
                      <div className="flex flex-1 items-end justify-center px-2 pt-4">
                        <img src={owl.image} alt="" className={`h-36 w-full max-w-[10.5rem] object-contain object-bottom drop-shadow-[0_18px_20px_rgba(2,6,23,0.42)] transition duration-300 lg:h-40 lg:max-w-[11rem] ${isSelected ? "scale-105" : "group-hover:scale-[1.02]"}`} />
                      </div>
                      <div className="rounded-[1.1rem] border border-white/12 bg-[#070a1c]/70 p-3 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold tracking-tight text-white">{owl.name}</h3>
                        <p className="mt-1 text-xs font-semibold text-[#c4b5fd]">{owl.artifact}</p>
                        <p className="mt-2 text-sm leading-5 text-[#ede9fe]/78">{owl.role}</p>
                      </div>
                    </button>
                    {isStudent ? (
                      <Button
                        type="button"
                        onClick={() => handleSetHomepageOwl(owl.id)}
                        disabled={isOwlOnHomepage}
                        className="mt-3 w-full rounded-[1.05rem] bg-linear-to-r from-[#c084fc] via-[#8b5cf6] to-[#4f46e5] text-white shadow-[0_12px_32px_rgba(91,33,182,0.28)] hover:brightness-105 disabled:opacity-55"
                      >
                        {isOwlOnHomepage ? "Avatar activ" : "Selectează Avatar"}
                      </Button>
                    ) : null}
                    </div>
                  </div>
              )
            })}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
