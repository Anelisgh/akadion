import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Crown, Gem, Sparkles } from "lucide-react"
import AppShell from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import astronomerOwl from "../../poze_galerie/astronomerowl.png"
import geniusOwl from "../../poze_galerie/geniusowl.png"
import hackerOwl from "../../poze_galerie/hackerowl.png"
import potionsOwl from "../../poze_galerie/potionsowl.png"
import samuraiOwl from "../../poze_galerie/samuraiowl.png"
import warriorOwl from "../../poze_galerie/warriorowl.png"
import wizardOwl from "../../poze_galerie/wizardowl.png"

const LEGENDARY_OWLS = [
  {
    id: "wizard",
    name: "Arhivistul Vrăjitor",
    role: "Stăpânul sigiliilor mov",
    image: wizardOwl,
    description: "Deschide rafturile interzise ale Akadionului și transformă orice întrebare într-o hartă luminoasă de cunoaștere.",
    longDescription: "În cea mai tăcută încăpere a galeriei, Arhivistul Vrăjitor păstrează sigiliile mov ale cunoașterii rare. Când un explorator se apropie cu o întrebare adevărată, toiagul lui de ametist aprinde rafturi invizibile, iar paginile încep să plutească singure prin aer. Nu oferă răspunsuri grăbite; deschide drumuri, lasă indicii și transformă curiozitatea într-o hartă luminoasă. În Akadion, se spune că el știe unde sunt ascunse lecțiile uitate și cum poate fiecare student să găsească propriul traseu prin ele.",
    artifact: "Toiagul de ametist",
    aura: "from-[#8b5cf6] via-[#6d28d9] to-[#1e1b4b]",
    glow: "rgba(139, 92, 246, 0.42)",
  },
  {
    id: "warrior",
    name: "Străjerul Indigo",
    role: "Gardianul sălii de onoare",
    image: warriorOwl,
    description: "Patrulează printre coloane albastre și apără curajul celor care revin la lecții chiar când questul devine greu.",
    longDescription: "Străjerul Indigo veghează la intrarea în galeria legendelor, acolo unde lumina albastră atinge coloanele vechi și fiecare pas pare un jurământ. Nu este o bufniță a luptei, ci a curajului liniștit: îi apără pe cei care se întorc la o lecție grea, pe cei care încearcă din nou și pe cei care nu renunță când un capitol pare prea mare. Scutul nopții adânci nu respinge doar obstacolele, ci și îndoiala. În prezența lui, orice provocare devine un drum nobil, iar fiecare progres capătă greutate de legendă.",
    artifact: "Scutul nopții adânci",
    aura: "from-[#4338ca] via-[#312e81] to-[#0f172a]",
    glow: "rgba(67, 56, 202, 0.46)",
  },
  {
    id: "samurai",
    name: "Samuraiul Lunii Liliachii",
    role: "Maestrul disciplinei tăcute",
    image: samuraiOwl,
    description: "Taie haosul în pași clari, cu răbdare, focus și o reverență pentru fiecare progres făcut fără grabă.",
    longDescription: "Samuraiul Lunii Liliachii locuiește în aripa cea mai calmă a chamber-ului, unde frunzele plutesc încet și zgomotul lumii rămâne la ușă. Katana lui nu este ridicată împotriva cuiva, ci împotriva haosului: taie distragerile, ordonează gândurile și lasă în urmă pași mici, dar siguri. El îi învață pe exploratorii Akadion că disciplina nu trebuie să fie dură ca piatra; poate fi blândă, elegantă și luminoasă. Când Samuraiul apare, studiul devine un ritual, iar focusul devine o formă de curaj.",
    artifact: "Katana de lumină rece",
    aura: "from-[#a78bfa] via-[#7c3aed] to-[#172554]",
    glow: "rgba(167, 139, 250, 0.46)",
  },
  {
    id: "potions",
    name: "Alchimistul Poțiunilor",
    role: "Creatorul elixirului de idei",
    image: potionsOwl,
    description: "Amestecă formule, greșeli utile și sclipiri violete până când o lecție obișnuită capătă putere legendară.",
    longDescription: "Alchimistul Poțiunilor lucrează într-un laborator ascuns sub podeaua galeriei, printre sticle colorate, formule plutitoare și scântei care miroasă a idei noi. Pentru el, nicio greșeală nu este pierdută: fiecare devine ingredient, fiecare încercare adaugă o nuanță, fiecare întrebare schimbă culoarea elixirului. Fiola de stele lichide luminează cel mai tare atunci când cineva înțelege ceva ce părea imposibil. În Akadion, Alchimistul transformă confuzia în claritate și face din învățare o mică magie practică.",
    artifact: "Fiola de stele lichide",
    aura: "from-[#c084fc] via-[#8b5cf6] to-[#1e1b4b]",
    glow: "rgba(192, 132, 252, 0.42)",
  },
  {
    id: "hacker",
    name: "Hackerul Astral",
    role: "Spărgătorul codurilor vechi",
    image: hackerOwl,
    description: "Aprinde terminale albastre în camere secrete și găsește scurtături elegante prin labirintul logicii.",
    longDescription: "Hackerul Astral stă la masa lui de neon dintr-o cameră laterală, unde pereții pulsează cu simboluri albastre și coduri care par constelații. Nu rupe sigilii și nu caută haos; el înțelege sistemele, le verifică, le repară și găsește căi elegante prin labirintul logicii. Cheia lui de neon deschide doar uși permise, dar le deschide cu stil. Pentru exploratorii Akadion, Hackerul Astral este dovada că tehnologia poate fi curioasă, prietenoasă și sigură în același timp.",
    artifact: "Cheia de neon",
    aura: "from-[#6366f1] via-[#4f46e5] to-[#020617]",
    glow: "rgba(99, 102, 241, 0.5)",
  },
  {
    id: "genius",
    name: "Geniul Cristalin",
    role: "Inventatorul constelațiilor mentale",
    image: geniusOwl,
    description: "Construiește mecanisme de gândire, aprinde becuri liliachii și vede conexiuni unde alții văd doar praf de cretă.",
    longDescription: "Geniul Cristalin intră în galerie cu o carte aprinsă și ochelari care reflectă toate ideile neterminate. În jurul lui, paginile nu cad niciodată la întâmplare: se așază în constelații de concepte, exemple și explicații. Diadema sinapselor strălucește atunci când două lucruri aparent separate se leagă brusc într-o înțelegere clară. Nu este distant sau rece; este curios, cald și mereu gata să transforme notițele mici în descoperiri memorabile pentru oricine are răbdare să privească atent.",
    artifact: "Diadema sinapselor",
    aura: "from-[#ddd6fe] via-[#8b5cf6] to-[#312e81]",
    glow: "rgba(221, 214, 254, 0.5)",
  },
  {
    id: "astronomer",
    name: "Astronomul Abisului",
    role: "Cartograful cerului interior",
    image: astronomerOwl,
    description: "Citește hărți stelare deasupra galeriei și amintește fiecărui explorator că drumul mare începe cu o singură lumină.",
    longDescription: "Astronomul Abisului privește din cupola cea mai înaltă a chamber-ului, cu telescopul îndreptat spre un cer care pare desenat special pentru Akadion. El nu urmărește doar stele, ci trasee: idei care se leagă, întrebări care se aliniază, răspunsuri care apar ca lumini mici pe o hartă imensă. Astrolabul de safir îl ajută să găsească direcția atunci când drumul pare prea vast. În prezența lui, orice explorator își amintește că o călătorie mare începe mereu cu o singură lumină urmărită cu încredere.",
    artifact: "Astrolabul de safir",
    aura: "from-[#818cf8] via-[#3730a3] to-[#111827]",
    glow: "rgba(129, 140, 248, 0.46)",
  },
]

export default function OwlHall() {
  const [selectedOwlId, setSelectedOwlId] = useState(LEGENDARY_OWLS[0].id)
  const selectedOwl = LEGENDARY_OWLS.find((owl) => owl.id === selectedOwlId) ?? LEGENDARY_OWLS[0]

  return (
    <AppShell
      title="Galeria Bufnițelor Legendare"
      description="Un sanctuar interior Akadion, scăldat în indigo, lilac și lumină de stele, unde fiecare bufniță păstrează o virtute rară pentru exploratorii cursurilor."
      eyebrow="Legendă Akadion"
      actions={(
        <Button asChild variant="outline" className="w-fit rounded-2xl border-white/28 bg-white px-5 py-2.5 text-sm font-semibold text-[#24385b] shadow-[0_14px_34px_rgba(8,18,38,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-white/90 hover:text-[#24385b] hover:shadow-[0_20px_42px_rgba(8,18,38,0.24)] active:scale-[0.98]">
          <Link to="/courses">
            <ArrowLeft className="h-4 w-4" />
            Ieșire din galerie
          </Link>
        </Button>
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
                    Aleasă acum
                  </span>
                  <Sparkles className="h-6 w-6 text-[#fef3c7] drop-shadow" />
                </div>
                <div className="flex justify-center py-5">
                  <img src={selectedOwl.image} alt={selectedOwl.name} className="h-80 w-full max-w-[23rem] object-contain drop-shadow-[0_24px_28px_rgba(2,6,23,0.48)] transition duration-500 lg:h-88 lg:max-w-[25rem]" />
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

              return (
                <button
                  key={owl.id}
                  type="button"
                  onClick={() => setSelectedOwlId(owl.id)}
                  className={`group relative min-h-80 overflow-hidden rounded-[1.6rem] border p-0 text-left transition duration-300 focus-visible:ring-3 focus-visible:ring-[#c4b5fd]/60 focus-visible:outline-none ${isSelected ? "-translate-y-1 border-[#ddd6fe]/70 shadow-[0_24px_70px_rgba(124,58,237,0.3)]" : "border-[#c4b5fd]/18 shadow-[0_16px_46px_rgba(2,6,23,0.2)] hover:-translate-y-1 hover:border-[#c4b5fd]/44"}`}
                  aria-pressed={isSelected}
                >
                  <div className={`absolute inset-0 bg-linear-to-br ${owl.aura}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.24),transparent_30%),linear-gradient(180deg,rgba(8,11,34,0.04),rgba(8,11,34,0.78))]" />
                  <div className="absolute left-4 right-4 top-5 h-20 rounded-t-full border-x border-t border-white/14 opacity-70" />
                  <div className="relative z-10 flex h-full min-h-80 flex-col justify-between p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#f5f3ff] backdrop-blur">
                        {isSelected ? "Activă" : "Legendă"}
                      </span>
                      <Gem className={`h-5 w-5 transition ${isSelected ? "text-[#fef3c7]" : "text-white/52 group-hover:text-[#fef3c7]"}`} />
                    </div>
                    <div className="flex justify-center pt-4">
                      <img src={owl.image} alt="" className={`h-44 w-full object-contain drop-shadow-[0_18px_20px_rgba(2,6,23,0.42)] transition duration-300 lg:h-48 ${isSelected ? "scale-110" : "group-hover:scale-105"}`} />
                    </div>
                    <div className="rounded-[1.1rem] border border-white/12 bg-[#070a1c]/70 p-3 backdrop-blur-sm">
                      <h3 className="text-lg font-semibold tracking-tight text-white">{owl.name}</h3>
                      <p className="mt-1 text-xs font-semibold text-[#c4b5fd]">{owl.artifact}</p>
                      <p className="mt-2 text-sm leading-5 text-[#ede9fe]/78">{owl.role}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
