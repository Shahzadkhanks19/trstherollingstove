import {Schema,model,models,type InferSchemaType,type Model} from "mongoose";
const schema=new Schema({key:{type:String,required:true,unique:true,index:true,lowercase:true,trim:true},name:{type:String,required:true,trim:true,maxlength:80},description:{type:String,default:"",maxlength:300,trim:true},permissionIds:[{type:Schema.Types.ObjectId,ref:"Permission",required:true}],isSystem:{type:Boolean,default:false,index:true},isActive:{type:Boolean,default:true,index:true}},{timestamps:true,versionKey:false});
export type RoleDocument=InferSchemaType<typeof schema>;
export const Role:Model<RoleDocument>=(models.Role as Model<RoleDocument>)||model<RoleDocument>("Role",schema);
