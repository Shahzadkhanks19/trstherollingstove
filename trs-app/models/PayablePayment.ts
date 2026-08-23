import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const PayablePaymentSchema = new Schema({
  paymentNumber:{type:String,required:true,trim:true,unique:true,index:true},
  billId:{type:Schema.Types.ObjectId,ref:"PayableBill",required:true,index:true},
  vendorId:{type:Schema.Types.ObjectId,ref:"Vendor",default:null,index:true},
  amount:{type:Number,required:true,min:0.01},paymentDate:{type:Date,required:true,default:Date.now,index:true},
  paymentMethod:{type:String,enum:["cash","card","upi","bank_transfer","wallet","cheque","other"],required:true,index:true},
  transactionReference:{type:String,trim:true,maxlength:180,default:""},notes:{type:String,trim:true,maxlength:1000,default:""},
  recordedBy:{type:Schema.Types.ObjectId,ref:"User",required:true},
},{timestamps:true,versionKey:false});
PayablePaymentSchema.index({billId:1,paymentDate:-1});
export type PayablePaymentDocument=InferSchemaType<typeof PayablePaymentSchema>;
export const PayablePayment:Model<PayablePaymentDocument>=(models.PayablePayment as Model<PayablePaymentDocument>)||model<PayablePaymentDocument>("PayablePayment",PayablePaymentSchema);
