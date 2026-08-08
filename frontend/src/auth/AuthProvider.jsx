import { useEffect, useRef, useState } from "react"
import axiosInstance from "@/api/axiosInstance"
import { AuthContext } from "@/auth/AuthContext"
import { startLogout } from "@/auth/logout"

function getErrorMessage(error) {
  return error.response?.data?.message ?? error.response?.data?.eroare ?? "Nu am putut verifica sesiunea curentă."
}

// Dacă Spring Security returnează 403 pe un endpoint de business (nu /api/auth/me),
// iar utilizatorul are stareCont ACTIV conform DB-ului, înseamnă că sesiunea
// a fost stabilită înainte de aprobarea contului (autoritățile sunt goale în sesiune).
// Soluția: forțăm un re-login pentru a reîmprospăta sesiunea cu noile autorități.
function forceRelogin() {
  window.location.assign("/oauth2/authorization/keycloak")
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState("")

  // Păstrăm o referință la user pentru a putea fi accesată în interceptorul Axios
  // fără a re-crea interceptorul la fiecare schimbare a stării.
  const userRef = useRef(null)
  useEffect(() => {
    userRef.current = user
  }, [user])

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

  // Interceptor: detectează 403 pe endpoint-uri de business când utilizatorul
  // este ACTIV în DB — semn că sesiunea nu conține autoritățile actualizate.
  useEffect(() => {
    const interceptorId = axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        const is403 = error.response?.status === 403
        const requestUrl = error.config?.url ?? ""
        const isBusinessEndpoint = !requestUrl.includes("/api/auth/me")
        const currentUser = userRef.current
        const isUserActive = currentUser?.stareCont === "ACTIV"

        if (is403 && isBusinessEndpoint && isUserActive) {
          // Sesiunea Spring Security nu are autorități, deși DB-ul spune ACTIV.
          // Forțăm re-autentificarea pentru a reîmprospăta sesiunea.
          forceRelogin()
        }

        return Promise.reject(error)
      }
    )

    return () => {
      axiosInstance.interceptors.response.eject(interceptorId)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ loading, authenticated, user, error, refreshAuth, setUser, setAuthenticated, setError, startLogout }}>
      {children}
    </AuthContext.Provider>
  )
}
