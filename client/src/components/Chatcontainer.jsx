// Chatcontainer.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utills";
import { ChatContext } from "../../context/ChatContex";
import { AuthContext } from "../../context/AuthContext";
import CallModal from "./CallModel";

const Chatcontainer = ({ setShowProfile }) => {
  const scrollEnd = useRef();

  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } =
    useContext(ChatContext);
  const { authUser, onlineUsers, socket } = useContext(AuthContext);

  const [input, setInput] = useState("");

  // ---- CALL STATE ----
  const [incomingCall, setIncomingCall] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [inCall, setInCall] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

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

  // -------------------- CALL HANDLERS --------------------
  const createPeerConnection = async () => {
    peerRef.current = new RTCPeerConnection();

    // Local tracks
    localStreamRef.current.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, localStreamRef.current);
    });

    // Remote tracks
    peerRef.current.ontrack = (event) => {
      console.log("📡 Remote stream received:", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    // ICE candidates
    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: selectedUser._id,
          candidate: event.candidate,
        });
      }
    };
  };

  const startCall = async () => {
    if (!selectedUser?._id) return;

    setIsCalling(true);

    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(localStreamRef.current);

    await createPeerConnection();

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);

    socket.emit("call-user", {
      to: selectedUser._id,
      offer,
      from: { _id: authUser._id, name: authUser.fullName },
    });
  };

  const acceptCall = async (offer, callerId) => {
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(localStreamRef.current);

    await createPeerConnection();

    await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    socket.emit("answer-call", {
      to: callerId,
      answer,
    });

    setIncomingCall(null);
    setInCall(true);
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setInCall(false);
    setIsCalling(false);
    setIncomingCall(null);
    setLocalStream(null);
    setRemoteStream(null);

    if (selectedUser?._id) {
      socket.emit("end-call", { toUserId: selectedUser._id });
    }
  };

  // -------------------- SOCKET LISTENERS --------------------
  useEffect(() => {
    if (!socket) return;

    socket.on("incoming-call", ({ from, offer }) => {
      setIncomingCall({ from, offer });
    });

    socket.on("call-answered", async ({ answer }) => {
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      setInCall(true);
      setIsCalling(false);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    socket.on("call-ended", () => {
      endCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [socket]);

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

        {/* 📞 Call Button */}
        <button
          onClick={startCall}
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

      {/* Call Modal */}
      {(incomingCall || isCalling || inCall) && (
        <CallModal
          incomingCall={incomingCall}
          isCalling={isCalling}
          inCall={inCall}
          localStream={localStream}
          remoteStream={remoteStream}
          callerName={incomingCall?.from?.name}
          calleeName={selectedUser?.fullName}
          onAccept={() =>
            acceptCall(incomingCall.offer, incomingCall.from._id)
          }
          onDecline={() => setIncomingCall(null)}
          onEnd={endCall}
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

