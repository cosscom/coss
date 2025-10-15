import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return new NextResponse(
      JSON.stringify({ message: 'Invalid token' }),
      { status: 401 }
    );
  }

  try {
    revalidateTag('cms-routes-tag');

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ revalidated: false, message: 'Error revalidating' }, { status: 500 });
  }
}
