/**
 * Shared renderer for the writing-list items (<a class="writing-item">),
 * used by embed-data.mjs (index.html POSTS + writing.html ALL_POSTS) and
 * build-posts.mjs (tag pages). The two copies it replaced were identical.
 */
import { escapeHtml } from './html.mjs';
import { formatDate } from './format.mjs';
import { webpThumb } from './covers.mjs';

export function renderWritingListHTML(posts, coverMeta) {
  return posts
    .map((p) => {
      const thumbVariant = p.coverImage ? webpThumb(p.coverImage, coverMeta) : null;
      const thumb = p.coverImage
        ? (thumbVariant
            ? `          <img src="${escapeHtml(thumbVariant.src)}" alt="" class="writing-thumb" loading="lazy" width="${thumbVariant.width}" height="${thumbVariant.height}">`
            : `          <img src="${escapeHtml(p.coverImage)}" alt="" class="writing-thumb" loading="lazy">`)
        : `          <div class="writing-thumb writing-thumb-empty"></div>`;
      return [
        `        <a href="${escapeHtml(p.url)}" class="writing-item">`,
        `          <span class="writing-date">${formatDate(p.date)}</span>`,
        thumb,
        `          <div>`,
        `            <h3>${escapeHtml(p.title)}</h3>`,
        `            <p class="subtitle">${escapeHtml(p.subtitle)}</p>`,
        `          </div>`,
        `          <span class="writing-time">${escapeHtml(p.readTime)}</span>`,
        `        </a>`,
      ].join('\n');
    })
    .join('\n');
}
