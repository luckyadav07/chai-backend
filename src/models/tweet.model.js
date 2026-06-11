import moongose,{Schema} from "moongose"

const tweetSchema=new Schema({

    content:{
        type:String,    
        required:true

    },
    Owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true 
    }

},{
    timestamps:true
})

export const Tweet=moongose.model("Tweet",tweetSchema)