import { parseAndProcessSteps } from "../lib/ldrUtils";

self.onmessage = async (e: MessageEvent) => {
    const { text, type } = e.data;

    if (type === "PROCESS_LDR") {
        try {
            const result = parseAndProcessSteps(text);

            // Transferrable geometry data isn't easily extracted from Box3/Vector3 
            // without custom serialization, but these objects are small enough to clone.
            // However, stepTexts is an array of large strings.

            self.postMessage({
                type: "SUCCESS",
                payload: {
                    stepTexts: result.stepTexts,
                    bounds: result.bounds ? {
                        min: result.bounds.min,
                        max: result.bounds.max
                    } : null
                }
            });
        } catch (error) {
            self.postMessage({
                type: "ERROR",
                payload: error instanceof Error ? error.message : String(error)
            });
        }
    }
};
