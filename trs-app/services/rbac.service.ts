import { connectToDatabase } from "@/lib/db/mongoose";
import { Permission } from "@/models/Permission";
import { Role } from "@/models/Role";

export async function getRoleWithPermissions(id: string) {
  await connectToDatabase();

  return Role.findById(id)
    .populate<{ permissionIds: Array<{ key: string }> }>({
      path: "permissionIds",
      select: "key",
      model: Permission,
    })
    .lean();
}
