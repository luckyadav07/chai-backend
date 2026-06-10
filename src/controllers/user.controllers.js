import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body
    console.log("email:", email)
    console.log("req.files:", req.files)

    if ([fullName, email, password, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    let avatarLocalPath
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }

    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({ $or: [{ username }, { email }] })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = { httpOnly: true, secure: true }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true })

    const options = { httpOnly: true, secure: true }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})


const refreshAcessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    // ✅ Fix 1: was missing `!`
    if (!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token is required")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token does not match")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        // ✅ Fix 2: proper token generation
        const accessToken = user.generateAccessToken()
        const newRefreshToken = user.generateRefreshToken()

        user.refreshToken = newRefreshToken
        await user.save({ validateBeforeSave: false })

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access token refreshed successfully"
            ))

    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldpassword, newpassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect")
    }

    user.password = newpassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).
        json(new ApiResponse(200, {}, "Password updated successfully"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    // ✅ Fix 3: wrap in new ApiResponse
    return res.status(200).
        json(new ApiResponse(200, req.user, "current user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName && !email) {
        throw new ApiError(400, "Full name or email is required to update")
    }

    // ✅ Fix 4: added await
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).
        json(new ApiResponse(200, user, "User details updated successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarlocalPath = req.file?.path

    if (!avatarlocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarlocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    // ✅ Fix 5: return user instead of {}
    return res.status(200).
        json(new ApiResponse(200, user, "Avatar updated successfully"))
})


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, "Something went wrong while uploading the cover image")
    }

    // ✅ Fix 6: store result in variable, return it
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).
        json(new ApiResponse(200, user, "Cover image updated successfully"))
})




const getUserchannelprofile = asyncHandler(async (req,res) => {
    const {username} =req.params

    if(!username){
        throw new ApiError(400,"Username is required")
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"Subscription",
                localField: "_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"Subscription",
                localField: "_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                channelSubscribedtoCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed: {
                    $cond:{
                        if: {$in:[req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false  
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                SubsscriberCount:1,
                channelSubscribedtoCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1    
            }
        }

    ])

    if(!channel || channel.length === 0){
        throw new ApiError(404,"Channel not found")
    }

    return res.status(200).json(new ApiResponse(200,
         channel[0], 
         "Channel profile fetched successfully"))
})



const getwatchhistory = asyncHandler(async (req,res) => {
    const user=await User.aggregate([

        {
            $match:{
            _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"Video",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    $lookup:{
                        from:"User",
                        localField:"Owner",
                        foreignField:"_id",
                        as:"Owner",
                        pipeline:[
                            {
                                project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1 
                                }
                            },
                            {
                                $addField:{
                                    owner:{
                                        $first:"$Owner"
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        }
    ])

    return res.status(200).
    json(new ApiResponse(200, user[0]?.watchHistory || [], "User watch history fetched successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAcessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getwatchhistory,
    getUserchannelprofile
}