import {Schema,model,models,type InferSchemaType,type Model} from "mongoose";
const schema=new Schema({actorUserId:{type:Schema.Types.ObjectId,ref:"User",default:null,index:true},action:{type:String,required:true,index:true,trim:true},entityType:{type:String,required:true,index:true,trim:true},entityId:{type:String,default:"",index:true,trim:true},description:{type:String,required:true,maxlength:500,trim:true},metadata:{type:Schema.Types.Mixed,default:{}},ipAddress:{type:String,default:"",maxlength:100,trim:true},userAgent:{type:String,default:"",maxlength:500,trim:true}},{timestamps:true,versionKey:false});
schema.index({createdAt:-1});
export type AuditLogDocument=InferSchemaType<typeof schema>;
export const AuditLog:Model<AuditLogDocument>=(models.AuditLog as Model<AuditLogDocument>)||model<AuditLogDocument>("AuditLog",schema);
