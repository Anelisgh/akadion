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
]

const usageIdeas = [
  "Poate sintetiza rapid informația esențială dintr-un curs sau dintr-un material mai amplu.",
  "Poate clarifica noțiuni dificile prin explicații mai simple, mai bine organizate și mai ușor de urmărit.",
  "Poate accelera recapitularea prin răspunsuri concise, orientate spre ce este cu adevărat important.",
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
            <p className="text-sm leading-7 text-slate-700">
              <span className="font-semibold text-[#24385b]">Aky este chatbotul Akadion</span> și folosește o arhitectură de tip
              <span className="font-semibold text-[#24385b]"> RAG (Retrieval Augmented Generation)</span>, ceea ce înseamnă că poate combina generarea de răspunsuri cu recuperarea informațiilor relevante pentru a oferi rezultate mai bine ancorate în contextul academic.
            </p>
          </CardContent>
        </Card>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-white shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Bot className="h-5 w-5 text-[#24385b]" />
                Ce este Aky?
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Aky este componenta AI a platformei Akadion, creată pentru a îmbunătăți modul în care utilizatorii caută, înțeleg și valorifică informația academică.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 pt-2 text-sm leading-7 text-slate-600">
              <p>
                Rolul său este să reducă timpul pierdut în căutări repetitive, să ofere claritate în fața unor materiale dificile și să transforme întrebările utilizatorului în răspunsuri utile, bine formulate și imediat aplicabile.
              </p>
              <p>
                Punctul forte al lui Aky este combinația dintre viteză, claritate și relevanță: nu doar răspunde, ci organizează informația într-o formă care sprijină înțelegerea reală și luarea rapidă a unor decizii mai bune în procesul de studiu.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-[#fcf8f3] shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Sparkles className="h-5 w-5 text-[#24385b]" />
                Puncte forte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6 pt-2">
              {usageIdeas.map((idea) => (
                <div key={idea} className="rounded-[1.25rem] border border-[#e4d8cd] bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700">
                  {idea}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {!isAdmin ? (
          <Card className="rounded-[1.75rem] border-[#e4d8cd] bg-[#fcf8f3] shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
            <CardHeader className="px-6 pt-6">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-[#24385b]" />
                  Cum accesezi Aky
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                  Aky este integrat direct în experiența de lucru din platformă, pentru a putea fi folosit exact în momentele în care ai nevoie de ajutor.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 px-6 pb-6 pt-2 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#e4d8cd] bg-white px-5 py-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#4A5681] uppercase">Homepage</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  În pagina principală, Aky poate fi accesat prin widgetul dedicat, astfel încât să poți pune rapid întrebări generale, să ceri explicații și să primești sprijin imediat în procesul de studiu.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#e4d8cd] bg-white px-5 py-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#4A5681] uppercase">Pagini de curs</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  În paginile de cursuri, widgetul Aky rămâne la îndemână pentru întrebări mai specifice, clarificări punctuale și orientare rapidă în raport cu materialele pe care le parcurgi.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="rounded-[1.75rem] border-[#e4d8cd] bg-white shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
              <CardContent className="px-6 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef1fb] text-[#24385b]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  )
}





