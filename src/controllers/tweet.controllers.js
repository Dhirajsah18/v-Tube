import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required");
    }
    if (content.length > 280) {
        throw new ApiError(400, "Tweet exceeds 280 characters");
    }
    const tweet = await Tweet.create({ content, owner: req.user._id });
    return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user._id;
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }
    const tweets = await Tweet.find({ owner: userId })
        .sort({ createdAt: -1 })
        .populate('owner', 'username fullName avatar');
    return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required");
    }
    if (content.length > 280) {
        throw new ApiError(400, "Tweet exceeds 280 characters");
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own tweets");
    }
    tweet.content = content;
    await tweet.save();
    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own tweets");
    }
    await Tweet.findByIdAndDelete(tweetId);
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}