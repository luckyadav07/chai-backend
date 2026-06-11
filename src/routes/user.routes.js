import { Router } from "express"
import { registerUser, loginUser, logoutUser, refreshAcessToken, updateUserAvatar } from "../controllers/user.controllers.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { get } from "mongoose"

const router = Router()

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAcessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route9("/current-user").get(verifyJWT, (req, res) => res.json(req.user))
router.route("/update-account").put(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserchannelprofile)
router.route("/watch-history").get(verifyJWT,getwatchhistory)

export default router
