import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler( async (req, res) => {
  const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;
  const filter = {};

  if (query) {
    filter.title = { 
      $regex: query,
      $options: "i" 
    };
  }
  if (userId) {
    filter.owner = userId;
  }
  const sort = {};
  sort[sortBy] = sortType === "asc" ? 1 : -1;

  const videos = await video
    .find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("owner", "username avatar");

  const total = await video.countDocuments(filter);

  return res
    .status(200)
    .json(new ApiResponse(200, { videos, total }, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const filePath = req.file?.path;

  if (!filePath){
    throw new ApiError(400, "Video file is required");
}

  const uploadedVideo = await uploadOnCloudinary(filePath, "video");

  if (!uploadedVideo?.url){
    throw new ApiError(500, "Failed to upload video");
}

  const newVideo = await video.create({
    title,
    description,
    videoUrl: uploadedVideo.url,
    owner: req.user._id,
    thumbnail: uploadedVideo.thumbnail || "",
  });

  return res
  .status(201)
  .json(new ApiResponse(201, newVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.isValidObjectId(videoId))
  {
    throw new ApiError(400, "Invalid video ID");
  }
  

  const foundVideo = await video.findById(videoId)
  .populate("owner", "username avatar");
  if (!foundVideo){
    throw new ApiError(404, "Video not found");
  }
  return res
  .status(200)
  .json(new ApiResponse(200, foundVideo, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, thumbnail } = req.body;
  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const updatedVideo = await video.findByIdAndUpdate(
    videoId,
    { $set: { title, description, thumbnail } },
    { new: true }
  );
  if (!updatedVideo) throw new ApiError(404, "Video not found");

  return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.isValidObjectId(videoId)){
    throw new ApiError(400, "Invalid video ID");
  }

  const foundVideo = await video.findById(videoId);
  if (!foundVideo){
    throw new ApiError(404, "Video not found");
  }

  await deleteFromCloudinary(foundVideo.public_id);
  await video.findByIdAndDelete(videoId);

  return res
  .status(200)
  .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

  const foundVideo = await video.findById(videoId);
  if (!foundVideo) throw new ApiError(404, "Video not found");

  foundVideo.isPublished = !foundVideo.isPublished;
  await foundVideo.save();

  return res
  .status(200)
  .json(new ApiResponse(200, foundVideo, "Video publish status toggled"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
