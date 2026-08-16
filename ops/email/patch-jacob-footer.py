from pathlib import Path

p = Path("/opt/jacob-roman-blog/components/footer.tsx")
t = p.read_text()
if "hello@jacob-roman.com" in t:
    print("already present")
    raise SystemExit(0)

old = """          <div className=\"flex gap-4\">
            <Link
              href=\"/about\"
              className=\"text-xs font-medium text-muted-foreground transition-colors hover:text-primary\"
            >
              About
            </Link>"""

new = """          <div className=\"flex gap-4\">
            <a
              href=\"mailto:hello@jacob-roman.com\"
              className=\"text-xs font-medium text-muted-foreground transition-colors hover:text-primary\"
            >
              hello@jacob-roman.com
            </a>
            <Link
              href=\"/about\"
              className=\"text-xs font-medium text-muted-foreground transition-colors hover:text-primary\"
            >
              About
            </Link>"""

if old not in t:
    raise SystemExit("pattern not found")
p.write_text(t.replace(old, new, 1))
print("footer updated")
