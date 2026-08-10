import axiosInstance from "@/api/axiosInstance"

const PROFESSOR_COURSES_PATH = "/api/profesor/cursuri"
const ADMIN_COURSES_PATH = "/api/admin/cursuri"
const STUDENT_COURSES_PATH = "/api/student/cursuri"

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

export function getCourseFieldErrors(error) {
  const fieldErrors = error.response?.data?.campuri
  return fieldErrors && typeof fieldErrors === "object" ? fieldErrors : {}
}

export function getCourseErrorMessage(error, fallbackMessage) {
  const status = error.response?.status
  const backendMessage = error.response?.data?.eroare ?? error.response?.data?.message

  if (backendMessage) {
    return backendMessage
  }

  if (status === 401) {
    return "Sesiunea a expirat. Autentifică-te din nou."
  }

  if (status === 403) {
    return "Nu ai permisiunea necesară pentru această acțiune."
  }

  if (status === 400) {
    return "Cererea trimisă nu este validă."
  }

  if (status === 404) {
    return "Resursa cerută nu a fost găsită."
  }

  if (status === 409) {
    return "Datele trimise sunt în conflict cu informațiile existente (de exemplu, un fișier duplicat)."
  }

  if (status >= 500) {
    return "Serverul a răspuns cu o eroare. Încearcă din nou."
  }

  return fallbackMessage
}

function toCourseRequest(payload) {
  return {
    denumire: payload.denumire.trim(),
    descriere: payload.descriere.trim(),
    dataInceput: payload.dataInceput,
  }
}

export async function listProfessorCourses() {
  const response = await axiosInstance.get(PROFESSOR_COURSES_PATH)
  return normalizeArray(response.data)
}

export async function listAdminCourses() {
  const response = await axiosInstance.get(ADMIN_COURSES_PATH)
  return normalizeArray(response.data)
}

export async function listStudentCourses() {
  const response = await axiosInstance.get(`${STUDENT_COURSES_PATH}/mele`)
  return normalizeArray(response.data)
}

export async function listStudentAvailableCourses() {
  const response = await axiosInstance.get(`${STUDENT_COURSES_PATH}/disponibile`)
  return normalizeArray(response.data)
}

export async function getProfessorCourse(courseId) {
  const response = await axiosInstance.get(`${PROFESSOR_COURSES_PATH}/${courseId}`)
  return response.data
}

export async function getAdminCourse(courseId) {
  const response = await axiosInstance.get(`${ADMIN_COURSES_PATH}/${courseId}`)
  return response.data
}

export async function enrollStudentCourse(courseId) {
  await axiosInstance.post(`${STUDENT_COURSES_PATH}/${courseId}/inscriere`)
}

export async function withdrawStudentCourse(courseId) {
  await axiosInstance.post(`${STUDENT_COURSES_PATH}/${courseId}/retragere`)
}

export async function createProfessorCourse(payload) {
  const response = await axiosInstance.post(PROFESSOR_COURSES_PATH, toCourseRequest(payload))
  return response.data
}

export async function updateProfessorCourse(courseId, payload) {
  const response = await axiosInstance.put(`${PROFESSOR_COURSES_PATH}/${courseId}`, toCourseRequest(payload))
  return response.data
}

export async function setProfessorCourseActive(courseId, active) {
  const action = active ? "activeaza" : "dezactiveaza"
  const response = await axiosInstance.patch(`${PROFESSOR_COURSES_PATH}/${courseId}/${action}`)
  return response.data
}

export async function listCourseWeeks(courseId) {
  const response = await axiosInstance.get(`${PROFESSOR_COURSES_PATH}/${courseId}/saptamani`)
  return normalizeArray(response.data)
}

export async function listAdminCourseWeeks(courseId) {
  const response = await axiosInstance.get(`${ADMIN_COURSES_PATH}/${courseId}/saptamani`)
  return normalizeArray(response.data)
}

export async function listStudentCourseWeeks(courseId) {
  const response = await axiosInstance.get(`${STUDENT_COURSES_PATH}/${courseId}/saptamani`)
  return normalizeArray(response.data)
}

export async function createCourseWeek(courseId, payload) {
  const response = await axiosInstance.post(`${PROFESSOR_COURSES_PATH}/${courseId}/saptamani`, {
    descriere: payload.descriere.trim(),
  })
  return response.data
}

export async function updateCourseWeek(weekId, payload) {
  const response = await axiosInstance.put(`/api/profesor/saptamani/${weekId}`, {
    descriere: payload.descriere.trim(),
  })
  return response.data
}

export async function deleteCourseWeek(weekId) {
  await axiosInstance.delete(`/api/profesor/saptamani/${weekId}`)
}

export async function listWeekDocuments(weekId) {
  const response = await axiosInstance.get(`/api/profesor/saptamani/${weekId}/documente`)
  return normalizeArray(response.data)
}

export async function listAdminWeekDocuments(weekId) {
  const response = await axiosInstance.get(`/api/admin/saptamani/${weekId}/documente`)
  return normalizeArray(response.data)
}

export async function listStudentWeekDocuments(weekId) {
  const response = await axiosInstance.get(`/api/student/saptamani/${weekId}/documente`)
  return normalizeArray(response.data)
}

export async function completeStudentWeek(weekId) {
  await axiosInstance.post(`/api/student/saptamani/${weekId}/complete`)
}

export async function uncompleteStudentWeek(weekId) {
  await axiosInstance.delete(`/api/student/saptamani/${weekId}/complete`)
}

export async function getStudentCourseProfessor(courseId) {
  const response = await axiosInstance.get(`${STUDENT_COURSES_PATH}/${courseId}/profesor`)
  return response.data
}

export async function listProfessorCourseStudents(courseId) {
  const response = await axiosInstance.get(`${PROFESSOR_COURSES_PATH}/${courseId}/studenti`)
  return normalizeArray(response.data)
}

export async function listAdminCourseStudents(courseId) {
  const response = await axiosInstance.get(`${ADMIN_COURSES_PATH}/${courseId}/studenti`)
  return normalizeArray(response.data)
}

export async function getAdminCourseProfessor(courseId) {
  const response = await axiosInstance.get(`${ADMIN_COURSES_PATH}/${courseId}/profesor`)
  return response.data
}

export async function getAdminStats() {
  const response = await axiosInstance.get("/api/admin/stats")
  return response.data
}

export async function uploadWeekDocument(weekId, payload) {
  const formData = new FormData()
  formData.append("file", payload.file)
  formData.append("titlu", payload.titlu.trim())

  const response = await axiosInstance.post(`/api/profesor/saptamani/${weekId}/documente`, formData)
  return response.data
}

export async function updateWeekDocument(documentId, payload) {
  const formData = new FormData()

  if (payload.file) {
    formData.append("file", payload.file)
  }

  if (payload.titlu.trim()) {
    formData.append("titlu", payload.titlu.trim())
  }

  const response = await axiosInstance.put(`/api/profesor/documente/${documentId}`, formData)
  return response.data
}

export async function deleteWeekDocument(documentId) {
  await axiosInstance.delete(`/api/profesor/documente/${documentId}`)
}

export async function retryDocumentIngest(documentId) {
  const response = await axiosInstance.post(`/api/profesor/documente/${documentId}/retry-ingest`)
  return response.data
}
