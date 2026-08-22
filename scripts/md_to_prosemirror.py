"""
Convert markdown to Substack's ProseMirror JSON document format.

Uses markdown-it-py for proper AST parsing, then walks the token tree
to emit ProseMirror-compatible nodes and marks.
"""

from markdown_it import MarkdownIt


def markdown_to_prosemirror(md_text):
    """Convert a markdown string to a ProseMirror document dict."""
    mdit = MarkdownIt("commonmark", {"breaks": False}).enable("table")
    tokens = mdit.parse(md_text)
    doc = {"type": "doc", "content": []}
    _process_tokens(tokens, doc["content"])
    return doc


def _process_tokens(tokens, output):
    """Walk the flat token stream and build ProseMirror nodes."""
    i = 0
    while i < len(tokens):
        tok = tokens[i]

        # Headings
        if tok.type == "heading_open":
            level = int(tok.tag[1])  # h1 -> 1, h2 -> 2, etc.
            inline_tok = tokens[i + 1]  # heading content is always inline
            content = _parse_inline(inline_tok.children, strip_bold=True) if inline_tok.children else []
            # Filter out empty text nodes
            content = [n for n in content if not (n.get("type") == "text" and not n.get("text", "").strip())]
            node = {"type": "heading", "attrs": {"level": level}}
            if content:
                node["content"] = content
            output.append(node)
            i += 3  # heading_open, inline, heading_close
            continue

        # Paragraphs
        if tok.type == "paragraph_open":
            inline_tok = tokens[i + 1]
            content = _parse_inline(inline_tok.children) if inline_tok.children else []
            # captionedImage is block-level: lift each image out of the
            # paragraph, wrapping the runs of inline nodes around it in
            # their own paragraph nodes.
            run = []
            for node in content:
                if node.get("type") == "captionedImage":
                    if _has_visible_content(run):
                        output.append({"type": "paragraph", "content": run})
                    run = []
                    output.append(node)
                else:
                    run.append(node)
            if _has_visible_content(run):
                output.append({"type": "paragraph", "content": run})
            i += 3  # paragraph_open, inline, paragraph_close
            continue

        # Bullet lists
        if tok.type == "bullet_list_open":
            list_node = {"type": "bullet_list", "content": []}
            i = _process_list(tokens, i + 1, "bullet_list_close", list_node["content"])
            output.append(list_node)
            continue

        # Ordered lists
        if tok.type == "ordered_list_open":
            start = tok.attrGet("start") or 1
            list_node = {"type": "ordered_list", "attrs": {"start": start, "order": "1"}, "content": []}
            i = _process_list(tokens, i + 1, "ordered_list_close", list_node["content"])
            output.append(list_node)
            continue

        # Blockquotes
        if tok.type == "blockquote_open":
            bq_node = {"type": "blockquote", "content": []}
            depth = 1
            j = i + 1
            bq_tokens = []
            while j < len(tokens):
                if tokens[j].type == "blockquote_open":
                    depth += 1
                elif tokens[j].type == "blockquote_close":
                    depth -= 1
                    if depth == 0:
                        break
                bq_tokens.append(tokens[j])
                j += 1
            _process_tokens(bq_tokens, bq_node["content"])
            output.append(bq_node)
            i = j + 1
            continue

        # Code blocks (fenced)
        if tok.type == "fence":
            lang = tok.info.strip() if tok.info else None
            code_content = tok.content.rstrip("\n")
            node = {"type": "codeBlock"}
            if lang:
                node["attrs"] = {"language": lang}
            node["content"] = [{"type": "text", "text": code_content}]
            output.append(node)
            i += 1
            continue

        # Code blocks (indented)
        if tok.type == "code_block":
            code_content = tok.content.rstrip("\n")
            output.append({
                "type": "codeBlock",
                "content": [{"type": "text", "text": code_content}],
            })
            i += 1
            continue

        # Tables — Substack has no table support, convert to bold key: value paragraphs
        if tok.type == "table_open":
            i = _process_table_as_list(tokens, i + 1, output)
            continue

        # Horizontal rule
        if tok.type == "hr":
            output.append({"type": "horizontal_rule"})
            i += 1
            continue

        # HTML blocks (skip)
        if tok.type == "html_block":
            i += 1
            continue

        # Skip unknown tokens
        i += 1


def _has_visible_content(nodes):
    """True if the node list contains anything besides whitespace-only text."""
    return any(
        n.get("type") != "text" or n.get("text", "").strip() for n in nodes
    )


def _process_table_as_list(tokens, start_i, output):
    """Convert table to bold key: value paragraphs (Substack has no table support)."""
    i = start_i
    headers = []
    rows = []
    current_row = []
    in_header = False

    while i < len(tokens):
        tok = tokens[i]

        if tok.type == "table_close":
            i += 1
            break

        if tok.type == "thead_open":
            in_header = True
        elif tok.type == "thead_close":
            in_header = False
        elif tok.type == "tr_open":
            current_row = []
        elif tok.type == "tr_close":
            if in_header:
                headers = current_row
            else:
                rows.append(current_row)
        elif tok.type == "inline":
            current_row.append(_parse_inline(tok.children) if tok.children else [])

        i += 1

    # Render as paragraphs: "Header1: Value1 · Header2: Value2"
    header_texts = ["".join(n.get("text", "") for n in h).strip() for h in headers]
    for row in rows:
        parts = []
        for j, cell in enumerate(row):
            if j < len(header_texts) and header_texts[j]:
                parts.append({"type": "text", "text": f"{header_texts[j]}: ", "marks": [{"type": "strong"}]})
            parts.extend(cell)
            if j < len(row) - 1:
                parts.append({"type": "text", "text": " · "})
        if parts:
            output.append({"type": "paragraph", "content": parts})

    return i


def _process_list(tokens, start_i, close_type, output):
    """Process list items until we hit the close token."""
    i = start_i
    while i < len(tokens):
        tok = tokens[i]

        if tok.type == close_type:
            return i + 1

        if tok.type == "list_item_open":
            item_node = {"type": "list_item", "content": []}
            # Collect tokens until list_item_close
            depth = 1
            j = i + 1
            item_tokens = []
            while j < len(tokens):
                if tokens[j].type == "list_item_open":
                    depth += 1
                elif tokens[j].type == "list_item_close":
                    depth -= 1
                    if depth == 0:
                        break
                item_tokens.append(tokens[j])
                j += 1
            _process_tokens(item_tokens, item_node["content"])
            output.append(item_node)
            i = j + 1
            continue

        i += 1

    return i


def _parse_inline(children, strip_bold=False):
    """Convert inline tokens to ProseMirror text nodes with marks."""
    if not children:
        return []

    result = []
    mark_stack = []

    for tok in children:
        # Opening marks
        if tok.type == "strong_open":
            if not strip_bold:
                mark_stack.append({"type": "strong"})
            continue
        if tok.type == "em_open":
            mark_stack.append({"type": "em"})
            continue
        if tok.type == "link_open":
            href = tok.attrGet("href") or ""
            mark_stack.append({"type": "link", "attrs": {"href": href}})
            continue

        # Closing marks
        if tok.type in ("strong_close", "em_close", "link_close"):
            mark_type = tok.type.replace("_close", "")
            if strip_bold and mark_type == "strong":
                continue
            for idx in range(len(mark_stack) - 1, -1, -1):
                if mark_stack[idx]["type"] == mark_type:
                    mark_stack.pop(idx)
                    break
            continue

        # Text
        if tok.type == "text":
            if not tok.content:
                continue
            node = {"type": "text", "text": tok.content}
            if mark_stack:
                node["marks"] = [dict(m) for m in mark_stack]
            result.append(node)
            continue

        # Inline code
        if tok.type == "code_inline":
            node = {"type": "text", "text": tok.content}
            marks = [dict(m) for m in mark_stack] if mark_stack else []
            marks.append({"type": "code"})
            node["marks"] = marks
            result.append(node)
            continue

        # Softbreak
        if tok.type == "softbreak":
            # Just add a space or newline
            node = {"type": "text", "text": "\n"}
            if mark_stack:
                node["marks"] = [dict(m) for m in mark_stack]
            result.append(node)
            continue

        # Hardbreak
        if tok.type == "hardbreak":
            result.append({"type": "hardBreak"})
            continue

        # Images
        if tok.type == "image":
            src = tok.attrGet("src") or ""
            alt = tok.attrGet("alt") or tok.content or ""
            # Convert local paths to full URLs
            if src.startswith("/"):
                src = f"https://jcosta.tech{src}"
            result.append({
                "type": "captionedImage",
                "attrs": {"src": src, "alt": alt},
            })
            continue

    return result
