import {Schema,model,models,type InferSchemaType,type Model} from "mongoose";
const schema=new Schema({key:{type:String,required:true,unique:true,index:true,lowercase:true,trim:true},name:{type:String,required:true,trim:true},module:{type:String,required:true,index:true,trim:true},description:{type:String,required:true,trim:true},isSystem:{type:Boolean,default:true}},{timestamps:true,versionKey:false});
export type PermissionDocument=InferSchemaType<typeof schema>;
export const Permission:Model<PermissionDocument>=(models.Permission as Model<PermissionDocument>)||model<PermissionDocument>("Permission",schema);
