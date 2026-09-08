import { createContext, useState, useContext, useEffect } from 'react'
import api from '../api/backend'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(() => {
        const savedToken = localStorage.getItem('token')
        return savedToken && savedToken !== 'undefined' ? savedToken : null
    })

    useEffect(() => {
        async function loadUser() {
            if (token && token !== 'undefined') {
                try {
                    const response = await api.get('/api/auth/me')
                    setUser(response.data)
                } catch (err) {
                    console.error("Failed to authenticate token, resetting state:", err)
                    localStorage.removeItem('token')
                    setToken(null)
                    setUser(null)
                }
            }
        }
        loadUser()
    }, [token])

    async function login(username, password) {
        try {
            const response = await api.post('/api/auth/login', { username, password })
            
            // Backend vraća {"token": "eyJ..."}
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

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}

export default AuthContext