// CommonMark leaves a bold label literal when closing punctuation is followed
// immediately by Chinese text, as in **解：**记. Preserve the intended label
// without rewriting code, escaped Markdown, or the surrounding document.
export default function remarkDocumentLabels() {
  return (tree:any,file:any) => {
    const source=String(file);
    function walk(node:any) {
      const first=node.type==='paragraph' ? node.children?.[0] : null;
      if(first?.type==='text') {
        const match=first.value.match(/^\*\*([^*\n]{1,32}[：:])\*\*/u);
        const offset=first.position?.start?.offset;
        if(match && typeof offset==='number' && source.slice(offset,offset+2)==='**') {
          const rest=first.value.slice(match[0].length);
          node.children.splice(0,1,
            {type:'strong',children:[{type:'text',value:match[1]}]},
            ...(rest ? [{type:'text',value:rest}] : []));
        }
      }
      for(const child of node.children||[])walk(child);
    }
    walk(tree);
  };
}
