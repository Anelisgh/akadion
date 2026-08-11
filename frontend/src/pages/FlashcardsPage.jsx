import { AlertCircle, FileText, Loader2, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/ui/button"
import AppShell from "@/components/AppShell"
import AkyChatWidget from "@/components/chat/AkyChatWidget"
import { genereazaFlashcards, getDocumenteAccesibile } from "@/lib/conversatii"
import { listStudentCourses } from "@/lib/professorCourses"
import { isStudentUser } from "@/lib/user"
import { cn } from "@/lib/utils"

export default function FlashcardsPage() {
  const { user } = useAuth()
  const isStudent = isStudentUser(user)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [accessibleDocuments, setAccessibleDocuments] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  const [selectedFlashcardDocId, setSelectedFlashcardDocId] = useState("")
  const [flashcardNumQuestions, setFlashcardNumQuestions] = useState(5)

  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false)
  const [flashcardQuestions, setFlashcardQuestions] = useState([])
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false)
  const [flashcardError, setFlashcardError] = useState(null)

  useEffect(() => {
    if (!isStudent) return
    listStudentCourses()
      .then(data => { if (Array.isArray(data)) setCourses(data) })
      .catch(console.error)
  }, [isStudent])

  const loadAccessibleDocuments = useCallback(async (courseId) => {
    if (!courseId) { setAccessibleDocuments([]); return }
    setIsLoadingDocs(true)
    try {
      const docs = await getDocumenteAccesibile(courseId)
      setAccessibleDocuments(Array.isArray(docs) ? docs : [])
    } catch (err) { console.error(err) }
    finally { setIsLoadingDocs(false) }
  }, [])

  useEffect(() => {
    loadAccessibleDocuments(selectedCourseId)
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)
    setFlashcardError(null)
  }, [selectedCourseId, loadAccessibleDocuments])

  async function handleStartFlashcards() {
    if (!selectedCourseId) return
    setIsFlashcardsLoading(true)
    setFlashcardError(null)
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)
    try {
      const docId = selectedFlashcardDocId ? Number(selectedFlashcardDocId) : null
      const data = await genereazaFlashcards(selectedCourseId, docId, flashcardNumQuestions)
      if (Array.isArray(data) && data.length > 0) {
        setFlashcardQuestions(data)
      } else {
        setFlashcardError("Gemini nu a putut returna flashcard-uri structurate corect. Reincearca.")
      }
    } catch (err) {
      setFlashcardError(err.response?.data?.eroare || err.response?.data?.detail || "Nu am putut genera flashcard-urile.")
    } finally { setIsFlashcardsLoading(false) }
  }

  function handleResetFlashcards() {
    setFlashcardQuestions([])
    setCurrentFlashcardIndex(0)
    setIsFlashcardFlipped(false)
    setFlashcardError(null)
  }

  return (
    <AppShell title="Flashcards Aky" description="Memoreaza rapid conceptele cheie prin repetitie activa">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Flashcards Smart Aky</h1>
            <p className="text-sm text-slate-500 mt-0.5">Memorare rapida prin repetitie activa cu fise generate din materia ta</p>
          </div>
        </div>

        {/* Config card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 space-y-4">
            <p className="text-xs font-bold tracking-[0.16em] text-slate-400 uppercase">Configurare Flashcards</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="fc-course" className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Curs</label>
                <select id="fc-course" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} disabled={isFlashcardsLoading}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#24385b] focus:border-emerald-500 focus:outline-none">
                  <option value="">Selecteaza cursul...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.denumire}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="fc-doc" className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Sursa Flashcard-urilor</label>
                <select id="fc-doc" value={selectedFlashcardDocId} onChange={e => setSelectedFlashcardDocId(e.target.value)} disabled={isFlashcardsLoading || !selectedCourseId}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#24385b] focus:border-emerald-500 focus:outline-none disabled:opacity-50">
                  <option value="" className="text-slate-800 bg-white">Toate documentele accesibile</option>
                  {accessibleDocuments.map((doc) => {
                    const docId = doc.documentId ?? doc.id
                    const docName = doc.numeFisier || doc.titlu || doc.nume || `Document #${docId}`
                    return (
                      <option key={docId} value={docId} className="text-slate-800 bg-white">
                        {docName}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label htmlFor="fc-nr" className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Numar Fise</label>
                <select id="fc-nr" value={flashcardNumQuestions} onChange={e => setFlashcardNumQuestions(Number(e.target.value))} disabled={isFlashcardsLoading}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#24385b] focus:outline-none">
                  {[3, 5, 8, 12].map(n => <option key={n} value={n}>{n} Flashcard-uri</option>)}
                </select>
              </div>
            </div>
            <Button disabled={isFlashcardsLoading || !selectedCourseId} onClick={handleStartFlashcards}
              className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-600 hover:from-emerald-500 hover:to-teal-700 shadow-md disabled:opacity-50">
              {isFlashcardsLoading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Se genereaza flashcard-urile...</>
                : <><FileText className="h-4 w-4 mr-2" />Genereaza Flashcards</>
              }
            </Button>
          </div>

          {/* Body */}
          <div className="p-6">
            {isFlashcardsLoading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-base font-semibold text-slate-500 animate-pulse">Se extrag conceptele cheie din materie...</p>
              </div>
            )}

            {!isFlashcardsLoading && flashcardError && (
              <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                <p className="font-semibold text-rose-800">{flashcardError}</p>
                <p className="text-xs text-slate-500">Asigura-te ca exista documente incarcate si indexate in saptamanile parcurse.</p>
              </div>
            )}

            {!isFlashcardsLoading && !flashcardError && flashcardQuestions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-400">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-700">Memorare prin Flashcards</h3>
                  <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                    Genereaza fise cu concepte cheie si explicatii pentru a le memora vizual prin repetitie activa.
                  </p>
                </div>
              </div>
            )}

            {!isFlashcardsLoading && !flashcardError && flashcardQuestions.length > 0 && (
              <div className="space-y-6">
                {/* Progress info */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                  <span>Fisa {currentFlashcardIndex + 1} din {flashcardQuestions.length}</span>
                  <span className="text-emerald-500">Memorare activa</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
                    style={{ width: `${((currentFlashcardIndex + 1) / flashcardQuestions.length) * 100}%` }} />
                </div>

                {/* Flip card */}
                <div
                  onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                  className="w-full h-72 cursor-pointer select-none"
                  style={{ perspective: "1000px" }}
                >
                  <div
                    className="w-full h-full relative rounded-3xl"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: isFlashcardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                  >
                    {/* Front face */}
                    <div
                      className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#edf6fc] to-[#dcf0fb] border border-blue-100 rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-sm"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#3b6ea8] bg-[#3b6ea8]/10 px-3 py-1 rounded-full">
                        Concept / Intrebare
                      </span>
                      <p className="text-lg font-bold text-[#24385b] leading-snug flex-1 flex items-center justify-center p-2">
                        {flashcardQuestions[currentFlashcardIndex].fata}
                      </p>
                      <span className="text-xs font-semibold text-[#3b6ea8]/70 flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Apasa pentru raspuns
                      </span>
                    </div>

                    {/* Back face */}
                    <div
                      className="absolute inset-0 w-full h-full bg-white border border-emerald-100 rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-sm"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        Raspuns / Definitie
                      </span>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed flex-1 overflow-y-auto flex items-center justify-center whitespace-pre-wrap max-h-[150px] w-full p-2">
                        {flashcardQuestions[currentFlashcardIndex].verso}
                      </p>
                      <span className="text-xs font-semibold text-emerald-600/70 flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Apasa pentru intoarcere
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    disabled={currentFlashcardIndex === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsFlashcardFlipped(false)
                      setTimeout(() => setCurrentFlashcardIndex(prev => prev - 1), 150)
                    }}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold text-slate-600 border-slate-200"
                  >
                    Inapoi
                  </Button>
                  {currentFlashcardIndex < flashcardQuestions.length - 1 ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsFlashcardFlipped(false)
                        setTimeout(() => setCurrentFlashcardIndex(prev => prev + 1), 150)
                      }}
                      className="flex-1 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-400 to-teal-600"
                    >
                      Urmatorul
                    </Button>
                  ) : (
                    <Button
                      onClick={handleResetFlashcards}
                      className="flex-1 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600"
                    >
                      Finalizeaza &amp; Reset
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aky chat widget */}
      <AkyChatWidget enabled />
    </AppShell>
  )
}
