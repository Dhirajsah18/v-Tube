import mongoose from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // validation
    if (!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    if (req.user?._id.toString() === channelId.toString()){
        throw new ApiError(400, "You cannot subscribe to your own channel")
    }

    const channel = await User.findById(channelId)
    if (!channel){
        throw new ApiError(404, "Channel not found")
    }

    const existing = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })

    if (existing){
        // unsubscribe
        await Subscription.findByIdAndDelete(existing._id)
        return res
        .status(200)
        .json(new ApiResponse(200, null, "Unsubscribed successfully"))
    }

    const sub = await Subscription.create({
        subscriber: req.user._id,
        channel: channelId
    })

    return res
    .status(201)
    .json(new ApiResponse(201, sub, "Subscribed successfully"))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    const channel = await User.findById(channelId)
    if (!channel) throw new ApiError(404, "Channel not found")

    const subscribers = await Subscription.find({ channel: channelId })
        .populate('subscriber', 'username fullName avatar')

    return res.status(200).json(new ApiResponse(200, subscribers, "Channel subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const id = subscriberId || req.user?._id

    if (!mongoose.isValidObjectId(id)){
        throw new ApiError(400, "Invalid subscriber id")
    }

    const subscriber = await User.findById(id)
    if (!subscriber){
        throw new ApiError(404, "Subscriber not found")
    }

    const channels = await Subscription.find({ subscriber: id })
        .populate('channel', 'username fullName avatar')

    return res
    .status(200)
    .json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}