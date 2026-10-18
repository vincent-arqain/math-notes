import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkHeadingIds from './headingIds';
export default function Markdown({body}:{body:string}) {return <div className="prose"><ReactMarkdown skipHtml remarkPlugins={[remarkMath,remarkHeadingIds]} rehypePlugins={[[rehypeKatex,{throwOnError:false,strict:'ignore',trust:false}]]} components={{a:({href,children})=><a href={href} rel="noopener noreferrer">{children}</a>,img:({alt})=><span className="muted">{alt?`[图片：${alt}]`:'[图片]'}</span>}}>{body}</ReactMarkdown></div>}
