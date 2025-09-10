import React, { useContext, useState } from 'react'
import assets from '../assets/assets'
import { AuthContext } from '../../context/AuthContext'

function Loginpage() {

  const [currState , setCurrState] = useState("Sign up")
  const [fullName , setfullName] = useState("")
  const [email , setEmail] = useState("")
  const [password , setPassword] = useState("")
  const [bio , setbio] = useState("")
  const [isDataSubmitted , setIsDataSubmitted] = useState(false)

  const {login} = useContext(AuthContext)
  const onSubmitHandler = (event)=>{
       event.preventDefault();
       if(currState === 'Sign up' && !isDataSubmitted){
        setIsDataSubmitted(true)
        return;
       }
       login(currState === "Sign up" ? 'signup' : 'login' , {fullName , email , password , bio});
  }
  return (
    <div className='min-h-screen bg-cover bg-center flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl'>
      
       <img src={assets.logo13} alt="" className='w-[min(50vw,450px)]' />
        
        <form onSubmit={onSubmitHandler} className='border-2 bg-white/8 text-white border-gray-500 p-6 flex flex-col gap-6 rounded-lg shadow-lg'>
           <h2 className='font-medium text-2xl flex justify-between items-center'>
              {currState}
              {isDataSubmitted && <img onClick={()=>setIsDataSubmitted(false)} src={assets.arrow_icon} alt="" className='w-5 cursor-pointer' />}
           </h2>
           {currState=== 'Sign up' && !isDataSubmitted && (
            <input onChange={(e)=>setfullName(e.target.value)} value ={fullName} type="text" className='p-2 border border-gray-500 rounded-md focus:outline-none' placeholder='Full Name' required/>
           )}
           {!isDataSubmitted && (
            <>
             <input onChange={(e)=>setEmail(e.target.value)} value ={email} type="email" className='p-2 border border-gray-500 rounded-md focus:ring-2 focus:ring-indigo-500' placeholder='Email Address' required/>
            <input onChange={(e)=>setPassword(e.target.value)} value ={password} type="password" className='p-2 border border-gray-500 rounded-md focus:ring-2 focus:ring-indigo-500' placeholder='Password' required/>
            </>
           )}

           {currState === 'Sign up' && isDataSubmitted && (
            <textarea onChange={(e)=>setbio(e.target.value)} value={bio} rows={4} className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500' placeholder='provide a short bio...' required></textarea>
           )}

           <button type='submit' className='py-3 bg-gradient-to-r from-purple-400 to-violet-600 text-white rounded-md cursor-pointer'>
              {currState === 'Sign up' ? "Create Account" : "Login Now"}
           </button>

           <div className='flex items-center gap-2 text-sm text-gray-500'>
             <input type="checkbox" />
             <p>Agree to the Terms of use & privacy policy.</p>
           </div>

           <div className='flex flex-col gap-2'>
            {currState === "Sign up" ? (
              <p className='text-sm text-gray-400'>Already Have an Account? <span onClick={()=>{setCurrState("Login"); setIsDataSubmitted(false)}} className='font-medium text-violet-500 cursor-pointer'>Login Here</span></p>
            ) : (
              <p className='text-sm text-gray-300'>Create An Account <span onClick={()=>setCurrState("Sign up")} className='font-medium text-violet-500 cursor-pointer'>Click here</span></p>
            )}

           </div>
        </form>
    </div>
  )
}

export default Loginpage
