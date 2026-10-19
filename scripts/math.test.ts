import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Markdown from '../src/Markdown';
import {parseDocument} from '../src/content';
import {latexMath,copyLatexMathAssets} from '../src/latexMath';

test('standard LaTeX renders Computer Modern SVG and preserves accessible MathML',async()=>{
  const output=await mkdtemp(path.join(tmpdir(),'math-assets-'));
  try{
    const body='变量 $x$，函数 $\\log x$，向量 $\\mathbf{v}$。\n\n$$\n\\sum_{n=1}^{\\infty}\\frac1{n^2}=\\frac{\\pi^2}{6}.\n$$';
    const html=renderToStaticMarkup(createElement(Markdown,{body}));
    assert.doesNotMatch(html,/katex-error/);
    assert.match(html,/class="katex-mathml"/);
    assert.match(html,/<img class="latex-svg"[^>]+aria-hidden="true"/);
    assert.doesNotMatch(html,/class="katex-html"/);
    const math=latexMath(String.raw`\sum_{n=1}^{\infty}\frac1{n^2}`,true);
    assert.ok(math.fonts.includes('CMEX10'),'Large operators must use original Computer Modern.');
    assert.ok(math.fonts.some(name=>name.startsWith('CMMI')),'Variables must use Computer Modern math italic.');
    assert.ok(math.width>0&&math.height>0&&math.depth>0);
    copyLatexMathAssets(path.join(output,'math'));
    const svg=await readFile(path.join(output,'math',math.id+'.svg'),'utf8');
    assert.match(svg,/<svg/);assert.match(svg,/<path/);
    assert.doesNotMatch(svg,/<script|<foreignObject|https?:\/\/[^"\s]+\.(?:woff|ttf)/);
    assert.ok(latexMath(String.raw`\mathbf{v}`,false).fonts.includes('CMBX10'));
    assert.ok(latexMath(String.raw`\text{为奇数}`,false).fonts.some(font=>font.startsWith('FandolSong')));
  }finally{await rm(output,{recursive:true,force:true});}
});

test('LaTeX compilation rejects executable input instead of publishing it',()=>{
  for(const tex of [String.raw`\input{/etc/passwd}`,String.raw`\def\x{a}`,String.raw`\write18{whoami}`,'^^69nput','x$']){
    assert.throws(()=>latexMath(tex,false),/只允许标准数学/);
  }
});

test('Euler article renders every display equation without KaTeX errors',async()=>{
  const source=await readFile(new URL('../content/notes/euler-series-harmonic-numbers.md',import.meta.url),'utf8');
  const {body}=parseDocument(source);
  const equations=[...body.matchAll(/^\$\$\n([\s\S]*?)\n\$\$$/gm)];
  assert.ok(equations.length>0);
  for(const [,tex] of equations)assert.doesNotMatch(tex,/([.,])\1\s*$/m,'Equation punctuation should appear once.');
  const html=renderToStaticMarkup(createElement(Markdown,{body}));
  assert.doesNotMatch(html,/katex-error/);
  assert.equal([...html.matchAll(/class="katex-display"/g)].length,equations.length);
});
