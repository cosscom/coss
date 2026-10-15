import { DEVICE_TOKEN_HEADER } from "@coss/auth/risk";
import { CreateRiskAssessmentRequest } from "@coss/risk/schemas";

/** Drop invalid optional fields independently so client headers cannot remove the trusted IP. */
export function signUpRiskParams(email: string, ip: string | null, headers?: Headers | null) {
  const deviceToken = headers?.get(DEVICE_TOKEN_HEADER) || undefined;
  return CreateRiskAssessmentRequest.parse({
    event: "signup",
    user: { email: email.slice(0, 320) },
    ip: CreateRiskAssessmentRequest.shape.ip.safeParse(ip ?? undefined).data,
    user_agent: headers?.get("user-agent")?.slice(0, 1024) || undefined,
    device: CreateRiskAssessmentRequest.shape.device.safeParse(
      deviceToken ? { token: deviceToken } : undefined,
    ).data,
  });
}
