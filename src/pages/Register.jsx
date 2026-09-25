import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

function Register() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const { register } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        try {
            await register(username, email, password)
            navigate('/login')
        } catch (err) {
            // Backend sends { message } and, for validation errors, { errors: { field: reason } }
            const data = err.response?.data
            const fieldErrors = data?.errors
                ? Object.entries(data.errors).map(([field, reason]) => `${field}: ${reason}`).join(', ')
                : null
            setError(fieldErrors || data?.message || 'Registration failed. Please try again.')
        }
    }

    return (
        <div className="min-h-[85vh] px-4 flex items-center justify-center">
            <div className="bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-3xl w-full max-w-md border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <h2 className="text-white text-3xl font-extrabold text-center mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                    Register
                </h2>
                {error && <p className="text-red-400 text-center text-sm mb-4 bg-red-500/10 py-2 rounded-xl border border-red-500/20">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-950/80 text-white px-4 py-3 rounded-xl mb-4 focus:outline-none focus:border-cyan-400 border border-slate-800 text-sm transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/80 text-white px-4 py-3 rounded-xl mb-4 focus:outline-none focus:border-cyan-400 border border-slate-800 text-sm transition-all"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/80 text-white px-4 py-3 rounded-xl mb-6 focus:outline-none focus:border-cyan-400 border border-slate-800 text-sm transition-all"
                    />
                    <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer">
                        Register
                    </button>
                </form>
                <p className="text-slate-400 text-center text-xs mt-6">
                    Already have an account? <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Login</Link>
                </p>
            </div>
        </div>
    )
}

export default Register