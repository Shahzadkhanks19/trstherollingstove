import {z} from "zod"; import {strongPassword} from "@/validators/auth";
const id=z.string().regex(/^[a-f\d]{24}$/i),phone=z.string().regex(/^[6-9]\d{9}$/);
export const createStaffSchema=z.object({name:z.string().trim().min(2).max(80),email:z.email().transform(v=>v.toLowerCase()),phone:phone.optional(),password:strongPassword,roleId:id,employeeCode:z.string().trim().min(2).max(30).transform(v=>v.toUpperCase()),designation:z.string().trim().max(100).default("")});
export const updateUserSchema=z.object({name:z.string().trim().min(2).max(80).optional(),phone:phone.nullable().optional(),roleId:id.optional(),isActive:z.boolean().optional()}).refine(v=>Object.keys(v).length>0);
export const createRoleSchema=z.object({key:z.string().trim().min(2).max(50).regex(/^[a-z][a-z0-9_]*$/),name:z.string().trim().min(2).max(80),description:z.string().trim().max(300).default(""),permissionIds:z.array(id).min(1)});
export const updateRoleSchema=z.object({name:z.string().trim().min(2).max(80).optional(),description:z.string().trim().max(300).optional(),permissionIds:z.array(id).min(1).optional(),isActive:z.boolean().optional()}).refine(v=>Object.keys(v).length>0);
