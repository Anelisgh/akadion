import axiosInstance from "@/api/axiosInstance"

export async function updateMyProfile(payload) {
  const response = await axiosInstance.put("/api/auth/me", payload)
  return response.data
}

export async function updateMyEmail(email) {
  const response = await axiosInstance.put("/api/auth/me/email", { newEmail: email })
  return response.data
}

export async function requestMyPasswordReset() {
  const response = await axiosInstance.post("/api/auth/me/request-password-reset")
  return response.data
}

export function normalizeRole(role) {
  return String(role || "")
    .replace(/^ROLE_/i, "")
    .toUpperCase()
}

export function isAdminUser(user) {
  return normalizeRole(user?.rol) === "ADMIN"
}

export function isProfessorUser(user) {
  return normalizeRole(user?.rol) === "PROFESOR"
}

export function isStudentUser(user) {
  return normalizeRole(user?.rol) === "STUDENT"
}

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === "ADMIN") {
    return "Administrator"
  }

  if (normalizedRole === "PROFESOR") {
    return "Profesor"
  }

  if (normalizedRole === "STUDENT") {
    return "Student"
  }

  return "Utilizator"
}

export function getUserInitials(user) {
  const nameInitials = [user?.prenume, user?.nume]
    .filter(Boolean)
    .map((namePart) => namePart.trim().charAt(0))
    .join("")

  if (nameInitials) {
    return nameInitials.slice(0, 2).toUpperCase()
  }

  return (String(user?.mail || "").trim().charAt(0) || "U").toUpperCase()
}

export function getUserDisplayName(user) {
  return [user?.prenume, user?.nume].filter(Boolean).join(" ") || user?.mail || "Utilizator"
}

export function getUserGreetingName(user) {
  return [user?.prenume, user?.nume].filter(Boolean).join(" ") || user?.displayName || user?.mail || "Utilizator"
}
