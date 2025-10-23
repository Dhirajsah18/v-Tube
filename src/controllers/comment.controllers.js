import mongoose from "mongoose"
import { Comment } from "../models/comment.models.js"
import { Video as Video } from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comments = await Comment.find({ video: videoId })
        .populate('owner', 'username avatar fullName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Comment.countDocuments({ video: videoId });

    return res
    .status(200)
    .json(new ApiResponse(200, { comments, total }, "Comments fetched successfully"));
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.body;
    const { content } = req.body;
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    if (!content || !content.trim()) {
        throw new ApiError(400, "Comment content is required");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });

    return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    if (!content || !content.trim()) {
        throw new ApiError(400, "Comment content is required");
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own comments");
    }

    comment.content = content;
    await comment.save();

    return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own comments");
    }

    await Comment.findByIdAndDelete(commentId);
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }