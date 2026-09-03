import { createContext, useState, useContext, useEffect } from 'react'
import api from '../api/backend'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('token'))

     useEffect(() => {
        async function loadUser() {
            if (token) {
                try {
                    const response = await api.get('/api/auth/me')
                    setUser(response.data)
                } catch {
                    localStorage.removeItem('token')
                    setToken(null)
                }
            }
        }
        loadUser()
    }, [])

    async function login(username, password) {
        const response = await api.post('/api/auth/login', { username, password })
        const receivedToken = response.data
        localStorage.setItem('token', receivedToken)
        setToken(receivedToken)
        const userResponse = await api.get('/api/auth/me')
        setUser(userResponse.data)
        return true
    }

    async function register(username, email, password) {
        const response = await api.post('/api/auth/register', { username, email, password })
        setUser(response.data)
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