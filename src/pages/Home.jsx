import { Link } from 'react-router-dom'
import heroImg from '../images/hero.jpg'

function Home() {
    return (
        <div style={{ backgroundImage: `url(${heroImg})` }} className="relative h-screen bg-cover bg-center ">
            <div className="absolute inset-0 bg-black opacity-50 flex flex-col items-center justify-center">
            <h1 className='text-white text-5xl text-center p-4'>PSYTRANCE EVENT TRACKER</h1>
            <div className='flex-box text-center justify-center p-16'>
                <p className='text-white text-3xl text-center p-16'>Where bass meets the cosmos,<br></br> Find your tribe and feel the frequency.</p>
                <Link to="/events" className='bg-purple-700 hover:bg-purple-500 text-white text-5xl justify-center items-center px-8 py-4 rounded-xl'>Explore Events</Link>
            </div>
        </div>
    </div>
)}

export default Home