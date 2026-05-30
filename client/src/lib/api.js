import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
})
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred'
    
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      message = error.response.data?.message || 'Something went wrong. Please try again shortly.'
    } else if (error.request) {
      // The request was made but no response was received (Server is down or IP is wrong)
      const targetUrl = error.config?.url || 'the server'
      message = `Shukky's shop is temporarily unreachable. The server might be offline or sleeping.`
      console.warn(`Failed to reach: ${targetUrl}. If you are on a hotspot, check if your computer's IP has changed.`)
    } else {
      // Something happened in setting up the request
      message = error.message
    }

    return Promise.reject(new Error(message))
  }
)

export default api
