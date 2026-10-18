// Add fragment targets without enabling raw HTML in Markdown.
type Node = {
  type: string;
  value?: string;
  alt?: string;
  children?: Node[];
  data?: {hProperties?: Record<string, unknown>; [key: string]: unknown};
};

function textOf(node: Node): string {
  return node.value ?? node.alt ?? node.children?.map(textOf).join('') ?? '';
}

export default function remarkHeadingIds() {
  return (tree: Node) => {
    // Layout owns #main for the keyboard skip link.
    const used = new Set<string>(['main']);
    function walk(node: Node) {
      if (node.type === 'heading') {
        const base = textOf(node).toLowerCase().trim()
          .replace(/[^\p{L}\p{M}\p{N}_\s-]/gu, '')
          .replace(/\s+/g, '-') || 'section';
        let id = base;
        for (let suffix = 1; used.has(id); suffix++) id = `${base}-${suffix}`;
        used.add(id);
        node.data = {...node.data, hProperties: {...node.data?.hProperties, id}};
      }
      node.children?.forEach(walk);
    }
    walk(tree);
  };
}
