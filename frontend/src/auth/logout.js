export function startLogout() {
  if (typeof window === "undefined") {
    throw new Error("Logout indisponibil în acest mediu.")
  }

  window.sessionStorage.setItem("akadion:logout-success-pending", "1")

  // Backend-ul gestionează închiderea sesiunii și logout-ul OIDC prin navigare completă.
  window.location.assign("/logout")
}
