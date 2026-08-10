import axiosInstance from "@/api/axiosInstance"

export async function getConversatiiGlobale(page = 0, size = 20) {
  const response = await axiosInstance.get(`/api/conversatii`, { params: { page, size } })
  return response.data
}

export async function getConversatii(cursId, page = 0, size = 20) {
  const response = await axiosInstance.get(`/api/cursuri/${cursId}/conversatii`, { params: { page, size } })
  return response.data
}

export async function creareConversatieSiMesaj(cursId, intrebare) {
  const response = await axiosInstance.post(`/api/cursuri/${cursId}/conversatii/mesaje`, {
    intrebare
  })
  return response.data
}

export async function getIstoric(conversatieId, inainteDe = null, limit = 20) {
  const params = { limit }
  if (inainteDe) params.inainteDe = inainteDe
  const response = await axiosInstance.get(`/api/conversatii/${conversatieId}/mesaje`, { params })
  return response.data
}

export async function adaugaMesaj(conversatieId, intrebare) {
  const response = await axiosInstance.post(`/api/conversatii/${conversatieId}/mesaje`, { intrebare })
  return response.data
}

export async function retryMesaj(mesajId) {
  const response = await axiosInstance.post(`/api/conversatii/mesaje/${mesajId}/retry`)
  return response.data
}

export async function stergeConversatie(conversatieId) {
  await axiosInstance.delete(`/api/conversatii/${conversatieId}`)
}

export async function getDocumenteAccesibile(cursId) {
  const response = await axiosInstance.get(`/api/student/cursuri/${cursId}/documente-accesibile`)
  return response.data
}

export async function genereazaQuiz(cursId, docIdOrOpts = null, nrIntrebari = 5) {
  let documentId = null
  let numIntrebari = 5

  if (docIdOrOpts && typeof docIdOrOpts === 'object') {
    documentId = docIdOrOpts.documentId ?? null
    numIntrebari = docIdOrOpts.nrIntrebari ?? 5
  } else {
    documentId = docIdOrOpts
    numIntrebari = nrIntrebari
  }

  const response = await axiosInstance.post(`/api/student/cursuri/${cursId}/quiz/generate`, {
    documentId,
    nrIntrebari: numIntrebari
  })
  return response.data
}

export async function genereazaFlashcards(cursId, documentId = null, nrFlashcards = 5) {
  const response = await axiosInstance.post(`/api/student/cursuri/${cursId}/flashcards/generate`, {
    documentId,
    nrFlashcards
  })
  return response.data
}
