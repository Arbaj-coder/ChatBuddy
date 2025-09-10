import React, { useContext, useEffect, useState } from 'react'
import assets, { imagesDummyData } from '../assets/assets'
import { ChatContext } from '../../context/ChatContex'
import { AuthContext } from '../../context/AuthContext';

const RightSidebar = ({setShowProfile }) => {

  const {selectedUser , messages} = useContext(ChatContext);
  const {logout , onlineUsers} = useContext(AuthContext)
  const [msgImages , setMsgImages] = useState([])

  useEffect(()=>{
      setMsgImages(
        messages.filter(msg=> msg.image).map(msg=>msg.image)
      )
  },[messages])
  return (
    selectedUser && (
      <div className="bg-[#8185B2]/10 text-white w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#ffffff30]">
          <h2 className="text-lg font-medium">Profile</h2>
          <img
            src={assets.arrow_icon}
            alt="back"
            className="w-6 cursor-pointer"
            onClick={() => setShowProfile(false)} // 👈 go back to chat
          />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="pt-6 flex flex-col items-center gap-2 text-xs font-light mx-auto">
            <img
              src={selectedUser?.profilePic || assets.avatar_icon}
              alt=""
              className="w-20 aspect-[1/1] rounded-full"
            />
            <h1 className="px-10 text-xl font-medium mx-auto flex items-center gap-2">
              {onlineUsers.includes(selectedUser._id) &&<span className="w-2 h-2 rounded-full bg-green-500"></span>}
              <span>{selectedUser.fullName}</span>
            </h1>
            <p className="px-10 mx-auto text-center">{selectedUser.bio}</p>
          </div>

          <hr className="border-[#ffffff50] my-4" />

          <div className="px-5 text-xs">
            <p>Media</p>
            <div className="mt-2 max-h-[200px] overflow-y-scroll grid grid-cols-2 gap-4 opacity-80">
              {msgImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => window.open(url)}
                  className="cursor-pointer rounded"
                >
                  <img src={url} alt="" className="h-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <div className="p-5">
          <button onClick={()=>logout()} className="w-full bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none text-xs font-light py-2 rounded-full cursor-pointer">
            Logout
          </button>
        </div>
      </div>
    )
  )
}

export default RightSidebar
