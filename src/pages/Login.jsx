import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        try {
            await login(username, password)
            navigate('/events')
        } catch (err) {
            setError('Invalid username or password')
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-xl w-96">
                <h2 className="text-white text-3xl text-center mb-6">Login</h2>
                {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-xl mb-4 focus:outline-none focus:border-cyan-400 border border-gray-600"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-xl mb-6 focus:outline-none focus:border-cyan-400 border border-gray-600"
                    />
                    <button type="submit" className="w-full bg-purple-700 hover:bg-purple-500 text-white py-3 rounded-xl transition-colors duration-200">
                        Login
                    </button>
            </form>
                <p className="text-gray-400 text-center mt-4">
                    Don't have an account? <Link to="/register" className="text-cyan-400 hover:text-cyan-300">Register</Link>
                </p>
                <p className="text-gray-400 text-center mt-4">
                    Cant remember password? <Link to="/register" className="text-cyan-400 hover:text-cyan-300">click here</Link>
                </p>
            </div>
        </div>
    )
}

export default Login