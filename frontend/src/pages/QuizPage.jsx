import { AlertCircle, Check, Loader2, RotateCcw, Sparkles } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/ui/button"
import AppShell from "@/components/AppShell"
import AkyChatWidget from "@/components/chat/AkyChatWidget"
import { finalizeazaQuiz, genereazaQuiz, getDetaliuQuizStudent, getDocumenteAccesibile, getIstoricQuizStudent } from "@/lib/conversatii"
import { listStudentCourses } from "@/lib/professorCourses"
import { isStudentUser } from "@/lib/user"
import { cn } from "@/lib/utils"

function getQuizOptionEntries(optiuni) {
  if (Array.isArray(optiuni)) {
    return optiuni.map((value, index) => [String.fromCharCode(65 + index), value])
  }
  if (optiuni && typeof optiuni === "object") {
    return Object.entries(optiuni)
  }
  return []
}

function formatQuizDate(value) {
  if (!value) return ""
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return ""
    return date.toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch { return "" }
}

export default function QuizPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const isStudent = isStudentUser(user)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [accessibleDocuments, setAccessibleDocuments] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  const [selectedQuizDocId, setSelectedQuizDocId] = useState("")
  const [quizNumQuestions, setQuizNumQuestions] = useState(5)

  const [isQuizLoading, setIsQuizLoading] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState({})
  const [currentIncercareId, setCurrentIncercareId] = useState(null)
  const [isFinalizingQuiz, setIsFinalizingQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState(null)
  const [quizError, setQuizError] = useState(null)

  const [activeTab, setActiveTab] = useState("solve")

  const [quizHistory, setQuizHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryAttempt, setSelectedHistoryAttempt] = useState(null)
  const [isLoadingHistoryDetail, setIsLoadingHistoryDetail] = useState(false)

  useEffect(() => {
    if (!isStudent) return
    listStudentCourses()
      .then(data => { if (Array.isArray(data)) setCourses(data) })
      .catch(console.error)
  }, [isStudent])

  useEffect(() => {
    const urlCourseId = searchParams.get("courseId")
    const urlDocId = searchParams.get("documentId")
    if (urlCourseId) setSelectedCourseId(urlCourseId)
    if (urlDocId) setSelectedQuizDocId(urlDocId)
  }, [searchParams])

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
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnsweredQuestions({})
    setQuizResult(null)
    setCurrentIncercareId(null)
    setQuizError(null)
    setSelectedHistoryAttempt(null)
    setQuizHistory([])
  }, [selectedCourseId, loadAccessibleDocuments])

  async function handleStartQuiz() {
    if (!selectedCourseId) return
    setIsQuizLoading(true)
    setQuizError(null)
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnsweredQuestions({})
    setCurrentIncercareId(null)
    setQuizResult(null)
    try {
      const docId = selectedQuizDocId ? Number(selectedQuizDocId) : null
      const data = await genereazaQuiz(selectedCourseId, docId, quizNumQuestions)
      if (data && Array.isArray(data.intrebari) && data.intrebari.length > 0) {
        setCurrentIncercareId(data.incercareId)
        setQuizQuestions(data.intrebari)
      } else if (Array.isArray(data) && data.length > 0) {
        setQuizQuestions(data)
      } else {
        setQuizError("Gemini nu a putut returna intrebari structurate corect. Reincearca.")
      }
    } catch (err) {
      setQuizError(err.response?.data?.eroare || err.response?.data?.detail || "Nu am putut genera quiz-ul.")
    } finally { setIsQuizLoading(false) }
  }

  function handleAnswerClick(optionKey) {
    if (quizResult) return
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestionIndex]: { selectedOption: optionKey } }))
  }

  async function handleFinalizeQuiz() {
    if (!currentIncercareId || isFinalizingQuiz) return
    setIsFinalizingQuiz(true)
    setQuizError(null)
    try {
      const payload = quizQuestions.map((q, idx) => ({
        index: q.index !== undefined ? q.index : idx,
        raspunsStudent: answeredQuestions[idx]?.selectedOption || null
      }))
      const res = await finalizeazaQuiz(currentIncercareId, payload)
      setQuizResult(res)
    } catch (err) {
      setQuizError(err.response?.data?.eroare || err.response?.data?.detail || "Nu am putut finaliza quiz-ul.")
    } finally { setIsFinalizingQuiz(false) }
  }

  function handleResetQuiz() {
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnsweredQuestions({})
    setQuizError(null)
    setCurrentIncercareId(null)
    setQuizResult(null)
  }

  async function loadQuizHistory() {
    setIsLoadingHistory(true)
    setSelectedHistoryAttempt(null)
    try {
      const res = await getIstoricQuizStudent(selectedCourseId || null)
      const items = Array.isArray(res) ? res : (res?.content || res?.continut || [])
      setQuizHistory(items)
    } catch (err) { console.error(err) }
    finally { setIsLoadingHistory(false) }
  }

  async function handleViewAttemptDetail(item) {
    const incercareId = typeof item === "object" ? (item.incercareId || item.id) : item
    if (!incercareId) return
    setIsLoadingHistoryDetail(true)
    setSelectedHistoryAttempt({
      incercareId,
      cursDenumire: item.cursDenumire || "",
      documentTitlu: item.documentTitlu || "",
      scor: item.scor || 0,
      nrIntrebari: item.nrIntrebari || 0,
      procentaj: item.procentaj || 0,
      detalii: []
    })
    try {
      const detail = await getDetaliuQuizStudent(incercareId)
      setSelectedHistoryAttempt(detail)
    } catch (err) { console.error(err) }
    finally { setIsLoadingHistoryDetail(false) }
  }

  return (
    <AppShell title="Quiz Smart Aky" description="Testeaza-ti cunostintele cu intrebari generate din materiile tale">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Quiz Smart Aky</h1>
            <p className="text-sm text-slate-500 mt-0.5">Genereaza un test grila din materialele tale de curs</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab("solve")}
            className={cn("px-5 py-2.5 text-sm font-semibold rounded-t-xl border border-b-0 transition",
              activeTab === "solve" ? "bg-white border-slate-200 text-[#24385b] shadow-sm" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Quiz Nou
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("history"); loadQuizHistory() }}
            className={cn("px-5 py-2.5 text-sm font-semibold rounded-t-xl border border-b-0 transition",
              activeTab === "history" ? "bg-white border-slate-200 text-[#24385b] shadow-sm" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Istoric Note
            </div>
          </button>
        </div>

        {/* === TAB: QUIZ NOU === */}
        {activeTab === "solve" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Config */}
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 space-y-4">
              <p className="text-xs font-bold tracking-[0.16em] text-slate-400 uppercase">Configurare Quiz</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="quiz-course" className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Curs</label>
                  <select id="quiz-course" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} disabled={isQuizLoading}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#24385b] focus:border-[#3b6ea8] focus:outline-none">
                    <option value="">Selecteaza cursul...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.denumire}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="quiz-doc" className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Sursa Intrebarilor</label>
                  <select id="quiz-doc" value={selectedQuizDocId} onChange={e => setSelectedQuizDocId(e.target.value)} disabled={isQuizLoading || !selectedCourseId}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#24385b] focus:border-[#3b6ea8] focus:outline-none disabled:opacity-50">
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
                  <label htmlFor="quiz-nr" className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Numar Intrebari</label>
                  <select id="quiz-nr" value={quizNumQuestions} onChange={e => setQuizNumQuestions(Number(e.target.value))} disabled={isQuizLoading}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#24385b] focus:outline-none">
                    {[3, 5, 10, 15].map(n => <option key={n} value={n}>{n} Intrebari</option>)}
                  </select>
                </div>
              </div>
              <Button disabled={isQuizLoading || !selectedCourseId} onClick={handleStartQuiz}
                className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 shadow-md disabled:opacity-50">
                {isQuizLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Se genereaza quiz-ul...</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Genereaza Quiz</>
                }
              </Button>
            </div>

            {/* Body */}
            <div className="p-6">
              {isQuizLoading && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                  <p className="text-base font-semibold text-slate-500 animate-pulse">Se citeste materia si se pregatesc intrebarile...</p>
                </div>
              )}

              {!isQuizLoading && quizError && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                  <p className="font-semibold text-rose-800">{quizError}</p>
                  <p className="text-xs text-slate-500">Asigura-te ca exista documente incarcate si indexate in saptamanile parcurse.</p>
                </div>
              )}

              {!isQuizLoading && !quizError && quizQuestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-400">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-700">Verifica-ti cunostintele!</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto">Selecteaza un curs, alege sursa si apasa pe butonul de mai sus pentru a genera un test grila.</p>
                  </div>
                </div>
              )}

              {!isQuizLoading && !quizError && quizQuestions.length > 0 && (
                <div className="space-y-6">
                  {quizResult ? (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Quiz Finalizat</span>
                      <div className="text-3xl font-extrabold text-emerald-900">
                        Scor: {quizResult.scor} / {quizResult.nrIntrebari} ({quizResult.procentaj}%)
                      </div>
                      <p className="text-xs text-emerald-700 font-medium">Nota a fost inregistrata in istoric.</p>
                      <Button onClick={handleResetQuiz} className="mt-2 px-6 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500">
                        Quiz Nou / Reset
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                      <span>Intrebarea {currentQuestionIndex + 1} din {quizQuestions.length}</span>
                      <span>Raspunsuri selectate: {Object.keys(answeredQuestions).length} / {quizQuestions.length}</span>
                    </div>
                  )}

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }} />
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                    <p className="text-xl font-bold text-slate-800 leading-snug">
                      {quizQuestions[currentQuestionIndex].intrebare}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(quizQuestions[currentQuestionIndex].optiuni || {}).map(([key, value]) => {
                      const questionFeedback = quizResult?.detalii?.[currentQuestionIndex]
                      const selectedOption = answeredQuestions[currentQuestionIndex]?.selectedOption
                      const isThisOptionSelected = selectedOption === key
                      let buttonStyle = "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                      let iconBadge = null
                      if (quizResult && questionFeedback) {
                        const isThisOptionCorrect = questionFeedback.raspunsCorect === key
                        if (isThisOptionCorrect && isThisOptionSelected) {
                          buttonStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                          iconBadge = (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                              <Check className="h-4 w-4 text-emerald-600" /> Raspunsul tau (Corect)
                            </span>
                          )
                        } else if (isThisOptionSelected && !isThisOptionCorrect) {
                          buttonStyle = "border-rose-300 bg-rose-50 text-rose-800 font-semibold"
                          iconBadge = (
                            <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-rose-500" /> Raspunsul tau (Incorect)
                            </span>
                          )
                        } else if (isThisOptionCorrect) {
                          buttonStyle = "border-emerald-200 bg-emerald-50/40 text-emerald-800 font-medium"
                          iconBadge = (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <Check className="h-3.5 w-3.5 text-emerald-600" /> Raspuns corect
                            </span>
                          )
                        } else {
                          buttonStyle = "border-slate-100 bg-white text-slate-400 opacity-60"
                        }
                      } else if (isThisOptionSelected) {
                        buttonStyle = "border-amber-400 bg-amber-50/80 text-amber-800 font-bold"
                      }
                      return (
                        <button key={key} disabled={Boolean(quizResult)} onClick={() => handleAnswerClick(key)}
                          className={cn("w-full text-left p-4 rounded-2xl border text-base font-medium flex items-center justify-between gap-4 transition-all", buttonStyle)}>
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <span className={cn("h-9 w-9 rounded-xl border font-bold flex items-center justify-center shrink-0 text-base",
                              isThisOptionSelected ? "border-amber-400 bg-amber-400 text-white" : "border-slate-200 bg-slate-50 text-slate-600")}>
                              {key}
                            </span>
                            <span className="flex-1 mt-0.5 leading-relaxed">{value}</span>
                          </div>
                          {iconBadge}
                        </button>
                      )
                    })}
                  </div>

                  {quizResult?.detalii?.[currentQuestionIndex]?.explicatie && (
                    <div className="p-5 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2">
                      <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">Explicatie:</p>
                      <p className="text-base text-slate-700 leading-relaxed">{quizResult.detalii[currentQuestionIndex].explicatie}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      className="flex-1 h-11 rounded-xl text-sm font-semibold text-slate-600 border-slate-200">
                      Inapoi
                    </Button>
                    {currentQuestionIndex < quizQuestions.length - 1 && (
                      <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="flex-1 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-400 to-orange-500">
                        Urmatoarea
                      </Button>
                    )}
                    {!quizResult && (
                      <Button disabled={isFinalizingQuiz || !currentIncercareId} onClick={handleFinalizeQuiz}
                        className="flex-1 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
                        {isFinalizingQuiz
                          ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Calculare nota...</>
                          : "Finalizeaza Quiz"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === TAB: ISTORIC NOTE === */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-slate-400 uppercase">Toate incercarile si notele salvate</p>
                {selectedHistoryAttempt && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedHistoryAttempt(null)} className="mt-2 h-8 text-xs rounded-xl">
                    {String.fromCharCode(8592)} Inapoi la Istoric
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={loadQuizHistory} className="h-8 px-3 text-xs rounded-xl">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reimprospateaza
              </Button>
            </div>

            <div className="p-6">
              {!selectedHistoryAttempt && (
                <>
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#3b6ea8]" /></div>
                  ) : quizHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <RotateCcw className="h-7 w-7 text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-500">Nu ai rezolvat niciun quiz pana acum.</p>
                      <p className="text-sm text-slate-400">Incearca un quiz nou si nota ta va aparea aici.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quizHistory.map(item => (
                        <div key={item.incercareId || item.id} onClick={() => handleViewAttemptDetail(item)}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm hover:border-slate-300 cursor-pointer transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 truncate max-w-[260px]">
                              {item.documentTitlu || item.cursDenumire || "Quiz general"}
                            </span>
                            <span className={cn("text-xs font-extrabold px-2.5 py-1 rounded-full",
                              item.procentaj >= 80 ? "bg-emerald-100 text-emerald-800" :
                                item.procentaj >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800")}>
                              {item.scor} / {item.nrIntrebari} ({item.procentaj}%)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{formatQuizDate(item.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedHistoryAttempt && (
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                    <p className="text-xs text-emerald-700 font-bold uppercase">Rezultat Incercare</p>
                    <p className="text-3xl font-extrabold text-emerald-900 mt-1">
                      Scor: {selectedHistoryAttempt.scor} / {selectedHistoryAttempt.nrIntrebari} ({selectedHistoryAttempt.procentaj}%)
                    </p>
                  </div>
                  {isLoadingHistoryDetail ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#3b6ea8]" /></div>
                  ) : (
                    <div className="space-y-4">
                      {(selectedHistoryAttempt.detalii || selectedHistoryAttempt.detaliiFeedback)?.map((q, idx) => {
                        const studentAns = q.raspunsStudent
                        const isAnswered = studentAns !== null && studentAns !== undefined && String(studentAns).trim() !== ""
                        return (
                          <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold text-slate-800 flex-1">{idx + 1}. {q.intrebare}</p>
                              {!isAnswered && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 shrink-0 border border-amber-200">
                                  Fara raspuns
                                </span>
                              )}
                            </div>
                            <div className="space-y-2">
                              {getQuizOptionEntries(q.optiuni).map(([key, val]) => {
                                const isCorrect = q.raspunsCorect === key
                                const isStudentAnswer = studentAns === key

                                let style = "text-slate-600 bg-white border-slate-200"
                                let badge = null

                                if (isCorrect && isStudentAnswer) {
                                  style = "text-emerald-800 bg-emerald-50 border-emerald-300 font-semibold"
                                  badge = (
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg shrink-0">
                                      <Check className="h-4 w-4 text-emerald-600" /> Raspunsul tau (Corect)
                                    </span>
                                  )
                                } else if (isStudentAnswer && !isCorrect) {
                                  style = "text-rose-800 bg-rose-50 border-rose-300 font-semibold"
                                  badge = (
                                    <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-lg shrink-0">
                                      <AlertCircle className="h-4 w-4 text-rose-500" /> Raspunsul tau (Incorect)
                                    </span>
                                  )
                                } else if (isCorrect) {
                                  style = "text-emerald-800 bg-emerald-50/40 border-emerald-200 font-medium"
                                  badge = (
                                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Raspuns corect
                                    </span>
                                  )
                                } else {
                                  style = "text-slate-400 bg-white border-slate-100 opacity-60"
                                }

                                return (
                                  <div key={key} className={cn("p-2.5 rounded-xl border text-sm flex items-center justify-between gap-3", style)}>
                                    <span><strong className="mr-1.5">{key}.</strong>{val}</span>
                                    {badge}
                                  </div>
                                )
                              })}
                            </div>
                            {q.explicatie && (
                              <p className="text-xs text-slate-600 bg-blue-50/80 p-3 rounded-xl border border-blue-100">
                                <strong>Explicatie: </strong>{q.explicatie}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Aky chat widget */}
      <AkyChatWidget enabled />
    </AppShell>
  )
}
