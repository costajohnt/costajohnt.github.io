#!/usr/bin/env python3
"""
Cross-post all unpublished blog posts to Substack.

Reads all posts from posts/, checks which ones already exist as drafts/published
on Substack, and creates drafts for the rest. Sorted by date ascending (oldest first)
for drip publishing.

Usage:
    python scripts/cross-post-backlog.py --dry-run      # list what would be posted
    python scripts/cross-post-backlog.py                 # create drafts for all missing
    python scripts/cross-post-backlog.py --publish       # publish instead of draft

Requires:
    pip install python-substack python-frontmatter

Environment variables:
    SUBSTACK_COOKIE  - Substack session cookie string (required)
    SUBSTACK_URL     - Publication URL (default: https://johncosta514750.substack.com)
"""

import argparse
import os
import sys
import time
from pathlib import Path

import frontmatter
from substack.api import Api
from substack.post import Post


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


def load_all_posts():
    """Load all posts from the posts directory, sorted by date ascending."""
    posts = []
    for post_path in POSTS_DIR.glob("*.md"):
        slug = post_path.stem
        fm_post = frontmatter.load(post_path)
        date = fm_post.get("date", "")
        posts.append({
            "slug": slug,
            "path": post_path,
            "fm": fm_post,
            "title": fm_post.get("title", slug),
            "subtitle": fm_post.get("subtitle", ""),
            "date": str(date),
            "tags": fm_post.get("tags", []),
        })

    # Sort by date ascending (oldest first for drip publishing)
    posts.sort(key=lambda p: p["date"])
    return posts


def get_existing_substack_titles(api):
    """Fetch titles of existing drafts and published posts on Substack."""
    existing = set()

    # Get published posts
    try:
        published = api.get_posts() or []
        for post in published:
            title = post.get("title", "")
            if title:
                existing.add(title.strip().lower())
    except Exception as e:
        print(f"  Warning: Could not fetch published posts: {e}", file=sys.stderr)

    # Get drafts
    try:
        drafts = api.get_drafts() or []
        for draft in drafts:
            title = draft.get("title", "") or draft.get("draft_title", "")
            if title:
                existing.add(title.strip().lower())
    except Exception as e:
        print(f"  Warning: Could not fetch drafts: {e}", file=sys.stderr)

    return existing


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

    body = fm_post.content
    doc = markdown_to_prosemirror(body)

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

    # Set the document body directly, bypassing from_markdown
    post.draft_body = doc

    return post, tags


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
        try:
            uploaded = api.get_image(cover_url)
            substack_image_url = uploaded.get("url", "")
            if substack_image_url:
                api.put_draft(draft_id, cover_image=substack_image_url)
        except Exception as e:
            print(f"    Warning: Could not set cover image: {e}", file=sys.stderr)

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
            print(f"    Warning: Could not add tags: {e}", file=sys.stderr)

    return draft


def main():
    parser = argparse.ArgumentParser(
        description="Cross-post all unpublished blog posts to Substack."
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Publish posts immediately instead of creating drafts",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Just list what would be posted without actually doing it",
    )
    args = parser.parse_args()

    all_posts = load_all_posts()
    print(f"Found {len(all_posts)} posts in {POSTS_DIR}\n")

    if args.dry_run:
        print("Posts that would be cross-posted (sorted by date ascending):\n")
        for i, post in enumerate(all_posts, 1):
            print(f"  {i:2d}. [{post['date']}] {post['title']}")
            print(f"      Subtitle: {post['subtitle']}")
            print(f"      Tags: {', '.join(post['tags'])}")
            print(f"      URL: {BLOG_BASE_URL}/{post['slug']}/")
            print()
        print(f"[dry run] Would create {len(all_posts)} drafts on Substack.")
        print("Run without --dry-run to actually create drafts.")
        return

    api = get_api()

    # Check what already exists on Substack
    print("Checking existing Substack posts...")
    existing_titles = get_existing_substack_titles(api)
    if existing_titles:
        print(f"  Found {len(existing_titles)} existing posts/drafts on Substack.\n")
    else:
        print("  No existing posts found on Substack.\n")

    pub_url = os.environ.get("SUBSTACK_URL", DEFAULT_SUBSTACK_URL)

    # Filter to only posts that don't already exist
    to_post = []
    skipped = []
    for post in all_posts:
        if post["title"].strip().lower() in existing_titles:
            skipped.append(post)
        else:
            to_post.append(post)

    if skipped:
        print(f"Skipping {len(skipped)} posts already on Substack:")
        for post in skipped:
            print(f"  - {post['title']}")
        print()

    if not to_post:
        print("All posts are already on Substack. Nothing to do.")
        return

    print(f"Creating {'posts' if args.publish else 'drafts'} for {len(to_post)} posts:\n")

    created = 0
    failed = 0
    for post in to_post:
        print(f"  [{post['date']}] {post['title']}...")
        try:
            draft = create_draft(api, post["slug"], post["fm"])
            draft_id = draft.get("id")

            if args.publish:
                api.prepublish_draft(draft_id)
                api.publish_draft(draft_id)
                print(f"    Published: {pub_url}/p/{post['slug']}")
            else:
                print(f"    Draft: {pub_url}/publish/post/{draft_id}")

            created += 1

            # Delay to avoid rate limiting (Substack is aggressive)
            time.sleep(10)

        except Exception as e:
            print(f"    Error: {e}", file=sys.stderr)
            failed += 1
            # Extra delay after errors (likely rate limited)
            time.sleep(15)

    print(f"\nDone. Created: {created}, Failed: {failed}, Skipped: {len(skipped)}")


if __name__ == "__main__":
    main()
