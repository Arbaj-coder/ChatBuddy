import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utills";
import { ChatContext } from "../../context/ChatContex";
import { AuthContext } from "../../context/AuthContext";

const Chatcontainer = ({ setShowProfile }) => {
  const scrollEnd = useRef();

  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } =
    useContext(ChatContext);
  const { authUser, onlineUsers, socket } = useContext(AuthContext);

  const [input, setInput] = useState("");

  // ---- CALL STATE ----
  const [callActive, setCallActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
  const startCall = async () => {
    if (!selectedUser?._id) return; // ✅ prevent crash

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);

    peerRef.current = new RTCPeerConnection();
    stream.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, stream);
    });

    peerRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
      fromUserId: authUser._id,
      toUserId: selectedUser._id,
      offer,
    });

    setCallActive(true);
  };

  const handleOffer = async ({ fromUserId, offer }) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);

    peerRef.current = new RTCPeerConnection();
    stream.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, stream);
    });

    peerRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    socket.emit("webrtc-answer", {
      fromUserId: authUser._id,
      toUserId: fromUserId,
      answer,
    });

    setCallActive(true);
  };

  const handleAnswer = async ({ answer }) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    }
  };

  const handleCandidate = async ({ candidate }) => {
    if (peerRef.current) {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    }
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    setCallActive(false);
    setLocalStream(null);
    setRemoteStream(null);

    if (selectedUser?._id) {
      socket.emit("end-call", { toUserId: selectedUser._id });
    }
  };

  // -------------------- SOCKET LISTENERS --------------------
  useEffect(() => {
    if (!socket) return;

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("ice-candidate", handleCandidate);
    socket.on("end-call", () => endCall());

    return () => {
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("ice-candidate", handleCandidate);
      socket.off("end-call");
    };
  }, [socket]);

  useEffect(() => {
    if (peerRef.current) {
      peerRef.current.onicecandidate = (event) => {
        if (event.candidate && selectedUser?._id) {
          socket.emit("ice-candidate", {
            fromUserId: authUser._id,
            toUserId: selectedUser._id,
            candidate: event.candidate,
          });
        }
      };
    }
  }, [callActive, selectedUser]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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
      {callActive && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <div className="flex gap-4">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-1/3 rounded-lg border-2 border-white"
            />
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-1/3 rounded-lg border-2 border-white"
            />
          </div>
          <button
            onClick={endCall}
            className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full"
          >
            End Call
          </button>
        </div>
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
