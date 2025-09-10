import axios from "axios"
import { Children, createContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {io} from "socket.io-client"
const backendUrl =import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;
export const AuthContext = createContext();

export const AuthProvider = ({children})=>{
    const [token , setToken] = useState(localStorage.getItem("token"))
    const [authUser , setAuthUser] = useState(null)
    const [onlineUsers , setOnlineUser] = useState([])
    const [socket , setSocket] = useState(null)
    
    const cheakAuth = async()=>{
        try{
             const {data} = await axios.get("/api/auth/check")
             if(data.success){
                setAuthUser(data.user)
                connectSocket(data.user)
             }
        }catch(error){
           toast.error(error.message)
        }
    }

    const login = async(state , credentials) =>{
        try{
             const {data} = await axios.post(`/api/auth/${state}` , credentials)
             if(data.success){
                setAuthUser(data.userData)
                connectSocket(data.userData)
                axios.defaults.headers.common["token"] = data.token
                setToken(data.token);
                localStorage.setItem("token" , data.token)
                toast.success(data.message);

             }
             else{
                toast.error(data.message);
             }
        }catch(error){
              toast.error(error.message);
        }
    }

    const logout = async()=>{
        localStorage.removeItem("token")
        setToken(null)
        setAuthUser(null)
        setOnlineUser([]);
        axios.defaults.headers.common["token"] = null;
        toast.success("Logged Out Successfully")
        socket.disconnect();
    }

    const connectSocket = (userData)=>{
        if(!userData || socket?.connected) return;
        const newSocket = io(backendUrl ,{
            query: {
                userId : userData._id,
            }
        });
        newSocket.connect();
        setSocket(newSocket);
        newSocket.on("getOnlineUsers" , (userIds)=>{
            setOnlineUser(userIds)
        })
    }
    
    const updateProfile = async(body)=>{
        try{
           const {data} = await axios.put("api/auth/update-profile" , body);
           if(data.success){
            setAuthUser(data.user);
            toast.success("Profile Update Successfully")
           }
        }catch(error){ 
            toast.error(error.message)
        }
    }

    useEffect(()=>{
        if(token){
            axios.defaults.headers.common["token"] = token
        }
        cheakAuth();
    },[])

     const value ={
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile
     }
     return(
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
     )
}