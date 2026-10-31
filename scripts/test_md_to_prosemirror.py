"""
Tests for md_to_prosemirror and the Substack duplicate-check pagination.

Run with the repo venv:
    .venv/bin/python scripts/test_md_to_prosemirror.py
or:
    .venv/bin/python -m unittest discover -s scripts
"""

import contextlib
import importlib.util
import io
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from md_to_prosemirror import markdown_to_prosemirror


def convert(md):
    return markdown_to_prosemirror(md)["content"]


class TestMarkdownToProsemirror(unittest.TestCase):
    def test_heading(self):
        nodes = convert("## Hello world")
        self.assertEqual(nodes, [{
            "type": "heading",
            "attrs": {"level": 2},
            "content": [{"type": "text", "text": "Hello world"}],
        }])

    def test_paragraph_bold_and_link(self):
        nodes = convert("Some **bold** and [a link](https://example.com).")
        self.assertEqual(nodes, [{
            "type": "paragraph",
            "content": [
                {"type": "text", "text": "Some "},
                {"type": "text", "text": "bold", "marks": [{"type": "strong"}]},
                {"type": "text", "text": " and "},
                {"type": "text", "text": "a link",
                 "marks": [{"type": "link", "attrs": {"href": "https://example.com"}}]},
                {"type": "text", "text": "."},
            ],
        }])

    def test_sole_image_is_top_level(self):
        nodes = convert("![alt text](/img/cover.png)")
        self.assertEqual(nodes, [{
            "type": "captionedImage",
            "attrs": {"src": "https://jcosta.tech/img/cover.png", "alt": "alt text"},
        }])

    def test_image_amid_text_splits_paragraph(self):
        nodes = convert("before ![alt](x.png) after")
        self.assertEqual([n["type"] for n in nodes],
                         ["paragraph", "captionedImage", "paragraph"])
        self.assertEqual(nodes[0]["content"], [{"type": "text", "text": "before "}])
        self.assertEqual(nodes[1]["attrs"]["src"], "x.png")
        self.assertEqual(nodes[2]["content"], [{"type": "text", "text": " after"}])

    def test_nested_list(self):
        nodes = convert("- outer\n  - inner\n")
        self.assertEqual(len(nodes), 1)
        outer = nodes[0]
        self.assertEqual(outer["type"], "bullet_list")
        item = outer["content"][0]
        self.assertEqual(item["type"], "list_item")
        self.assertEqual(item["content"][0], {
            "type": "paragraph",
            "content": [{"type": "text", "text": "outer"}],
        })
        inner = item["content"][1]
        self.assertEqual(inner["type"], "bullet_list")
        self.assertEqual(inner["content"][0]["content"][0], {
            "type": "paragraph",
            "content": [{"type": "text", "text": "inner"}],
        })

    def test_blockquote(self):
        nodes = convert("> quoted text")
        self.assertEqual(nodes, [{
            "type": "blockquote",
            "content": [{
                "type": "paragraph",
                "content": [{"type": "text", "text": "quoted text"}],
            }],
        }])

    def test_break_only_run_between_images_emits_no_blank_paragraph(self):
        nodes = convert("![a](x.png)  \n![b](y.png)")
        self.assertEqual([n["type"] for n in nodes],
                         ["captionedImage", "captionedImage"])

    def test_image_in_table_cell_falls_back_to_alt_text(self):
        md = (
            "| Shot |\n"
            "| --- |\n"
            "| ![screenshot](x.png) |\n"
        )
        nodes = convert(md)
        self.assertEqual(len(nodes), 1)
        types = {n.get("type") for n in nodes[0]["content"]}
        self.assertNotIn("captionedImage", types)
        texts = "".join(n.get("text", "") for n in nodes[0]["content"])
        self.assertIn("screenshot", texts)

    def test_table_cells_keep_formatting(self):
        md = (
            "| Name | Link |\n"
            "| --- | --- |\n"
            "| **bold** | [site](https://example.com) |\n"
        )
        nodes = convert(md)
        self.assertEqual(nodes, [{
            "type": "paragraph",
            "content": [
                {"type": "text", "text": "Name: ", "marks": [{"type": "strong"}]},
                {"type": "text", "text": "bold", "marks": [{"type": "strong"}]},
                {"type": "text", "text": " · "},
                {"type": "text", "text": "Link: ", "marks": [{"type": "strong"}]},
                {"type": "text", "text": "site",
                 "marks": [{"type": "link", "attrs": {"href": "https://example.com"}}]},
            ],
        }])


def _load_script(filename):
    spec = importlib.util.spec_from_file_location(
        filename.replace("-", "_").removesuffix(".py"), SCRIPTS_DIR / filename
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _load_substack_module():
    return _load_script("cross-post-substack.py")


class TestFindExistingPostFailClosed(unittest.TestCase):
    def test_missing_total_exits_nonzero(self):
        mod = _load_substack_module()

        class FakeApi:
            def get_published_posts(self, offset, limit):
                return {"posts": []}  # no "total" key

        with self.assertRaises(SystemExit) as ctx:
            mod.find_existing_post(FakeApi(), "Some Title")
        self.assertEqual(ctx.exception.code, 1)


class TestPublishRequiresLiveCover(unittest.TestCase):
    def test_cover_timeout_under_publish_exits_before_creating_anything(self):
        mod = _load_substack_module()
        mod.load_post = lambda slug: {"title": "T", "cover": "/assets/covers/t.png", "tags": []}
        mod.get_api = lambda: object()
        mod.find_existing_post = lambda api, title: None
        mod.wait_for_url = lambda url, **kw: False
        mod.create_draft = lambda *a: self.fail("create_draft must not run")
        sys.argv = ["cross-post-substack.py", "t", "--publish"]
        quiet = io.StringIO()
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            with self.assertRaises(SystemExit) as ctx:
                mod.main()
        self.assertEqual(ctx.exception.code, 1)
        self.assertIn("cover not live", quiet.getvalue())


class TestBacklogScript(unittest.TestCase):
    def test_missing_total_exits_nonzero(self):
        mod = _load_script("cross-post-backlog.py")

        class FakeApi:
            def get_published_posts(self, offset, limit):
                return {"posts": []}  # no "total" key

        with self.assertRaises(SystemExit) as ctx:
            mod.get_existing_substack_titles(FakeApi())
        self.assertEqual(ctx.exception.code, 1)

    def test_load_all_posts_skips_drafts_and_archived(self):
        mod = _load_script("cross-post-backlog.py")
        with tempfile.TemporaryDirectory() as tmp:
            posts = Path(tmp)
            (posts / "live.md").write_text("---\ntitle: Live\ndate: 2026-01-02\n---\nbody\n")
            (posts / "draft.md").write_text("---\ntitle: Draft\ndate: 2026-01-03\ndraft: true\n---\nbody\n")
            (posts / "old.md").write_text("---\ntitle: Old\ndate: 2026-01-01\narchived: true\n---\nbody\n")
            mod.POSTS_DIR = posts
            self.assertEqual([p["slug"] for p in mod.load_all_posts()], ["live"])


if __name__ == "__main__":
    unittest.main()
