import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from "dotenv"

dotenv.config()

//configure cloudnary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //Upload file to cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath, {
                resource_type: "auto"
            }
        )
        console.log("File uploaded on Cloudinary. File src:" + response.url);
        return response;

    } catch (error) {
        console.log("Error on Cloudinary", error)
        fs.unlinkSync(localFilePath)//remove file from local uploads folder
        return null
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy
        (publicId)
        console.log("Deleted from cloudinary. Public id", publicId)
    } catch (error) {
        console.log("Error deleting from cloudinary", error)
        return null
        
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}