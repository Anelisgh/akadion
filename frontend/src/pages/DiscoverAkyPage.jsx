import { BookOpenText, Bot, MessageSquareText, ShieldCheck, Sparkles, Wand2 } from "lucide-react"
import AppShell from "@/components/AppShell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/auth/useAuth"
import { isAdminUser } from "@/lib/user"
import akyRagLogo from "@/assets/logo_RAG-removebg-preview.png"

const capabilities = [
  {
    icon: MessageSquareText,
    title: "Răspunsuri clare și contextuale",
    description: "Aky oferă răspunsuri formulate natural, bine structurate și adaptate contextului academic, astfel încât informația importantă să poată fi înțeleasă și folosită rapid.",
  },
  {
    icon: BookOpenText,
    title: "Explicarea materialelor complexe",
    description: "Poate transforma concepte dificile, paragrafe dense sau conținut tehnic în explicații mai accesibile, fără să piardă precizia ideilor esențiale.",
  },
  {
    icon: Wand2,
    title: "Sprijin real pentru învățare",
    description: "Aky susține procesul de studiu prin clarificări rapide, rezumate relevante, direcționare către ideile-cheie și un ritm de lucru mai eficient.",
  },
  {
    icon: Sparkles,
    title: "Quiz-uri și flashcards din documente",
    description: "Aky poate transforma documentele accesibile în quiz-uri și flashcards utile pentru recapitulare, exersare activă și verificarea rapidă a înțelegerii.",
  },
]

const usageIdeas = [
  "Poate sintetiza rapid informația esențială dintr-un curs sau dintr-un material mai amplu.",
  "Poate clarifica noțiuni dificile prin explicații mai simple, mai bine organizate și mai ușor de urmărit.",
  "Poate accelera recapitularea prin răspunsuri concise, orientate spre ce este cu adevărat important.",
  "Poate genera quiz-uri și flashcards pornind din documentele disponibile, pentru învățare mai activă și recapitulare mai eficientă.",
]

export default function DiscoverAkyPage() {
  const { user } = useAuth()
  const isAdmin = isAdminUser(user)

  return (
    <AppShell
      title="Descoperă Aky"
      description="Aky este asistentul conversațional inteligent din Akadion, conceput pentru a face interacțiunea cu informația academică mai rapidă, mai clară și mai eficientă."
      eyebrow="Asistent AI"
      heroClassName="relative min-h-[11rem] overflow-hidden border-0 bg-linear-to-r from-[#24385b] via-[#35517f] to-[#4f76af] text-white shadow-[0_24px_60px_rgba(36,56,91,0.26)] lg:items-start before:absolute before:-top-12 before:right-[-3.5rem] before:h-56 before:w-56 before:rounded-full before:bg-white/28 before:content-[''] after:absolute after:-bottom-20 after:left-[-4.5rem] after:h-64 after:w-64 after:rounded-full after:bg-white/10 after:content-['']"
      heroEyebrowClassName="text-white/72"
      heroTitleClassName="text-white"
      heroDescriptionClassName="text-white/84"
      heroVisual={
        <img
          src={akyRagLogo}
          alt="Aky AI"
          className="pointer-events-auto h-28 w-auto object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.14)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:brightness-105"
        />
      }
      heroVisualClassName="right-2 bottom-8 top-auto h-auto w-auto items-end justify-end xl:right-3"
    >
      <div className="space-y-6">
        <Card className="rounded-[1.75rem] border-[#d8dcef] bg-[#eef1fb] shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
          <CardContent className="px-6 py-5">
            <p className="max-w-5xl text-sm leading-7 text-slate-700">
              <span className="font-semibold text-[#24385b]">Aky este chatbotul Akadion</span> și folosește o arhitectură de tip
              <span className="font-semibold text-[#24385b]"> RAG (Retrieval Augmented Generation)</span>, ceea ce înseamnă că poate combina generarea de răspunsuri cu recuperarea informațiilor relevante pentru a oferi rezultate mai bine ancorate în contextul academic.
            </p>
          </CardContent>
        </Card>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)] xl:items-stretch">
          <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white shadow-[0_18px_48px_rgba(32,46,84,0.08)] xl:h-full">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Bot className="h-5 w-5 text-[#24385b]" />
                Ce este Aky?
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Aky este componenta AI a platformei Akadion, creată pentru a îmbunătăți modul în care utilizatorii caută, înțeleg și valorifică informația academică.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 pt-2 text-sm leading-7 text-slate-600 xl:max-w-[62ch]">
              <p>
                Rolul său este să reducă timpul pierdut în căutări repetitive, să ofere claritate în fața unor materiale dificile și să transforme întrebările utilizatorului în răspunsuri utile, bine formulate și imediat aplicabile.
              </p>
              <p>
                Punctul forte al lui Aky este combinația dintre viteză, claritate și relevanță: nu doar răspunde, ci organizează informația într-o formă care sprijină înțelegerea reală și luarea rapidă a unor decizii mai bune în procesul de studiu.
              </p>
              <p>
                În plus, Aky poate valorifica documentele accesibile din platformă pentru a genera <span className="font-semibold text-[#24385b]">quiz-uri</span> și <span className="font-semibold text-[#24385b]">flashcards</span>, astfel încât pregătirea pentru cursuri, laboratoare sau examen să devină mai practică, mai interactivă și mai ușor de urmărit.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-[#fcf8f3] shadow-[0_18px_48px_rgba(32,46,84,0.08)] xl:h-full">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Sparkles className="h-5 w-5 text-[#24385b]" />
                Puncte forte
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-6 pb-6 pt-2">
              {usageIdeas.map((idea) => (
                <div key={idea} className="flex min-h-[86px] items-start rounded-[1.25rem] border border-[#e4d8cd] bg-white px-4 py-3.5 text-sm font-medium leading-6 text-slate-700 shadow-[0_8px_24px_rgba(32,46,84,0.04)]">
                  <p className="max-w-[34ch]">{idea}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="rounded-[1.75rem] border-[#e4d8cd] bg-white shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
              <CardContent className="flex h-full flex-col px-6 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef1fb] text-[#24385b]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 min-h-[3.5rem] text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
                <p className="mt-2 max-w-[34ch] text-sm leading-7 text-slate-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  )
}





