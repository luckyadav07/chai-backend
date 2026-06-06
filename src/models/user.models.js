import moongose,{schema} from "moongose"
import { use } from "react";

const userSchema=new schema({

    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true

    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avtar:{
        type:String,
        required:true,
       
    },
    coverimage:{
        type:String,
        
    },
    watchhistory:[
        {
            type:schema.Types.ObjectId,
            ref:"Video"

        }
    ],
    password:{
        type:string,
        required:[true,'Password is Required']

    },
    refreshtoken:{
        type:string
    }


},
{
    timestamps:true
})

userSchema.pre("save",async function (next) {
    if(!this.isModified("password"))return next(); 
    this.password=bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect=async function(password){
   return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateaccesstoken=function(){
    return jwt.sign({
        _id: this._id,
        email : this.email,
        username:this.username,
        fullname:this.fullname
    },

    process.env.ACCESS_TOKEN_SECRET,
    {
        expiredIn: process.env.ACCESS_TOKEN_EXPIRY
    }

)

}

userSchema.methods.generaterefreshtoken=function(){
    return jwt.sign({
        _id: this._id,
        
    },

    process.env.REFRESH_TOKEN_SECRET,
    {
        expiredIn: process.env.REFRESH_TOKEN_EXPIRY
    }

)
}


export const User=moongose.model("User",userSchema)