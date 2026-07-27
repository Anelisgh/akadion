import axios from "axios"

const axiosInstance = axios.create({
  baseURL: "",
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
})

export default axiosInstance
