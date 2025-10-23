import mongoose from "mongoose"
import { Like } from "../models/like.models.js"
import { Video } from "../models/video.models.js"
import { Comment } from "../models/comment.models.js"
import { Tweet } from "../models/tweet.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if (!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    const found = await Video.findById(videoId)
    if (!found) {
        throw new ApiError(404, "Video not found")
    }

    const existing = await Like.findOne({ video: videoId, likedBy: req.user._id })
    if (existing) {
        await Like.findByIdAndDelete(existing._id)
        return res.status(200).json(new ApiResponse(200, null, "Video unliked"))
    }

    const like = await Like.create({ video: videoId, likedBy: req.user._id })
    return res.
    status(201).
    json(new ApiResponse(201, like, "Video liked"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const found = await Comment.findById(commentId)
    if (!found) {
        throw new ApiError(404, "Comment not found")
    }
    const existing = await Like.findOne({ comment: commentId, likedBy: req.user._id })
    if (existing) {
        await Like.findByIdAndDelete(existing._id)
        return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment unliked"))
    }

    const like = await Like.create({ comment: commentId, likedBy: req.user._id })
    return res
    .status(201)
    .json(new ApiResponse(201, like, "Comment liked"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    const found = await Tweet.findById(tweetId)
    if (!found) {
        throw new ApiError(404, "Tweet not found")
    }
    const existing = await Like.findOne({ tweet: tweetId, likedBy: req.user._id })
    if (existing) {
        await Like.findByIdAndDelete(existing._id)
        return res
        .status(200)
        .json(new ApiResponse(200, null, "Tweet unliked"))
    }

    const like = await Like.create({ tweet: tweetId, likedBy: req.user._id })
    return res
    .status(201)
    .json(new ApiResponse(201, like, "Tweet liked"))
})
 

const getLikedVideos = asyncHandler(async (req, res) => {
    const likes = await Like.find({ likedBy: req.user._id, video: { $ne: null } })
    .populate({
        path: 'video',
        select: 'title description thumbnail videoFile duration owner',
        populate: { path: 'owner', select: 'username avatar' }
    })

    const videos = likes.map(l => l.video).filter(Boolean)

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}