
import {connectToDatabase} from "../lib/db/mongoose";
import {hashPassword} from "../lib/auth/password";
import {DEFAULT_ROLE_NAMES,DEFAULT_ROLE_PERMISSIONS,PERMISSION_DEFINITIONS} from "../config/rbac";
import {Permission} from "../models/Permission";
import {Role} from "../models/Role";
import {StaffProfile} from "../models/StaffProfile";
import {User} from "../models/User";
async function main(){
 await connectToDatabase();
 for(const [key,d] of Object.entries(PERMISSION_DEFINITIONS))await Permission.findOneAndUpdate({key},{$set:{key,...d,isSystem:true}},{ upsert: true, returnDocument: "after" });
 const permissions=await Permission.find().select("_id key").lean(),map=new Map(permissions.map(p=>[p.key,p._id]));
 for(const [key,keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)){const permissionIds=keys.map(k=>{const id=map.get(k);if(!id)throw new Error(`Missing permission ${k}`);return id});await Role.findOneAndUpdate({key},{$set:{key,name:DEFAULT_ROLE_NAMES[key],description:`Default TRS ${DEFAULT_ROLE_NAMES[key]} role.`,permissionIds,isSystem:true,isActive:true}},{ upsert: true, returnDocument: "after" });}
 const name=process.env.SUPER_ADMIN_NAME,email=process.env.SUPER_ADMIN_EMAIL?.toLowerCase(),phone=process.env.SUPER_ADMIN_PHONE,password=process.env.SUPER_ADMIN_PASSWORD;
 if(!name||!email||!password)throw new Error("Super admin environment variables are required.");
 const role=await Role.findOne({key:"super_admin"});if(!role)throw new Error("Super admin role missing.");
 const user=await User.findOneAndUpdate({email},{$set:{name,email,phone,passwordHash:await hashPassword(password),roleId:role._id,isActive:true,emailVerifiedAt:new Date(),tokenVersion:0,failedLoginAttempts:0,lockedUntil:null}},{ upsert: true, returnDocument: "after" });
 await StaffProfile.findOneAndUpdate({userId:user._id},{$setOnInsert:{userId:user._id,employeeCode:"TRS-SA-001",designation:"Super Administrator"}},{upsert:true, returnDocument: "after"});
 console.log(`Authentication seed complete. Super Admin: ${user.email}`);process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
