import { AlertCircle, BookPlus } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AppShell from "@/components/AppShell"
import { useAuth } from "@/auth/useAuth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProfessorCourse, getCourseErrorMessage, getCourseFieldErrors } from "@/lib/professorCourses"

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewCoursePage() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()
  const [denumire, setDenumire] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState(getTodayInputValue)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field, value) {
    setFieldErrors((current) => ({ ...current, [field]: "" }))
    setSubmitError("")

    if (field === "denumire") {
      setDenumire(value)
    }

    if (field === "descriere") {
      setDescription(value)
    }

    if (field === "dataInceput") {
      setStartDate(value)
    }
  }

  function validateForm() {
    const nextErrors = {}

    if (!denumire.trim()) {
      nextErrors.denumire = "Denumirea cursului este obligatorie."
    }

    if (!startDate) {
      nextErrors.dataInceput = "Data de început este obligatorie."
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      const createdCourse = await createProfessorCourse({ denumire, descriere: description, dataInceput: startDate })
      navigate(createdCourse?.id ? `/courses/${createdCourse.id}` : "/courses")
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshAuth()
      }
      setFieldErrors((current) => ({ ...current, ...getCourseFieldErrors(error) }))
      setSubmitError(getCourseErrorMessage(error, "Nu am putut salva cursul."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell
      title="Curs nou"
      description="Creează un curs nou și completează informațiile principale pentru început."
      eyebrow="Profesor"
    >
      <Card className="mx-auto max-w-3xl rounded-[1.75rem] border-[#e4d8cd] bg-white/92 shadow-[0_18px_48px_rgba(32,46,84,0.08)]">
        <CardHeader className="items-center px-6 pt-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#f5eee5] text-[#4A5681]">
            <BookPlus className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl text-slate-900">Adaugă un curs nou</CardTitle>
          <CardDescription className="max-w-xl text-base leading-7">
            Completează denumirea, descrierea și data de început pentru curs.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {submitError ? (
              <Alert variant="destructive" className="rounded-3xl border-rose-200 bg-white/90 px-5 py-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nu am putut salva cursul</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2.5">
              <Label htmlFor="course-name" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">
                DENUMIRE CURS *
              </Label>
              <Input
                id="course-name"
                value={denumire}
                onChange={(event) => updateField("denumire", event.target.value)}
                placeholder="Ex: Programare Web"
                className="h-13 rounded-2xl border-[#e4d8cd] bg-[#f7efe6] px-4 text-base shadow-none placeholder:text-slate-400 focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
              />
              {fieldErrors.denumire ? <p className="text-sm text-rose-600">{fieldErrors.denumire}</p> : null}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="course-start-date" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">
                DATA ÎNCEPUT *
              </Label>
              <Input
                id="course-start-date"
                type="date"
                value={startDate}
                onChange={(event) => updateField("dataInceput", event.target.value)}
                className="h-13 rounded-2xl border-[#e4d8cd] bg-[#f7efe6] px-4 text-base shadow-none focus-visible:border-[#24385b] focus-visible:ring-[#24385b]/10"
              />
              {fieldErrors.dataInceput ? <p className="text-sm text-rose-600">{fieldErrors.dataInceput}</p> : null}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="course-description" className="text-[0.8rem] font-semibold tracking-[0.16em] text-slate-600">
                DESCRIERE
              </Label>
              <textarea
                id="course-description"
                value={description}
                onChange={(event) => updateField("descriere", event.target.value)}
                placeholder="Descriere scurtă a cursului"
                className="min-h-32 w-full rounded-2xl border border-[#e4d8cd] bg-[#f7efe6] px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#24385b] focus:ring-2 focus:ring-[#24385b]/10"
              />
              {fieldErrors.descriere ? <p className="text-sm text-rose-600">{fieldErrors.descriere}</p> : null}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="rounded-2xl bg-[#4A5681] px-5 text-white hover:bg-[#3f4a72]">
                {isSubmitting ? "Se salvează..." : "Salvează cursul"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  )
}
