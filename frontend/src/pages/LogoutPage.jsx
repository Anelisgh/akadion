import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import completeProfileLogo from "@/assets/logo_bufnita.png"
import wavingOwlVideo from "@/assets/waving_owl.mp4"
import { useEffect } from "react"

function startLogin() {
  window.location.assign("/oauth2/authorization/keycloak")
}

export default function LogoutPage() {
  useEffect(() => {
    window.sessionStorage.removeItem("akadion:logout-success-pending")
  }, [])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbf7f1] px-4 py-10 text-slate-900">
      <div className="pointer-events-none absolute left-[-10rem] top-[-10rem] h-72 w-72 rounded-full bg-[#c8b6ff]/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-12rem] right-[-10rem] h-80 w-80 rounded-full bg-[#8bc8f1]/24 blur-3xl" />

      <Card className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border-[#e7d9c8] bg-white/88 shadow-[0_28px_80px_rgba(32,46,84,0.14)] backdrop-blur-xl">
        <CardContent className="flex flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-10">
          <img src={completeProfileLogo} alt="Akadion" className="mb-3 h-18 w-auto object-contain" />

          <div className="mb-6 space-y-3">
            <p className="text-xs font-bold tracking-[0.22em] text-[#595f8f] uppercase">Sesiune închisă</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#24385b] sm:text-4xl">La revedere!</h1>
            <p className="mx-auto max-w-md text-sm leading-6 text-slate-500 sm:text-base">
              Ai ieșit din contul Akadion. Te așteptăm înapoi când vrei să continui cursurile.
            </p>
          </div>

          <div className="w-full max-w-md rounded-[2rem] border border-[#d9ccbe] bg-[#fffdfa] p-3 shadow-[0_18px_48px_rgba(32,46,84,0.1)]">
            <div className="overflow-hidden rounded-[1.5rem] border border-[#eadfd4] bg-[#f7efe6]">
              <video
                src={wavingOwlVideo}
                className="aspect-[4/3] w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                aria-label="Bufniță care salută"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={startLogin}
            className="mt-7 rounded-2xl border-[#d9ccbe] bg-white px-8 text-base font-semibold text-[#24385b] shadow-sm transition-all hover:bg-[#24385b] hover:text-white hover:border-[#24385b]"
          >
            Inapoi la autentificare
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
