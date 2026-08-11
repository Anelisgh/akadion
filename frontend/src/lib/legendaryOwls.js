import astronomerOwl from "../../poze_galerie/astronomerowl.png"
import geniusOwl from "../../poze_galerie/geniusowl.png"
import hackerOwl from "../../poze_galerie/hackerowl.png"
import potionsOwl from "../../poze_galerie/potionsowl.png"
import samuraiOwl from "../../poze_galerie/samuraiowl.png"
import warriorOwl from "../../poze_galerie/warriorowl.png"
import wizardOwl from "../../poze_galerie/wizardowl.png"
import defaultStudentOwl from "../../logo_dashboard_student.png"
import { getThemeUserKey } from "@/lib/courseThemes"

export const DEFAULT_STUDENT_HOMEPAGE_OWL = "default"
const STUDENT_HOMEPAGE_OWL_STORAGE_PREFIX = "akadion:student-homepage-owl"
const OWL_HALL_DISCOVERED_STORAGE_PREFIX = "akadion:owl-hall-discovered"

export const LEGENDARY_OWLS = [
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

const LEGENDARY_OWL_IDS = new Set(LEGENDARY_OWLS.map((owl) => owl.id))

export function getStudentHomepageOwlStorageKey(user) {
  return `${STUDENT_HOMEPAGE_OWL_STORAGE_PREFIX}:${getThemeUserKey(user)}`
}

export function getOwlHallDiscoveredStorageKey(user) {
  return `${OWL_HALL_DISCOVERED_STORAGE_PREFIX}:${getThemeUserKey(user)}`
}

export function getLegendaryOwlById(owlId) {
  return LEGENDARY_OWLS.find((owl) => owl.id === owlId) ?? null
}

export function getStudentHomepageOwlId(user) {
  try {
    const storedOwlId = window.localStorage.getItem(getStudentHomepageOwlStorageKey(user))
    return LEGENDARY_OWL_IDS.has(storedOwlId) ? storedOwlId : DEFAULT_STUDENT_HOMEPAGE_OWL
  } catch {
    return DEFAULT_STUDENT_HOMEPAGE_OWL
  }
}

export function setStudentHomepageOwlId(user, owlId) {
  try {
    const storageKey = getStudentHomepageOwlStorageKey(user)
    if (!owlId || owlId === DEFAULT_STUDENT_HOMEPAGE_OWL) {
      window.localStorage.removeItem(storageKey)
      return DEFAULT_STUDENT_HOMEPAGE_OWL
    }

    if (!LEGENDARY_OWL_IDS.has(owlId)) {
      return getStudentHomepageOwlId(user)
    }

    window.localStorage.setItem(storageKey, owlId)
    return owlId
  } catch {
    return owlId && LEGENDARY_OWL_IDS.has(owlId) ? owlId : DEFAULT_STUDENT_HOMEPAGE_OWL
  }
}

export function getStudentHomepageOwlImage(owlId) {
  return getLegendaryOwlById(owlId)?.image || defaultStudentOwl
}

export function getStudentHomepageOwlRole(owlId) {
  return getLegendaryOwlById(owlId)?.name || "Dashboard STUDENT"
}

export function hasDiscoveredOwlHall(user) {
  try {
    return window.localStorage.getItem(getOwlHallDiscoveredStorageKey(user)) === "true"
  } catch {
    return false
  }
}

export function markOwlHallDiscovered(user) {
  try {
    window.localStorage.setItem(getOwlHallDiscoveredStorageKey(user), "true")
    return true
  } catch {
    return false
  }
}
