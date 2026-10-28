import { NextResponse } from "next/server";
async function handle(request: Request) {
  if (process.env.UNIVA_LOCAL_MODE === "true")
    return NextResponse.json(
      { error: "Account login is disabled in local mode" },
      { status: 403 }
    );
  const [{ auth }, { toNextJsHandler }] = await Promise.all([
    import("@opencut/auth/server"),
    import("better-auth/next-js"),
  ]);
  const handlers = toNextJsHandler(auth);
  return request.method === "GET"
    ? handlers.GET(request)
    : handlers.POST(request);
}
export const GET = handle;
export const POST = handle;
