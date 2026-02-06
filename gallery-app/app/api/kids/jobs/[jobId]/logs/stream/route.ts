/**
 * SSE 프록시 - Next.js rewrites가 EventSource를 지원하지 않아서 별도 API route로 처리
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;
    const backendUrl = process.env.API_BASE || 'http://localhost:8080';
    const targetUrl = `${backendUrl}/api/kids/jobs/${jobId}/logs/stream`;

    console.log(`[SSE Proxy] Connecting to: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
        });

        if (!response.ok) {
            console.error(`[SSE Proxy] Backend returned ${response.status}`);
            return new Response(`Backend error: ${response.status}`, { status: response.status });
        }

        // SSE 스트림 그대로 전달
        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // nginx 버퍼링 방지
            },
        });
    } catch (error) {
        console.error('[SSE Proxy] Error:', error);
        return new Response('SSE proxy error', { status: 500 });
    }
}

// Edge Runtime 사용 시 스트리밍 성능 향상
export const runtime = 'edge';
