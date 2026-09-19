import { Fragment, type ReactNode } from "react";

/**
 * Small markdown renderer for assistant replies: headings, bullet and numbered
 * lists, bold, italic and inline code. Anything else is left as plain text.
 */

const HEADING = /^\s*(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const INLINE = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|`([^`]+)`/g;

/** A closing sentence tacked onto the last inline bullet, e.g. "…Coding Session I've moved two tasks." */
const TRAILING_SENTENCE =
  /^(.*?)\s+((?:I|I'm|I've|We|We've|You|Your|Let's|Here|There|That|This|These|All|Everything|It|Enjoy|Now)\b.*[.!?])$/;

/** The model often writes a whole list on one line: "Here's the plan: * **9 AM:** Gym * **11 AM:** Walk". */
function splitRunOnList(line: string): string[] {
  const parts = line.split(/\s+[*•]\s+(?=\S)/);
  if (parts.length < 3) return [line];

  const [lead, ...items] = parts;
  const last = items[items.length - 1].trim();
  const tail = TRAILING_SENTENCE.exec(last);
  if (tail) items[items.length - 1] = tail[1];

  const out = items.map((item) => `* ${item.trim()}`);
  if (tail) out.push("", tail[2]);
  return lead.trim() ? [lead.trim(), ...out] : out;
}

function renderInline(text: string, keyPrefix: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${match.index}`;
    const [, bold, boldAlt, italic, code] = match;
    if (bold ?? boldAlt) nodes.push(<strong key={key}>{bold ?? boldAlt}</strong>);
    else if (italic) nodes.push(<em key={key}>{italic}</em>);
    else if (code) nodes.push(<code key={key}>{code}</code>);
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : text;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "heading"; text: string };

function toBlocks(source: string): Block[] {
  const lines = source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap(splitRunOnList);

  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", lines: paragraph });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[2] });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = ORDERED.exec(line);
    if (bullet || ordered) {
      flush();
      const item = (bullet?.[1] ?? ordered?.[1] ?? "").trim();
      const isOrdered = Boolean(ordered);
      const previous = blocks[blocks.length - 1];
      if (previous?.kind === "list" && previous.ordered === isOrdered) previous.items.push(item);
      else blocks.push({ kind: "list", ordered: isOrdered, items: [item] });
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

export function Markdown({ text }: { text: string }) {
  const blocks = toBlocks(text);

  return (
    <div className="md">
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <p className="md-heading" key={i}>
              {renderInline(block.text, `h${i}`)}
            </p>
          );
        }

        if (block.kind === "list") {
          const items = block.items.map((item, j) => (
            <li key={j}>{renderInline(item, `l${i}-${j}`)}</li>
          ));
          return block.ordered ? (
            <ol className="md-list" key={i}>
              {items}
            </ol>
          ) : (
            <ul className="md-list" key={i}>
              {items}
            </ul>
          );
        }

        return (
          <p className="md-p" key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 ? <br /> : null}
                {renderInline(line, `p${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
