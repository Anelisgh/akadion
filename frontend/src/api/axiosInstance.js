import axios from "axios"

const axiosInstance = axios.create({
  baseURL: "",
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
})

function sanitizeUrls(obj) {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (typeof obj === "string") {
    if (obj.includes("http://minio:9000")) {
      return obj.replace(/http:\/\/minio:9000/g, "http://localhost:9000")
    }
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeUrls)
  }
  if (typeof obj === "object") {
    const res = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[key] = sanitizeUrls(obj[key])
      }
    }
    return res
  }
  return obj
}

axiosInstance.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      response.data = sanitizeUrls(response.data)
    }
    return response
  },
  (error) => Promise.reject(error)
)

export default axiosInstance
