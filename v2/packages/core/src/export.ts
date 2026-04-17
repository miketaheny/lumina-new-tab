import { storage } from './storage';

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function buildQuickLinksMarkdown(): Promise<string> {
  const data = await storage.getQuickLinks();
  let md = '# Quick Links\n\n';
  for (const section of data.sections) {
    md += `## ${section.label}\n\n`;
    const sectionLinks = data.links.filter(l => l.section === section.id);
    for (const link of sectionLinks) {
      md += `- [${link.label}](${link.url})\n`;
    }
    md += '\n';
  }
  return md.trim();
}

export async function buildKindlingMarkdown(): Promise<string> {
  const data = await storage.getKindling();
  let md = '# Kindling Reading List\n\n';
  for (const item of data.items) {
    const status = item.readAt ? '~~' : '';
    const tags = item.tags.length ? ` (${item.tags.join(', ')})` : '';
    md += `- ${status}[${item.title}](${item.url})${status}${tags}\n`;
  }
  return md.trim();
}

export async function exportAllAsJson(): Promise<void> {
  const [settings, quickLinks, notes, kindling, bookmarks, wallpapers] = await Promise.all([
    storage.getSettings(),
    storage.getQuickLinks(),
    storage.getNotes(),
    storage.getKindling(),
    storage.getBookmarks(),
    storage.getWallpapers(),
  ]);
  const data = { settings, quickLinks, notes, kindling, bookmarks, wallpapers, exportedAt: new Date().toISOString() };
  downloadTextFile('lumina-export.json', JSON.stringify(data, null, 2), 'application/json');
}
