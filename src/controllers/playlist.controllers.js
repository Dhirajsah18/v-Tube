import mongoose, {isValidObjectId} from "mongoose"
import { Playlist } from "../models/playlist.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name || !description) {
        throw new ApiError(400, "Name and description are required");
    }
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id.toString(),
        videos: []
    });
    return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user._id.toString();
    const playlists = await Playlist.find({ owner: userId }).populate("videos");
    return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findById(playlistId).populate("videos");
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (playlist.owner !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }
    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id");
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (playlist.owner !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }
    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video already in playlist");
    }
    playlist.videos.push(videoId);
    await playlist.save();
    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist"));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id");
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (playlist.owner !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }
    playlist.videos = playlist.videos.filter(id => id.toString() !== videoId);
    await playlist.save();
    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video removed from playlist"));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (playlist.owner !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }
    await Playlist.findByIdAndDelete(playlistId);
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist deleted successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (playlist.owner !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }
    if (name) playlist.name = name;
    if (description) {
        playlist.description = description;
    }
    await playlist.save();
    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}