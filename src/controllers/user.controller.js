import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteAssetFromCloudinary } from "../utils/deleteAssetFromCloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
    console.log("userId: ", userId);
    try{
       const user = await User.findById(userId)
       console.log(user)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken

       // whenever we save model, mongoose model kickin/invoked(mean save model by checking all fields) and validate pre save hook and required fields(whenever we save then ye fields to hona hi chahiye bcoz it required) of model
       // but we want to save only with changed fields that's why we use validateBeforeSave: false
       //save to karna hai but validate nahi karna hai

       user.save({ validateBeforeSave: false })

       // console.log("refreshToken: ", refreshToken);
       // console.log("accessToken: ", accessToken);

       return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
        
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "chai aur code"
    // })

    //steps of logic to register user
    //get user details from frontend
    //validation - not empty
    //check if user already exists: username, email
    //check for images, check for avatar from frontend
    //upload them to cloudinary, check avatar uploaded on cloudinary or not  
    //create user object - create entry in db
    //remove password and  refresh token field from response
    //check for user creation
    // return res


    const { username, email, fullname, password } = req.body;
    console.log(req.body);

    if(
        [username, email, fullname, password].some((field) => 
        field?.trim() === "" )
    ){
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [
            { username },
            { email }
        ]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists");    
    }
    
    console.log("files ",req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path; //avatar name same as in multer middleware in the register user route
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && 
       req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;//coverImage name same as in multer middleware in the register user route
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }
    
    //console.log("avatarLocalPath: ", avatarLocalPath);

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    console.log("avatar: ", avatar);

    if(!avatar){
        throw new ApiError(500, "Error uploading avatar to cloudinary");
    } 
    //new User({}) we can also use for creation
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Error while registering user");
    }

    
    //return res.status(201).json({createdUser}) // I also can send response like this

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

})

const loginUser = asyncHandler( async (req, res) => {
    // req body->data
    // username or email based login
    // find the user
    // password check
    // generate access and refresh token and send both to user
    // send cookies

    const {username, email, password} = req.body

    // if(!username && !email)

    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password) 
    
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user password/credentials")
    }
    //console.log("user: ", user);
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true,
        //expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        
    }
    console.log("accessToken: ", accessToken);
    console.log("refreshToken: ", refreshToken);

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
                //response me access and refresh token bhejna ek good practice hai, may be user ko need ho
                // if user develop mobile app then cookie set nhi hoga wohan or may be use ko local storage me save karna ho
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this mean remove refresh token(field) from user
            }
            // $ set: {
            //     refreshToken: null
            // } // although this approach will also work but
            //  it will set refresh token to null in db which is not so good and
            //  if I  use undefined in place of null then it will not remove refresh token from db mean it not work...
        },
        {
            new: true // return updated user from db
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                req.user._id,
                "User logged out successfully"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access token refreshed Successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
    

})

const changeUserCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})  // yehan pe save method isliye use kiya bcoz humne password ko update kiya hai, toh pre save hook chalega aur password hash ho jayega

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        )
    )

})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullname, email} = req.body

    if(!fullname || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }

        },
        {new: true} // it means return updated new user info
    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler(async (req, res) => {

    // if i don't want to upload on cloudinary then i can directly save this avatarLocalPath to db
    const avatarLocalPath = req.files?.path
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500, "Error uploading avatar to cloudinary")
    }


    const currentUser = await User.findById(req.user?._id)
    const previousAvatarUrl = currentUser?.avatar;

    if(previousAvatarUrl){
        // delete previous avatar from cloudinary
        // const lastPartOfUrl = previousAvatarUrl.split('/').pop()
        // const publicId = lastPartOfUrl.split('.')[0]
        // await cloudinary.uploader.destroy(publicId, {
        //     invalidate: true,
        //     resource_type: 'auto',
        // });

        await deleteAssetFromCloudinary(previousAvatarUrl)
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")  
    )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    // if i don't want to upload on cloudinary then i can directly save this avatarLocalPath to db
    const coverImageLocalPath = req.files?.path
    
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(500, "Error uploading cover image to cloudinary")
    }


    const currentUser = await User.findById(req.user?._id)
    const previousCoverImageUrl = currentUser?.coverImage;

    if(previousCoverImageUrl){
        await deleteAssetFromCloudinary(previousCoverImageUrl)
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")  
    )

})


const getUserChannelProfile = asyncHandler(async(req, res) => {

    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"// $ sign denotes field name
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"] // in operator can check in array as well as in object here we are checking in object, if we have array then I can directly mention that array(here $subscribers for example)
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                email: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    console.log(channel)

    if(!channel?.length){
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User channel fetched Successfully"
        )
    )
}) 


const getWatchHistory = asyncHandler(async (req, res) => {


    //if i use like, req.user._id then i get only string of mongoDb _id 
    //whenever we do any operation with mongoDb _id then moongoose automatically convert it to actual mongoDb _id to compare

    // In case of aggregation pipeline, we need to convert it to mongoDb _id explicitly using mongoose.Types.ObjectId
    //because aggregation pipeline ka code directly mongoDb ko chala jata hai, yehan pe mongoose automatically kuch nhi karta hai behind  the scene



    const user = await User.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                //subpipeline
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]   
                        }
                    },

                    // check what happens if we use like this

                    // {
                    //    $ project: {
                    //         fullname: 1,
                    //         username: 1,
                    //         avatar: 1
                    //     }
                    // },

                    // owner field me data array of objects aata hai, toh humein usko array se bahar nikal ke direct object bna diya
                    {
                        $addFields: {
                            owner: {
                                //$ arrayElemAt: ["$owner", 0]
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0]?.watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}