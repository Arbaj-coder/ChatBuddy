// src/hooks/useCall.js
import { useEffect, useRef, useState } from "react";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // you can add TURN servers here for production (needed for NAT)
  ],
};

export default function useCall({ socket, authUser, selectedUser }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null); // payload of incoming call
  const [isCalling, setIsCalling] = useState(false); // we are calling someone
  const [inCall, setInCall] = useState(false); // call active
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  // Helper: create RTCPeerConnection
  const createPeerConnection = (isInitiator, toUserId) => {
    pcRef.current = new RTCPeerConnection(STUN_SERVERS);

    // remote stream holder
    remoteStreamRef.current = new MediaStream();
    setRemoteStream(remoteStreamRef.current);

    // when remote tracks arrive add them to remoteStreamRef
    pcRef.current.ontrack = (event) => {
      event.streams?.forEach((s) => {
        s.getTracks().forEach((t) => remoteStreamRef.current.addTrack(t));
      });
      // update state reference
      setRemoteStream(remoteStreamRef.current);
    };

    // ICE candidate -> send to other peer via socket
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          toUserId,
          candidate: event.candidate,
          fromUserId: authUser._id,
        });
      }
    };

    // attach local tracks if present
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pcRef.current.addTrack(track, localStreamRef.current);
      });
    }

    return pcRef.current;
  };

  // Start local media
  const startLocalStream = async ({ audio = true, video = false } = {}) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("getUserMedia error:", err);
      throw err;
    }
  };

  // Initiate call (caller):
  // - start local media
  // - create pc, create offer, setLocalDesc, send 'webrtc-offer' with sdp
  const callUser = async ({ toUserId, video = false }) => {
    setIsCalling(true);
    await startLocalStream({ audio: true, video });

    const pc = createPeerConnection(true, toUserId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
      toUserId,
      fromUserId: authUser._id,
      sdp: pc.localDescription,
    });
  };

  // Accept incoming call (callee) — called when incoming offer arrives
  const acceptCall = async ({ fromUserId, sdp, video = false }) => {
    setIncomingCall(null);
    setInCall(true);

    await startLocalStream({ audio: true, video });

    const pc = createPeerConnection(false, fromUserId);

    // set remote offer
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc-answer", {
      toUserId: fromUserId,
      fromUserId: authUser._id,
      sdp: pc.localDescription,
    });
  };

  // When we get remote answer (caller)
  const handleAnswer = async ({ sdp }) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    setInCall(true);
    setIsCalling(false);
  };

  // When we get remote offer (callee)
  const handleOffer = async (payload) => {
    // payload: { fromUserId, fromName, sdp }
    setIncomingCall(payload);
  };

  // When ICE candidate arrives
  const handleRemoteIce = async ({ candidate }) => {
    try {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error("Failed to add remote ice candidate:", err);
    }
  };

  // End/cleanup call
  const endCall = (toUserId) => {
    // notify remote
    if (toUserId) {
      socket.emit("end-call", { toUserId, fromUserId: authUser._id });
    }
    cleanup();
  };

  const cleanup = () => {
    try {
      // stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      // stop remote tracks
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((t) => t.stop());
        remoteStreamRef.current = null;
        setRemoteStream(null);
      }
      // close pc
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    } catch (err) {
      console.warn("cleanup error", err);
    } finally {
      setIncomingCall(null);
      setInCall(false);
      setIsCalling(false);
    }
  };

  // socket events wiring
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = (payload) => {
      // incoming call notification — call popup
      handleOffer(payload);
    };

    const onOffer = (payload) => {
      // Offer for WebRTC (payload.sdp)
      handleOffer(payload);
    };

    const onAnswer = (payload) => {
      handleAnswer(payload);
    };

    const onIce = (payload) => {
      handleRemoteIce(payload);
    };

    const onEndCall = () => {
      cleanup();
    };

    socket.on("incoming-call", onIncomingCall);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("end-call", onEndCall);

    return () => {
      socket.off("incoming-call", onIncomingCall);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("end-call", onEndCall);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, authUser]);

  return {
    incomingCall,
    isCalling,
    inCall,
    localStream,
    remoteStream,
    callUser,
    acceptCall,
    endCall,
    cleanup,
    setIncomingCall,
  };
}
