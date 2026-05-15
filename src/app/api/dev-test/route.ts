export function GET() {
  const enabled =
    process.env.DEV_TEST === 'true' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.APP_PROFILE !== 'prod';

  return Response.json({ enabled });
}
