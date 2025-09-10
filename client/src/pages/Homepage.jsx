import React, { useContext, useState } from "react";
import Sidebar from "../components/Sidebar";
import Chatcontainer from "../components/Chatcontainer";
import RightSidebar from "../components/RightSidebar";
import { ChatContext } from "../../context/ChatContex";

function Homepage() {
  const { selectedUser, setSelectedUser } = useContext(ChatContext);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="w-full h-screen sm:px-[15%] sm:py-[5%]">
      <div
        className={`
          backdrop-blur-xl border-2 border-gray-600 rounded-2xl overflow-hidden h-full
          grid
          ${selectedUser ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}
        `}
      >
        {/* Sidebar (hidden on mobile when a chat is active) */}
        <div
          className={`
            ${selectedUser ? "hidden md:block" : "block"}
          `}
        >
          <Sidebar />
        </div>

        {/* Main area (chat or profile) */}
        <div
          className={`
            ${selectedUser ? "block" : "hidden md:block"}
          `}
        >
          {showProfile ? (
            <RightSidebar setShowProfile={setShowProfile} />
          ) : (
            <Chatcontainer setShowProfile={setShowProfile} />
          )}

          {/* Back button for mobile */}
         
        </div>
      </div>
    </div>
  );
}

export default Homepage;
