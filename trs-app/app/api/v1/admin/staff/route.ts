import { hashPassword } from "@/lib/auth/password";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Role } from "@/models/Role";
import { StaffProfile } from "@/models/StaffProfile";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import { assertStaffRole } from "@/services/userManagement.service";
import { getPagination } from "@/utils/pagination";
import { staffCreateSchema } from "@/validators/userManagement";

export async function GET(request: Request) {
  try {
    await requirePermission("users.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const { page, limit, skip } = getPagination(url.searchParams);

    const customerRole = await Role.findOne({
      key: "customer",
    })
      .select("_id")
      .lean();

    const filter: Record<string, unknown> = {
      roleId: {
        $ne: customerRole?._id,
      },
    };

    const search = url.searchParams.get("search")?.trim();
    const roleId = url.searchParams.get("roleId");
    const isActive = url.searchParams.get("isActive");
    const department = url.searchParams.get("department");
    const employmentType = url.searchParams.get("employmentType");

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (roleId) {
      filter.roleId = roleId;
    }

    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    if (department || employmentType) {
      const profileFilter: Record<string, unknown> = {};

      if (department) {
        profileFilter.department = department;
      }

      if (employmentType) {
        profileFilter.employmentType = employmentType;
      }

      const matchingProfiles = await StaffProfile.find(profileFilter)
        .select("userId")
        .lean();

      filter._id = {
        $in: matchingProfiles.map((profile) => profile.userId),
      };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate("roleId", "key name")
        .select(
          "name email phone avatarUrl roleId isActive emailVerifiedAt lastLoginAt deactivatedAt createdAt",
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const profiles = await StaffProfile.find({
      userId: {
        $in: users.map((user) => user._id),
      },
    }).lean();

    const profileByUserId = new Map(
      profiles.map((profile) => [String(profile.userId), profile]),
    );

    return successResponse(
      users.map((user) => ({
        user,
        profile: profileByUserId.get(String(user._id)) ?? null,
      })),
      "Staff loaded.",
      200,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("users.create");
    const input = await validateRequestBody(request, staffCreateSchema);

    await connectToDatabase();

    const role = await assertStaffRole(input.roleId);

    const duplicateConditions: Array<Record<string, string>> = [
      {
        email: input.email,
      },
    ];

    if (input.phone) {
      duplicateConditions.push({
        phone: input.phone,
      });
    }

    const existingUser = await User.exists({
      $or: duplicateConditions,
    });

    if (existingUser) {
      throw new AppError(
        "An account with this email or phone already exists.",
        409,
      );
    }

    const existingEmployeeCode = await StaffProfile.exists({
      employeeCode: input.employeeCode,
    });

    if (existingEmployeeCode) {
      throw new AppError("Employee code is already in use.", 409);
    }

    const user = await User.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      passwordHash: await hashPassword(input.password),
      roleId: role._id,
      emailVerifiedAt: new Date(),
      createdBy: actor.id,
    });

    try {
      await StaffProfile.create({
        userId: user._id,
        employeeCode: input.employeeCode,
        designation: input.designation,
        department: input.department,
        employmentType: input.employmentType,
        joiningDate: input.joiningDate
          ? new Date(input.joiningDate)
          : new Date(),
        shiftName: input.shiftName,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        address: input.address,
        notes: input.notes,
      });
    } catch (error) {
      await User.deleteOne({
        _id: user._id,
      });

      throw error;
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "staff.created",
      entityType: "user",
      entityId: user.id,
      description: `Staff ${user.email} created.`,
      metadata: {
        roleId: String(role._id),
        roleKey: role.key,
        employeeCode: input.employeeCode,
      },
    });

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        role: {
          id: String(role._id),
          key: role.key,
          name: role.name,
        },
        employeeCode: input.employeeCode,
      },
      "Staff created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}