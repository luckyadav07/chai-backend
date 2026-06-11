import moongose,{Schema} from "moongose"
import moongoseAgreegatePaginate from "mongoose-aggregate-paginate-v2"


 const commentSchema=new Schema({

    
        content:{

            type:String,
            required:true,

        },
        video :{
            type:Schema.Types.ObjectId,
            ref:"Video",
            required:true
        },
        Owner:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true
        },

 },{
    timestamps:true
})

commentSchema.plugin(moongoseAgreegatePaginate)

export const Comment=moongose.model("Comment",commentSchema)