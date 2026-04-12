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
            # Check if this paragraph contains only an image
            if len(content) == 1 and content[0].get("type") == "captionedImage":
                output.append(content[0])
            elif content:
                output.append({"type": "paragraph", "content": content})
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

        # Tables
        if tok.type == "table_open":
            table_node = {"type": "table", "content": []}
            i = _process_table(tokens, i + 1, table_node["content"])
            output.append(table_node)
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


def _process_table(tokens, start_i, output):
    """Process table tokens into ProseMirror table nodes."""
    i = start_i
    while i < len(tokens):
        tok = tokens[i]

        if tok.type == "table_close":
            return i + 1

        # thead_open / tbody_open — skip, process rows directly
        if tok.type in ("thead_open", "tbody_open", "thead_close", "tbody_close"):
            i += 1
            continue

        if tok.type == "tr_open":
            row_node = {"type": "table_row", "content": []}
            i += 1
            while i < len(tokens) and tokens[i].type != "tr_close":
                cell_tok = tokens[i]
                if cell_tok.type in ("th_open", "td_open"):
                    cell_type = "table_header" if cell_tok.type == "th_open" else "table_cell"
                    cell_node = {"type": cell_type, "content": []}
                    # Next token should be inline content
                    i += 1
                    if i < len(tokens) and tokens[i].type == "inline":
                        content = _parse_inline(tokens[i].children) if tokens[i].children else []
                        if content:
                            cell_node["content"] = [{"type": "paragraph", "content": content}]
                        else:
                            cell_node["content"] = [{"type": "paragraph"}]
                        i += 1
                    # Skip th_close / td_close
                    if i < len(tokens) and tokens[i].type in ("th_close", "td_close"):
                        i += 1
                    row_node["content"].append(cell_node)
                else:
                    i += 1
            # Skip tr_close
            if i < len(tokens) and tokens[i].type == "tr_close":
                i += 1
            output.append(row_node)
            continue

        i += 1

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
