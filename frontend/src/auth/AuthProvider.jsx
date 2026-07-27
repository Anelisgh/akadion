import { useEffect, useState } from "react"
import axiosInstance from "@/api/axiosInstance"
import { AuthContext } from "@/auth/AuthContext"
import { startLogout } from "@/auth/logout"

function getErrorMessage(error) {
  return error.response?.data?.message ?? error.response?.data?.eroare ?? "Nu am putut verifica sesiunea curentă."
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState("")

  async function refreshAuth() {
    setLoading(true)

    try {
      const response = await axiosInstance.get("/api/auth/me")
      setUser(response.data)
      setAuthenticated(true)
      setError("")
    } catch (authError) {
      if (authError.response?.status === 401) {
        setUser(null)
        setAuthenticated(false)
        setError("")
      } else {
        setUser(null)
        setAuthenticated(false)
        setError(getErrorMessage(authError))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ loading, authenticated, user, error, refreshAuth, setUser, setAuthenticated, setError, startLogout }}>
      {children}
    </AuthContext.Provider>
  )
}
