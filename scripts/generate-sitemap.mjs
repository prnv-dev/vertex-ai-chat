
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 IMPORT SEO PAGES DATA
const seoPagesPath = path.resolve(__dirname, "../src/pages/seo/seoPages.ts");
const seoPagesFile = fs.readFileSync(seoPagesPath, "utf-8");

// 🧠 Extract slugs using regex (safe & fast)
const slugRegex = /slug:\s*"([^"]+)"/g;
const slugs = [...seoPagesFile.matchAll(slugRegex)].map(m => m[1]);

const BASE_URL = "https://vertexai.in";
const today = new Date().toISOString().split("T")[0];

// 🧩 Generate sitemap XML
const urls = slugs.map(slug => `
  <url>
    <loc>${BASE_URL}/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`).join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  ${urls}

</urlset>
`;

// 📁 Write sitemap.xml
const outputPath = path.resolve(__dirname, "../public/sitemap.xml");
fs.writeFileSync(outputPath, sitemap.trim());

console.log(`✅ sitemap.xml generated with ${slugs.length} pages`);
