import React, { useContext } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Homepage from './pages/Homepage'
import Loginpage from './pages/Loginpage'
import ProfilePage from './pages/ProfilePage'
import {Toaster} from "react-hot-toast"
import { AuthContext } from '../context/AuthContext'

function App() {
  const {authUser} = useContext(AuthContext);
  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <Toaster/>
      {/* <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-10"
      >
        <source
          src="https://static.vecteezy.com/system/resources/previews/012/510/602/mp4/blue-liquid-animation-background-abstract-colors-flowing-fluid-blue-surface-pattern-water-animation-effect-elegant-festive-flow-futuristic-gloss-glossy-glow-graphic-loop-magic-noise-free-video.mp4"
          type="video/mp4"
        />
      </video> */}

      <img src="/w12.jpg" alt="" className="absolute top-0 left-0 w-full h-full object-cover -z-10"/>

      {/* Page Content */}
      <Routes>
        <Route path="/" element={authUser ? <Homepage /> : <Navigate to="/login"/>} />
        <Route path="/login" element={!authUser ?<Loginpage /> : <Navigate to="/"/>} />
        <Route path="/profile" element={authUser ? <ProfilePage/> : <Navigate to="/login"/>} />
      </Routes>
    </div>
  )
}

export default App
