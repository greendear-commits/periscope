import Replicate from "replicate";

if (!process.env.REPLICATE_API_TOKEN) throw new Error("Missing REPLICATE_API_TOKEN");

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const FLUX_MODEL = "black-forest-labs/flux-1.1-pro";

export async function generateImage(prompt: string): Promise<Buffer> {
  const output = await replicate.run(FLUX_MODEL, {
    input: { prompt, output_format: "webp", output_quality: 90 },
  });

  // Replicate returns a URL string for Flux
  const url = Array.isArray(output) ? output[0] : (output as unknown as string);
  const res = await fetch(url as string);
  if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}
