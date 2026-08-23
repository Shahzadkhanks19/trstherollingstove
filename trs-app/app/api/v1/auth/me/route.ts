import {requireAuthenticatedUser} from "@/lib/auth/session";import {handleApiError} from "@/lib/errors/handleApiError";import {successResponse} from "@/lib/http/apiResponse";
export async function GET(){try{return successResponse(await requireAuthenticatedUser(),"Current user loaded.")}catch(e){return handleApiError(e)}}
