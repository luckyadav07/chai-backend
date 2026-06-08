import moongose,{Schema} from "moongose"
import moongoseAgreegatePaginate from "mongoose-aggregate-paginate-v2"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const videoSchema= new Schema({
    videofile:{
        type:String,
        equired:true
    },

    thumbnail:{
        type:String,
        required:true
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
        type:Number,
        default:0,
    },
    ispublished:{
        type:Boolean,
        default:true,
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:User
    }
},

{
    timestamp:true
}
)


videoSchema.plugin(moongoseAgreegatePaginate)

export const Video=moongose.model("Video",videoSchema)