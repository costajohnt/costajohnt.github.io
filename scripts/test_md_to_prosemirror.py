"""
Tests for md_to_prosemirror and the Substack duplicate-check pagination.

Run with the repo venv:
    .venv/bin/python scripts/test_md_to_prosemirror.py
or:
    .venv/bin/python -m unittest discover -s scripts
"""

import importlib.util
import sys
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


def _load_substack_module():
    spec = importlib.util.spec_from_file_location(
        "cross_post_substack", SCRIPTS_DIR / "cross-post-substack.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestFindExistingPostFailClosed(unittest.TestCase):
    def test_missing_total_exits_nonzero(self):
        mod = _load_substack_module()

        class FakeApi:
            def get_published_posts(self, offset, limit):
                return {"posts": []}  # no "total" key

        with self.assertRaises(SystemExit) as ctx:
            mod.find_existing_post(FakeApi(), "Some Title")
        self.assertEqual(ctx.exception.code, 1)


if __name__ == "__main__":
    unittest.main()
