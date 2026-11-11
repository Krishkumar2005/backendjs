import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({path: "./.env"});

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath) => {
      try{
        if(!localFilePath) return null

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath, 
            {
                resource_type: 'auto', // Automatically detect the resource type (image, video, etc.)
            }
        )

        //file uploaded successfully, delete the local file
        console.log("File is uploaded successfully to Cloudinary: ", response.url);
        fs.unlinkSync(localFilePath);// remove the locally saved temporary file as the upload operation got success
        return response;

      }catch(error){

        console.log("Error uploading file to Cloudinary: ", error);
        fs.unlinkSync(localFilePath);// remove the locally saved temporary file as the upload operation got failed
        return null;
      }
}

export {uploadOnCloudinary};

// Upload an image
// const uploadResult = await cloudinary.uploader
// .upload(
//     'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//         public_id: 'shoes',
//     }
// )
// .catch((error) => {
//     console.log(error);
// });

// console.log(uploadResult);