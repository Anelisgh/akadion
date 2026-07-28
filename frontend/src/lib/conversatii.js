import axiosInstance from "@/api/axiosInstance"

export async function getConversatiiGlobale() {
  const response = await axiosInstance.get(`/api/conversatii`)
  return response.data
}

export async function getConversatii(cursId) {
  const response = await axiosInstance.get(`/api/cursuri/${cursId}/conversatii`)
  return response.data
}

export async function creareConversatieSiMesaj(cursId, intrebare) {
  const response = await axiosInstance.post(`/api/cursuri/${cursId}/conversatii/mesaje`, {
    intrebare
  })
  return response.data
}

export async function getIstoric(conversatieId) {
  const response = await axiosInstance.get(`/api/conversatii/${conversatieId}/mesaje`)
  return response.data
}

export async function adaugaMesaj(conversatieId, intrebare) {
  const response = await axiosInstance.post(`/api/conversatii/${conversatieId}/mesaje`, {
    intrebare
  })
  return response.data
}

export async function stergeConversatie(conversatieId) {
  await axiosInstance.delete(`/api/conversatii/${conversatieId}`)
}
