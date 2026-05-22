import fs from "fs";
import path from "path";

export async function getManualContent(slug: string): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "src",
    "config",
    "manual",
    "content",
    `${slug}.mdx`
  );

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch {
    return `# Page Not Found\n\nThe documentation for "${slug}" is not available yet.`;
  }
}
