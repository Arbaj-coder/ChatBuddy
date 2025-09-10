// src/components/CallModal.jsx
import React, { useEffect, useRef } from "react";

export default function CallModal({
  incomingCall,
  isCalling,
  inCall,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEnd,
  callerName,
  calleeName,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream) localVideoRef.current.srcObject = localStream;
      else localVideoRef.current.srcObject = null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) remoteVideoRef.current.srcObject = remoteStream;
      else remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      <div className="bg-black/70 p-4 rounded-md text-white w-[92%] max-w-2xl">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <div className="text-sm text-gray-300 mb-2">
              {incomingCall ? (
                <div>
                  <strong>{incomingCall.fromName || "Caller"}</strong> is calling...
                </div>
              ) : isCalling ? (
                <div>Calling {calleeName || "User"}...</div>
              ) : inCall ? (
                <div>In call with {calleeName || callerName}</div>
              ) : (
                <div>Call</div>
              )}
            </div>

            <div className="flex gap-3">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-2/3 bg-black rounded"
                muted={false}
              />
              <div className="w-1/3 flex flex-col gap-2 items-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full bg-black rounded"
                />
                <div className="flex gap-2 mt-2">
                  {!inCall && incomingCall && (
                    <>
                      <button
                        onClick={onAccept}
                        className="px-3 py-1 bg-green-600 rounded"
                      >
                        Accept
                      </button>
                      <button
                        onClick={onDecline}
                        className="px-3 py-1 bg-red-600 rounded"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {inCall && (
                    <button onClick={onEnd} className="px-3 py-1 bg-red-600 rounded">
                      End Call
                    </button>
                  )}
                  {isCalling && (
                    <button onClick={onEnd} className="px-3 py-1 bg-red-600 rounded">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* optional small close */}
        </div>
      </div>
    </div>
  );
}
