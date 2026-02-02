import { NextRequest, NextResponse } from 'next/server';

function buildFallbacks(url: string): string[] {
    const fallbacks: string[] = [];

    if (url.includes('/ldraw/parts/') && !url.includes('/ldraw/unofficial/parts/')) {
        fallbacks.push(url.replace('/ldraw/parts/', '/ldraw/unofficial/parts/'));
    }
    if (url.includes('/ldraw/p/') && !url.includes('/ldraw/unofficial/p/')) {
        fallbacks.push(url.replace('/ldraw/p/', '/ldraw/unofficial/p/'));
    }

    return fallbacks;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    const urlsToTry = [url, ...buildFallbacks(url)];

    try {
        let lastStatus = 500;
        for (const target of urlsToTry) {
            const response = await fetch(target);
            lastStatus = response.status;
            if (!response.ok) {
                if (response.status === 404) continue;
                return NextResponse.json({ error: 'Failed to fetch external resource' }, { status: response.status });
            }

            const data = await response.text();
            return new NextResponse(data, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        }

        return NextResponse.json({ error: 'Failed to fetch external resource' }, { status: lastStatus });
    } catch (error) {
        console.error('Proxy fetch failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
