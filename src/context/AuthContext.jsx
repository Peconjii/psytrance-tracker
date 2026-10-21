import { createContext, useState, useContext, useEffect } from 'react'
import api from '../api/backend'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(() => {
        const savedToken = localStorage.getItem('token')
        return savedToken && savedToken !== 'undefined' ? savedToken : null
    })
    // True while a saved token is being checked, so ProtectedRoute doesn't send the user to /login too early
    const [loading, setLoading] = useState(() => {
        const savedToken = localStorage.getItem('token')
        return Boolean(savedToken && savedToken !== 'undefined')
    })

    useEffect(() => {
        async function loadUser() {
            if (token && token !== 'undefined') {
                try {
                    const response = await api.get('/api/auth/me')
                    setUser(response.data)
                } catch (err) {
                    const status = err.response?.status
                    if (status === 401 || status === 403) {
                        // The token expired or is not valid: log out
                        console.error("Failed to authenticate token, resetting state:", err)
                        localStorage.removeItem('token')
                        setToken(null)
                    } else {
                        // The backend is asleep or unreachable: keep the token, the next page load tries again
                        console.warn("Could not check the saved login, keeping it:", err)
                    }
                    setUser(null)
                }
            }
            setLoading(false)
        }
        loadUser()
    }, [token])

    async function login(username, password) {
        try {
            const response = await api.post('/api/auth/login', { username, password })
            const receivedToken = response.data?.token

            if (!receivedToken) {
                throw new Error("No token returned from server")
            }

            localStorage.setItem('token', receivedToken)
            setToken(receivedToken)

            const userResponse = await api.get('/api/auth/me')
            setUser(userResponse.data)
            return true
        } catch (error) {
            console.error("Login failed:", error)
            throw error
        }
    }

    async function register(username, email, password) {
        const response = await api.post('/api/auth/register', { username, email, password })
        return response.data
    }

    function logout() {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
    }

    // After a change saved on the backend (e.g. reminder emails on/off), so the page shows it without reloading
    function updateUser(changes) {
        setUser(prev => (prev ? { ...prev, ...changes } : prev))
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}

export default AuthContext