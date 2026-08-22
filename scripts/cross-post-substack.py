#!/usr/bin/env python3
"""
Cross-post a single blog post to Substack as a draft.

Usage:
    python scripts/cross-post-substack.py claude-code-tips-and-tricks
    python scripts/cross-post-substack.py claude-code-tips-and-tricks --publish

Requires:
    pip install python-substack python-frontmatter

Environment variables:
    SUBSTACK_COOKIE  - Substack session cookie string (required)
    SUBSTACK_URL     - Publication URL (default: https://johncosta514750.substack.com)
"""

import argparse
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

import frontmatter
import requests
from substack.api import Api
from substack.exceptions import SubstackAPIException, SubstackRequestException
from substack.post import Post

# Errors that mean "could not reliably query Substack" (vs. code bugs, which
# should crash loudly rather than be misreported as connectivity).
FETCH_ERRORS = (SubstackAPIException, SubstackRequestException, requests.RequestException)


def wait_for_url(url, max_wait_seconds=180, poll_interval=5):
    """Poll a URL with HEAD until it returns 200 or times out.

    GitHub Pages takes 30-90s to rebuild after a push. Substack's get_image
    fetches the cover from jcosta.tech, so calling it immediately after the
    push silently fails with HTTP 400 ("Failed to fetch image"). Polling
    avoids that race without needing a fixed sleep.
    """
    start = time.time()
    while time.time() - start < max_wait_seconds:
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(poll_interval)
    return False


POSTS_DIR = Path(__file__).resolve().parent.parent / "posts"
BLOG_BASE_URL = "https://jcosta.tech/writing"
DEFAULT_SUBSTACK_URL = "https://johncosta514750.substack.com"


def get_api():
    cookie = os.environ.get("SUBSTACK_COOKIE")
    if not cookie:
        print("Error: SUBSTACK_COOKIE environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    pub_url = os.environ.get("SUBSTACK_URL", DEFAULT_SUBSTACK_URL)

    api = Api(
        cookies_string=cookie,
        publication_url=pub_url,
    )
    return api


def load_post(slug):
    post_path = POSTS_DIR / f"{slug}.md"
    if not post_path.exists():
        print(f"Error: Post not found at {post_path}", file=sys.stderr)
        sys.exit(1)

    post = frontmatter.load(post_path)
    return post


def strip_frontmatter_content(post):
    """Return the markdown body (everything after the frontmatter)."""
    return post.content


def build_substack_post(api, slug, fm_post):
    """Build a Substack Post object from a parsed frontmatter post."""
    title = fm_post.get("title", slug)
    subtitle = fm_post.get("subtitle", "")
    tags = fm_post.get("tags", [])

    user_id = api.get_user_id()

    post = Post(
        title=title,
        subtitle=subtitle,
        user_id=user_id,
        audience="everyone",
    )

    # Convert markdown to ProseMirror JSON using our own converter
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from md_to_prosemirror import markdown_to_prosemirror

    body = strip_frontmatter_content(fm_post)
    doc = markdown_to_prosemirror(body)

    # Set the document body directly, bypassing from_markdown
    post.draft_body = doc

    # Append "originally published" note at the bottom
    original_url = f"{BLOG_BASE_URL}/{slug}/"
    doc["content"].append({"type": "horizontal_rule"})
    doc["content"].append({
        "type": "paragraph",
        "content": [
            {"type": "text", "text": "Originally published at ", "marks": [{"type": "em"}]},
            {
                "type": "text",
                "text": original_url,
                "marks": [
                    {"type": "em"},
                    {"type": "link", "attrs": {"href": original_url}},
                ],
            },
        ],
    })

    return post, tags


def normalize_title(title):
    """Lowercase and collapse all whitespace runs for title comparison."""
    return " ".join(str(title).split()).lower()


def find_existing_post(api, title):
    """Find an existing Substack item with this title.

    Returns ("post", item) for a published post, ("draft", item) for an
    unpublished draft, or None. Both endpoints return dicts with a "posts"
    list and are paginated (published: offset/total; drafts:
    hasMore/nextCursor).

    Fail-closed: if any lookup errors we cannot rule out a duplicate, and a
    retry that double-publishes is worse than a manual check, so exit 1.
    --force bypasses at the call site.
    """
    needle = normalize_title(title)
    try:
        offset = 0
        while True:
            page = api.get_published_posts(offset=offset, limit=25) or {}
            total = page.get("total")
            if total is None:
                # A missing total would otherwise end pagination after one
                # page and silently report "no duplicate"; fail closed.
                raise SubstackRequestException(
                    "published-posts response has no 'total' field"
                )
            posts = page.get("posts") or []
            for post in posts:
                if normalize_title(post.get("title") or "") == needle:
                    return ("post", post)
            offset += len(posts)
            if not posts or offset >= total:
                break

        cursor = None
        for _ in range(40):  # hard cap, far above this publication's size
            page = api.get_drafts(offset=cursor, limit=25) or {}
            drafts = page.get("posts") or []
            for draft in drafts:
                t = draft.get("draft_title") or draft.get("title") or ""
                if normalize_title(t) == needle:
                    # The /drafts endpoint also returns published posts.
                    if draft.get("is_published"):
                        return ("post", draft)
                    return ("draft", draft)
            if not page.get("hasMore"):
                break
            cursor = page.get("nextCursor")
    except FETCH_ERRORS as e:
        print(f"Error: duplicate check failed to query Substack: {e}", file=sys.stderr)
        print(
            "Refusing to post; a blind retry could create a public duplicate. "
            "Re-run with --force to override.",
            file=sys.stderr,
        )
        sys.exit(1)

    return None


def create_draft(api, slug, fm_post):
    """Create a draft on Substack and return the draft info."""
    post, tags = build_substack_post(api, slug, fm_post)

    # Create the draft
    draft = api.post_draft(post.get_draft())
    draft_id = draft.get("id")

    # Upload and set cover image
    cover = fm_post.get("cover", "")
    if cover:
        cover_url = f"https://jcosta.tech{cover}" if cover.startswith("/") else cover
        print(f"  Waiting for cover URL to be live: {cover_url}", file=sys.stderr)
        if not wait_for_url(cover_url):
            print(
                f"  Warning: cover URL did not return 200 within timeout; "
                f"skipping cover. Patch with put_draft(post_id, cover_image=...) later.",
                file=sys.stderr,
            )
        else:
            try:
                uploaded = api.get_image(cover_url)
                substack_image_url = uploaded.get("url", "")
                if substack_image_url:
                    api.put_draft(draft_id, cover_image=substack_image_url)
            except Exception as e:
                print(f"  Warning: Could not set cover image: {e}", file=sys.stderr)

    # Update draft metadata (SEO fields)
    seo_title = fm_post.get("seoTitle", "")
    seo_description = fm_post.get("seoDescription", "")
    update_kwargs = {}
    if seo_title:
        update_kwargs["search_engine_title"] = seo_title
    if seo_description:
        update_kwargs["search_engine_description"] = seo_description

    if update_kwargs:
        api.put_draft(draft_id, **update_kwargs)

    # Add tags
    if tags:
        try:
            api.add_tags_to_post(draft_id, tags)
        except Exception as e:
            print(f"  Warning: Could not add tags: {e}", file=sys.stderr)

    return draft


def main():
    parser = argparse.ArgumentParser(
        description="Cross-post a blog post to Substack as a draft."
    )
    parser.add_argument(
        "slug",
        help="Post slug (filename without .md extension, e.g. claude-code-tips-and-tricks)",
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Publish the post immediately instead of leaving as draft",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Just show what would be posted without creating a draft",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip the duplicate check and post even if a draft/post with this title exists",
    )
    args = parser.parse_args()

    fm_post = load_post(args.slug)

    title = fm_post.get("title", args.slug)
    subtitle = fm_post.get("subtitle", "")
    date = fm_post.get("date", "")
    tags = fm_post.get("tags", [])

    print(f"Post: {title}")
    print(f"  Subtitle: {subtitle}")
    print(f"  Date: {date}")
    print(f"  Tags: {', '.join(tags)}")
    print(f"  Original URL: {BLOG_BASE_URL}/{args.slug}/")

    if args.dry_run:
        print("\n[dry run] Would create draft on Substack.")
        return

    # Authenticate (requires SUBSTACK_COOKIE env var)
    api = get_api()
    pub_url = os.environ.get("SUBSTACK_URL", DEFAULT_SUBSTACK_URL)

    existing = None if args.force else find_existing_post(api, title)
    if existing:
        kind, item = existing
        if kind == "post":
            print(f'\nSkipping: "{title}" is already published on Substack.')
            return
        # An unpublished draft already exists (e.g. a previous run died after
        # drafting). Complete the publish instead of creating a second copy.
        draft_id = item.get("id")
        if args.publish:
            if not draft_id:
                print("Error: existing draft has no id; publish it manually in Substack.", file=sys.stderr)
                sys.exit(1)
            api.prepublish_draft(draft_id)
            api.publish_draft(draft_id)
            print(f"\nPublished existing draft. View at: {pub_url}/p/{args.slug}")
            print("  Note: if the earlier run died mid-draft, cover/SEO/tags may be missing; verify in Substack.")
            return
        print(f'\nSkipping: a Substack draft titled "{title}" already exists.')
        print(f"  Edit at: {pub_url}/publish/post/{draft_id}")
        return

    draft = create_draft(api, args.slug, fm_post)
    draft_id = draft.get("id")
    if not draft_id:
        print("Error: Substack did not return a draft id; check the draft list manually.", file=sys.stderr)
        sys.exit(1)

    if args.publish:
        api.prepublish_draft(draft_id)
        api.publish_draft(draft_id)
        print(f"\nPublished! View at: {pub_url}/p/{args.slug}")
    else:
        print(f"\nDraft created! Edit at: {pub_url}/publish/post/{draft_id}")
        print("Review the draft in Substack and click Publish when ready.")


if __name__ == "__main__":
    main()
