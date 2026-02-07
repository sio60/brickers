/**
 * SSE 프록시 - Next.js rewrites가 EventSource를 지원하지 않아서 별도 API route로 처리
 * ReadableStream을 명시적으로 chunk 단위로 파이프하여 실시간 스트리밍 보장
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
        const upstream = await fetch(targetUrl, {
            headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
        });

        if (!upstream.ok || !upstream.body) {
            console.error(`[SSE Proxy] Backend returned ${upstream.status}`);
            return new Response(`Backend error: ${upstream.status}`, { status: upstream.status });
        }

        const reader = upstream.body.getReader();

        const stream = new ReadableStream({
            async pull(controller) {
                try {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        return;
                    }
                    controller.enqueue(value);
                } catch (err) {
                    console.error('[SSE Proxy] Stream read error:', err);
                    controller.close();
                    reader.cancel().catch(() => {});
                }
            },
            cancel() {
                reader.cancel().catch(() => {});
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });
    } catch (error) {
        console.error('[SSE Proxy] Error:', error);
        return new Response('SSE proxy error', { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
