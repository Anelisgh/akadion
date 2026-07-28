import axiosInstance from "@/api/axiosInstance"

export async function sendAkyCourseQuestion(courseId, { intrebare, istoricConversatie = [] }) {
  const response = await axiosInstance.post(`/api/student/cursuri/${courseId}/chat`, {
    intrebare,
    istoricConversatie,
  })
  return response.data // Expected shape: { raspuns: string, surseFolosite?: [{ documentId: number, numeFisier: string }] }
}

export async function sendAkyCourseQuestionProfesor(courseId, { intrebare, istoricConversatie = [] }) {
  const response = await axiosInstance.post(`/api/profesor/cursuri/${courseId}/chat`, {
    intrebare,
    istoricConversatie,
  })
  return response.data // Expected shape: { raspuns: string, surseFolosite?: [{ documentId: number, numeFisier: string }] }
}
