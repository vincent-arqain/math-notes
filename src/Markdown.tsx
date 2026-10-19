import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkHeadingIds from './headingIds';
import rehypeLatexMath from './latexMath';
export default function Markdown({body}:{body:string}) {return <div className="prose"><ReactMarkdown skipHtml remarkPlugins={[remarkMath,remarkHeadingIds]} rehypePlugins={[[rehypeKatex,{throwOnError:false,strict:'ignore',trust:false}],rehypeLatexMath]} components={{a:({href,children})=><a href={href} rel="noopener noreferrer">{children}</a>,img:({alt,node,...props})=>Array.isArray(node?.properties.className)&&node.properties.className.includes('latex-svg')?<img {...props} alt="" aria-hidden="true"/>:<span className="muted">{alt?`[图片：${alt}]`:'[图片]'}</span>}}>{body}</ReactMarkdown></div>}
