export async function GET() {
  return Response.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
}
