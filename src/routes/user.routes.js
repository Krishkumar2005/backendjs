import { Router } from "express";
import { changeUserCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser,
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage} from "../controllers/user.controller.js";

import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar", //first file name is avatar
            maxCount: 1
        },
        {
            name: "coverImage",//second file name is coverImage
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes: kuch aise routes jo sirf logged in user access kar sakta hai || user logged in hona chahiye
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-access-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeUserCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile) //yehan username url me se le rhe hai
router.route("/watch-history").get(verifyJWT, getWatchHistory)
export default router;