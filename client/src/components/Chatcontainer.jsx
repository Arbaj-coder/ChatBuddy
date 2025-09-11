// Chatcontainer.jsx
// Chatcontainer.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utills";
import { ChatContext } from "../../context/ChatContex";
import { AuthContext } from "../../context/AuthContext";
import CallModal from "./CallModel";
import useCall from "../hooks/useCall";
// import useCall from './hooks/useCall'; // Make sure this path is correct

const Chatcontainer = ({ setShowProfile }) => {
  const scrollEnd = useRef();

  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } =
    useContext(ChatContext);
  const { authUser, onlineUsers, socket } = useContext(AuthContext);

  const [input, setInput] = useState("");

  // -------------------- USE THE useCall HOOK --------------------
  // All the call logic is now managed by the useCall hook.
  const {
    incomingCall,
    isCalling,
    inCall,
    localStream,
    remoteStream,
    callUser,
    acceptCall,
    endCall,
    setIncomingCall,
  } = useCall({ socket, authUser, selectedUser });

  // -------------------- Chat Handlers --------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return null;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      alert("Select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  // -------------------- NEW CALL HANDLERS using useCall hook --------------------
  const handleStartCall = () => {
    if (selectedUser) {
      // We pass `video: true` to indicate a video call
      callUser({ toUserId: selectedUser._id, video: true });
    }
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      acceptCall({
        fromUserId: incomingCall.fromUserId,
        sdp: incomingCall.sdp,
        video: true,
      });
    }
  };

  const handleDeclineCall = () => {
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    // We need to know who to notify about the call ending.
    const remoteUserId = selectedUser?._id || incomingCall?.fromUserId;
    endCall(remoteUserId);
  }


  // -------------------- RENDER --------------------
  return selectedUser ? (
    <div className="h-full overflow-hidden flex flex-col backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full cursor-pointer"
          onClick={() => setShowProfile(true)}
        />
        <p
          className="flex-1 text-lg text-white flex items-center gap-2 cursor-pointer"
          onClick={() => setShowProfile(true)}
        >
          {selectedUser.fullName}
          {selectedUser?._id && onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>

        {/* 📞 Call Button -> Updated to use handleStartCall */}
        <button
          onClick={handleStartCall}
          className="bg-green-500 text-white px-3 py-1 rounded-full text-sm"
        >
          Call
        </button>

        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden max-w-7 cursor-pointer"
        />
        <img src={assets.help_icon} alt="" className="max-md:hidden max-w-5" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-3 pb-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 justify-end ${
              msg.senderId !== authUser._id && "flex-row-reverse"
            }`}
          >
            {msg.image ? (
              <img
                src={msg.image}
                alt=""
                className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8"
              />
            ) : (
              <p
                className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${
                  msg.senderId === authUser._id
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
              >
                {msg.text}
              </p>
            )}
            <div className="text-center text-xs">
              <img
                src={
                  msg.senderId === authUser._id
                    ? authUser?.profilePic || assets.avatar_icon
                    : selectedUser.profilePic || assets.avatar_icon
                }
                alt=""
                className="w-7 rounded-full"
              />
              <p className="text-gray-500">{formatMessageTime(msg.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>

      {/* Bottom Area */}
      <div className="flex items-center gap-3 p-3 border-t border-stone-500">
        <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
          <input
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
            value={input}
            type="text"
            placeholder="Send a message"
            className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400"
          />
          <input
            onChange={handleSendImage}
            type="file"
            id="image"
            accept="image/png , image/jpeg ,image/jpg"
            hidden
          />
          <label htmlFor="image">
            <img
              src={assets.gallery_icon}
              alt=""
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>
        <img
          onClick={handleSendMessage}
          src={assets.send_button}
          alt=""
          className="w-7 cursor-pointer"
        />
      </div>

      {/* Call Modal -> Updated with new handlers */}
      {(incomingCall || isCalling || inCall) && (
        <CallModal
          incomingCall={incomingCall}
          isCalling={isCalling}
          inCall={inCall}
          localStream={localStream}
          remoteStream={remoteStream}
          callerName={incomingCall?.fromName}
          calleeName={selectedUser?.fullName}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEnd={handleEndCall}
        />
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden h-full">
      <img src={assets.logo_icon} alt="" className="max-w-16" />
      <p className="text-lg font-medium text-white">chat anytime, anywhere</p>
    </div>
  );
};

export default Chatcontainer;
