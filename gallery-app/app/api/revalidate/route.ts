import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Secret token for security (set in environment variable)
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'your-secret-token';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        // Verify secret token
        if (token !== REVALIDATE_SECRET) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { type, id, slug } = body;

        // type: 'create' | 'update' | 'delete'
        // id: gallery item id (optional)
        // slug: full slug for specific page (optional)

        // Always revalidate home page (gallery list)
        revalidatePath('/');

        // Always revalidate sitemap
        revalidatePath('/sitemap.xml');

        // If specific item, revalidate that page too
        if (slug) {
            revalidatePath(`/${slug}`);
        }

        console.log(`[Revalidate] type=${type}, id=${id}, slug=${slug}`);

        return NextResponse.json({
            success: true,
            revalidated: true,
            timestamp: Date.now(),
            message: `Revalidated: home, sitemap${slug ? `, /${slug}` : ''}`,
        });

    } catch (error) {
        console.error('[Revalidate Error]', error);
        return NextResponse.json(
            { error: 'Failed to revalidate', details: String(error) },
            { status: 500 }
        );
    }
}

// GET for health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: '/api/revalidate',
        method: 'POST',
        headers: { authorization: 'Bearer <REVALIDATE_SECRET>' },
        body: { type: 'create|update|delete', id: 'optional', slug: 'optional' },
    });
}
