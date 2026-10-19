import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const cache=path.join(root,'.latex-cache');
const fonts=path.join(root,'assets/fonts/fandol');
const rendererVersion=createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).update(readFileSync(path.join(fonts,'FandolSong-Regular.otf'))).update(readFileSync(path.join(fonts,'FandolSong-Bold.otf'))).digest('hex');
const used=new Set<string>();
interface MathImage {id:string;width:number;height:number;depth:number;fonts:string[]}

export function latexMath(tex:string,display:boolean):MathImage {
  // Only mathematical input reaches TeX. Disable file access, shell escape,
  // macro definitions and engine primitives in addition to KaTeX validation.
  if(/\\(?:input|include|includegraphics|openin|openout|read|write|special|immediate|def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|providecommand|csname|catcode|usepackage|documentclass|loop|repeat|shipout|every\w*|directlua|pdf\w*|XeTeX\w*)(?![A-Za-z])/.test(tex)||/(?<!\\)\$|\^\^/.test(tex))throw new Error('公式只允许标准数学 LaTeX 命令');
  const id=createHash('sha256').update(rendererVersion+'\0'+display+'\0'+tex).digest('hex');
  mkdirSync(cache,{recursive:true});
  const metadata=path.join(cache,id+'.json');
  const svg=path.join(cache,id+'.svg');
  if(existsSync(metadata)&&existsSync(svg)){used.add(id);return JSON.parse(readFileSync(metadata,'utf8'));}
  const work=mkdtempSync(path.join(cache,'compile-'));
  try{
    // xdvipdfmx may resolve font paths to absolute names. Keep actual font
    // files inside its allowed temporary directory, rather than symlinking out.
    for(const name of ['FandolSong-Regular.otf','FandolSong-Bold.otf'])copyFileSync(path.join(fonts,name),path.join(work,name));
    // CJK text inside an equation uses Fandol; all mathematical glyphs retain
    // LaTeX's original Computer Modern/AMS fonts, rather than a web substitute.
    const source=tex.replace(/[\u3400-\u9fff]+/g,s=>`\\text{\\fontencoding{TU}\\Fandol ${s}}`);
    // Suppress interword spaces around the box: otherwise standalone includes
    // them in the SVG while our metrics do not, shrinking short formulas most.
    const document=String.raw`\documentclass[10pt,border=0pt]{standalone}
\usepackage{amsmath,amssymb}
\usepackage[no-math]{fontspec}
\newfontfamily\Fandol{FandolSong-Regular.otf}[Path=./,BoldFont=FandolSong-Bold.otf]
\newsavebox{\FormulaBox}
\newwrite\metrics
\begin{document}%
\sbox{\FormulaBox}{$${display?'\\displaystyle':'\\textstyle'} ${source}$}%
\immediate\openout\metrics=metrics.txt\relax
\immediate\write\metrics{\the\wd\FormulaBox,\the\ht\FormulaBox,\the\dp\FormulaBox}%
\immediate\closeout\metrics
\usebox{\FormulaBox}%
\end{document}
`;
    writeFileSync(path.join(work,'formula.tex'),document);
    const env={PATH:process.env.PATH,LANG:'C.UTF-8',openin_any:'p',openout_any:'p',TEXMFOUTPUT:work,XDG_CACHE_HOME:path.join(cache,'font-cache')};
    const compiler=spawnSync('xelatex',['-no-shell-escape','-interaction=batchmode','-halt-on-error','formula.tex'],{cwd:work,env,timeout:30_000,encoding:'utf8'});
    if(compiler.error||compiler.status!==0)throw new Error(compiler.stderr||compiler.stdout||String(compiler.error));
    const log=readFileSync(path.join(work,'formula.log'),'utf8');
    if(/Missing character:/.test(log))throw new Error('公式包含字体未覆盖的字符');
    const [width,height,depth]=readFileSync(path.join(work,'metrics.txt'),'utf8').trim().split(',').map(parseFloat);
    if(![width,height,depth].every(n=>Number.isFinite(n)&&n>=0)||width===0||height+depth===0)throw new Error('LaTeX 公式尺寸无效');
    execFileSync('pdftocairo',['-svg','formula.pdf','formula.svg'],{cwd:work,env,timeout:30_000,stdio:'pipe'});
    const fontReport=execFileSync('pdffonts',['formula.pdf'],{cwd:work,env,timeout:10_000,encoding:'utf8'});
    const fontNames=fontReport.trim().split('\n').slice(2).map(line=>line.split(/\s+/)[0].replace(/^[A-Z]{6}\+/,''));
    if(!fontNames.length||(/[\u3400-\u9fff]/.test(tex)&&!fontNames.some(name=>name.startsWith('FandolSong'))))throw new Error(`公式字体未正确嵌入：${fontNames.join(', ')}\n${compiler.stderr}\n${log.split('\n').filter(line=>/Fandol|Font Warning|font encoding|Missing character|not found/.test(line)).slice(-30).join('\n')}`);
    const result={id,width:width/10,height:height/10,depth:depth/10,fonts:fontNames};
    renameSync(path.join(work,'formula.svg'),svg);
    writeFileSync(path.join(work,'result.json'),JSON.stringify(result));
    renameSync(path.join(work,'result.json'),metadata);
    used.add(id);
    return result;
  }catch(error){
    const log=existsSync(path.join(work,'formula.log'))?readFileSync(path.join(work,'formula.log'),'utf8'):'';
    const detail=log.match(/^!.*(?:\n.*){0,4}/m)?.[0]||String(error);
    throw new Error(`LaTeX 公式编译失败：${tex.slice(0,120)}\n${detail}`);
  }finally{rmSync(work,{recursive:true,force:true});}
}

export function copyLatexMathAssets(destination:string){
  mkdirSync(destination,{recursive:true});
  for(const id of used)copyFileSync(path.join(cache,id+'.svg'),path.join(destination,id+'.svg'));
}

export default function rehypeLatexMath(){
  return(tree:any)=>{
    const text=(node:any):string=>node.type==='text'?node.value:(node.children||[]).map(text).join('');
    function walk(node:any,display=false){
      const classes=node.properties?.className||[];
      if(classes.includes('katex-error'))throw new Error('无效的 LaTeX 公式：'+text(node));
      display=display||classes.includes('katex-display');
      if(classes.includes('katex')){
        let tex='';
        function find(n:any){if(n.tagName==='annotation'&&n.properties?.encoding==='application/x-tex')tex=text(n);else for(const child of n.children||[])find(child);}
        find(node);
        const result=latexMath(tex,display);
        // Keep the accessible MathML, but render the visible formula with TeX.
        node.children=node.children.filter((n:any)=>n.properties?.className?.includes('katex-mathml'));
        node.children.push({type:'element',tagName:'img',properties:{className:['latex-svg'],src:`/math/${result.id}.svg`,alt:'',ariaHidden:'true',style:`width:${result.width}em;height:${result.height+result.depth}em;vertical-align:-${result.depth}em`},children:[]});
        return;
      }
      for(const child of node.children||[])walk(child,display);
    }
    walk(tree);
  };
}
