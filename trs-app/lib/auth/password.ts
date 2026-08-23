import bcrypt from "bcryptjs";
export const hashPassword=(value:string)=>bcrypt.hash(value,12);
export const verifyPassword=(value:string,hash:string)=>bcrypt.compare(value,hash);
