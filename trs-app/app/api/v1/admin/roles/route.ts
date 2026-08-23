import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Permission } from "@/models/Permission";
import { Role } from "@/models/Role";
import { writeAuditLog } from "@/services/audit.service";
import { createRoleSchema } from "@/validators/admin";
export async function GET(){try{await requirePermission("roles.read");await connectToDatabase();return successResponse(await Role.find().populate("permissionIds","key name module").sort({isSystem:-1,name:1}).lean(),"Roles loaded.")}catch(e){return handleApiError(e)}}
export async function POST(r:Request){try{const actor=await requirePermission("roles.create");const i=await validateRequestBody(r,createRoleSchema);await connectToDatabase();if(await Permission.countDocuments({_id:{$in:i.permissionIds}})!==i.permissionIds.length)throw new AppError("Invalid permissions.",400);if(await Role.exists({key:i.key}))throw new AppError("Role key is already in use.",409);const role=await Role.create({...i,isSystem:false});await writeAuditLog({actorUserId:actor.id,action:"role.created",entityType:"role",entityId:role.id,description:`Role ${role.name} created.`,metadata:{key:role.key}});return successResponse(role,"Role created.",201)}catch(e){return handleApiError(e)}}
