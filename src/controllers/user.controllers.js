import asyncHandler from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"  
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import Jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
try {
        const user = await User.findById(userId)
 
        if (!user) {
            throw new ApiError(404, "User not found")
        }
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    
} catch (error) {
    throw new ApiError(500, "Something went Wrong while access and restart tokens")   
}
}

const registerUser = asyncHandler( async (req, res) => {
    const {fullname, email, username, password} = req.body

    //validation 
    if(
        [fullname, username, email, password].some((field) => field?.trim() === "")
     ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    console.warn(req.files)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is misssing")
    }

    // const avatar = uploadOnCloudinary(avatarLocalPath)
    // let coverImage = ""
    // if (coverLocalPath){
    //     coverImage = uploadOnCloudinary(coverLocalPath)
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Upload avatar", avatar)        
    } catch (error) {
        console.log("Error uploading avatar", error)
        throw new ApiError(500, "Failed to upload avatar")
        
    }

    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("Uploaded coverImage", coverImage)        
    } catch (error) {
        console.log("Error uploading coverImage", error)
        throw new ApiError(500, "Failed to upload coverImage")
        
    }

    try {
        const user = await User.create({
    fullName: fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser){
        throw new ApiError(500, "User registration failed")
    }

    return res
    .status(201)
    .json( new ApiResponse(200, createdUser, "User registered successfully") )

    } catch (error) {
        console.log("User creation failed")

        if (avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if (coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }

         throw new ApiError(500, "User registration failed and images were deleted")
    }

})

const loginUser = asyncHandler( async (req, res) => {
    // get a data from body
    const {email, username, password} = req.body

    //validatuion
    if(!email){
        throw new ApiError(400, "Email is required")
    }
    const user = await User.findOne({
        $or: [{email}, {username}]
    })
    if(!user){
        throw new ApiError(400, "User not found")
    }

    // validate Password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid){
        throw new ApiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken},
        "User logged in successfully"
        ))
}) 

const logoutUser = asyncHandler ( async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken: 1 // this removes the fiels from document
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = Jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken._id)
    
        if (!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is Expired or used")        
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newrefreshToken},
                "Access Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
        
    }

})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect =  user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Old password is incorrect")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    const {fullname, email} = req.body

    if(!fullname?.trim() || !email?.trim()){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullname,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }
    // delete old image from cloudinary
    if (req.user?.avatar){
        const publicId = req.user.avatar.split("/").pop().split(".")[0]
        await deleteFromCloudinary(publicId)
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover file is missing")
    }
    // delete old image from cloudinary
    if (req.user?.coverImage){
        const publicId = req.user.coverImage.split("/").pop().split(".")[0]
        await deleteFromCloudinary(publicId)
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!coverImage){
        throw new ApiError(400, "Error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params

    if (!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate( [
        {
            $match: {
                username: username.toLowerCase()      
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {$size: "$subscribers"},
                channelsSubscribedToCount: {$size: "$subscribedTo"},
                isSubscribed: {
                    $cond: {
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                createdAt: 1,
            }
        }
    ])
    if (!channel?.length){
        throw new ApiError(404, "Channel not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User Channel profile fetched successfully"))
})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner"}
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

}