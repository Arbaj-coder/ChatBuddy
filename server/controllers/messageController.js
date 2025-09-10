import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io , userSocketMap } from "../server.js";

export const getUsersForSidebar = async(req,res)=>{
    try{
        const userId = req.user._id;
        const filteredUser = await User.find({_id : {$ne: userId}}).select("-password");
        const unseenMessages = {}
        const promises = filteredUser.map(async(user)=>{
            const message = await Message.find({senderId:user._id , receiverId : userId , seen: false})
            if(message.length > 0){
                unseenMessages[user._id] = message.length;
            }
        })
        await Promise.all(promises)
        res.json({success : true , users : filteredUser , unseenMessages})
    }catch(error){
        console.log(error.message)
        res.json({success: false , message : error.message})
    }
}

export const getMessage = async(req,res)=>{
      try{
           const {id : seletedUserId} = req.params;
           const myId = req.user._id
           const messages = await Message.find({
            $or: [
                {senderId: myId , receiverId : seletedUserId},
                {senderId : seletedUserId , receiverId: myId},
            ]
           })           
           await Message.updateMany({senderId: seletedUserId , receiverId :myId}, {seen: true});

           res.json({success: true , messages})
 

      }catch(error){
        console.log(error.message)
        res.json({success: false , message : error.message})
      }
}


export const markMessageAsSeen = async(req,res)=>{
     try{
         const {id} = req.params;
         await Message.findByIdAndUpdate(id , {seen : true})
         res.json({success: true})
     }
     catch{
        
        console.log(error.message)
        res.json({success: false , message : error.message})
     }
}
export const sendMessage = async(req,res)=>{
     try{
        const {text , image} = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }
        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image : imageUrl
        })
          
        const receiverSocketId = userSocketMap[receiverId];
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage" , newMessage)
        }
        res.json({success : true , newMessage});
     }
     catch{
        
        console.log(error.message)
        res.json({success: false , message : error.message})
     }
}