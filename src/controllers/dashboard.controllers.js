import mongoose from "mongoose"
import { Video as Video } from "../models/video.models.js"
import { Subscription } from "../models/subscription.models.js"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user?._id;
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");}

    // Total videos
    const totalVideos = await Video.countDocuments({ owner: channelId });

    // Total views
    const videos = await Video.find({ owner: channelId }, 'views');
    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);

    // Total subscribers
    const totalSubscribers = await Subscription.countDocuments({ channel: channelId });

    // Total likes on videos
    const videoIds = videos.map(v => v._id);
    const totalLikes = await Like.countDocuments({ video: { $in: videoIds } });

    return res
    .status(200)
    .json(new ApiResponse(200, {
        totalVideos,
        totalViews,
        totalSubscribers,
        totalLikes
    }, "Channel stats fetched successfully"));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.user?._id;
    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const videos = await Video.find({ owner: channelId })
        .sort({ createdAt: -1 });

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
})

export {
    getChannelStats, 
    getChannelVideos
    }