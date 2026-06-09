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

   if(incomingRefreshToken){

    throw new ApiError(400, "Refresh token is required")
   }

try {
    const decodedToken = jwt.verify(
        incomingRefreshToken ,
        process.env.REFRESH_TOKEN_SECRET)
    
    
    const user = await User.findById(decodedToken?._id)
    
    if(!user ){
        throw new ApiError(401, "Invalid refresh token")
    }
    
    if(user.refreshToken !== incomingRefreshToken){
        throw new ApiError(401, "Refresh token does not match")
    }
    
     const options ={
        httpOnly: true,
        secure: true
     }
    
     await generateAceessamdRefreshTokens = user.generateAccessToken(user._id)
    
     return res.status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newrefreshToken, options)
    
     .json(new ApiResponse
        (200,  
            { accessToken, refreshToken : newrefreshToken}, "Access token refreshed successfully"
        )
    )
    
} 

catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token")
}

})



const changeCurrentPassword = asyncHandler(async (req, res) => {

    const {oldpassword, newpassword} = req.body

    const user = await User.findById(req.user?._id)

   const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)
   
   if(!isPasswordCorrect){
    throw new ApiError(400, "Old password is incorrect")
   }

   user.password = newpassword
   await user.save({validateBeforeSave : false})

   return res.status(200).
   json(new ApiResponse(200, 
    {}, "Password updated successfully"))

})


const getCurrentUser=asyncHandler(async (req, res) => {
    return res.status(200).
    json(200, req.user, " current user fetched successfully")


})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName,email} = req.body

    if(!fullName && !email){
        throw new ApiError(400, "Full name or email is required to update")
    }

   const user= User.findByIdAndUpdate(

        req.user?._id,
        {
            $set : {
                fullName,
                email : email 
            }
        },
        {new : true}
    ).select("-password")
    
    return res.status(200).
    json(new ApiResponse(200, user, "User details updated successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarlocalPath = req.file?.path

    if(!avatarlocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarlocalPath)

    if(!avatar.url){
        throw new ApiError(500, "Something went wrong while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res.status(200).
    json(new ApiResponse(200, {}, "Avatar updated successfully"))
})


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const  coverImageLocalPath= req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(500, "Something went wrong while uploading the cover image")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res.status(200).
    json(new ApiResponse(200, {}, "Cover image updated successfully"))
})

export { registerUser,
     loginUser,
      logoutUser,
       refreshAcessToken
       , getCurrentUser, 
       changeCurrentPassword,
       updateAccountDetails,
       updateUserAvatar,
       updateUserCoverImage }
