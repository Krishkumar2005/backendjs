import {v2 as cloudinary} from 'cloudinary';

const deleteAssetFromCloudinary = async (deleteUrl) => {
    try{
        const lastPartOfUrl = deleteUrl.split('/').pop()
        const publicId = lastPartOfUrl.split('.')[0]
        const response = await cloudinary.uploader.destroy(publicId, {
            //Invalidate: true: is used to remove the cached version of the asset from Cloudinary's CDN(content delivery network), ensuring that the deleted asset is no longer accessible.
            //ensure that a new version of a media asset is delivered
            invalidate: true,
            resource_type: 'auto', // Automatically detect the resource type (image, video, etc.)
        });
        return response;
    }catch(error){
        console.log("Error deleting file from Cloudinary: ", error);
        throw error;
    }
}

export {deleteAssetFromCloudinary};