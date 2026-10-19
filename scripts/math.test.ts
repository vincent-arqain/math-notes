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
    assert.ok(math.fonts.includes('CMEX10'),`Large operators must use original Computer Modern: ${math.fonts.join(', ')}`);
    assert.ok(math.fonts.some(name=>name.startsWith('CMMI')),`Variables must use Computer Modern math italic: ${math.fonts.join(', ')}`);
    assert.ok(math.width>0&&math.height>0&&math.depth>0);
    copyLatexMathAssets(path.join(output,'math'));
    const svg=await readFile(path.join(output,'math',math.id+'.svg'),'utf8');
    assert.match(svg,/<svg/);assert.match(svg,/<path/);
    assert.doesNotMatch(svg,/<script|<foreignObject|https?:\/\/[^"\s]+\.(?:woff|ttf)/);
    assert.ok(latexMath(String.raw`\mathbf{v}`,false).fonts.includes('CMBX10'));
    const chinese=latexMath(String.raw`\text{为奇数}`,false);
    assert.ok(chinese.fonts.some(font=>font.startsWith('FandolSong')),`Chinese math text must use Fandol Song: ${JSON.stringify(chinese.fonts)}`);
  }finally{await rm(output,{recursive:true,force:true});}
});

test('SVG bounds match TeX metrics so short and multiline formulas keep the same scale',async()=>{
  const output=await mkdtemp(path.join(tmpdir(),'math-scale-'));
  try{
    const formulas=[
      {tex:'x',display:false},
      {tex:'j=0',display:false},
      {tex:String.raw`\zeta(2)`,display:false},
      {tex:String.raw`\sum_{k=1}^{\infty}\frac1{k^2}`,display:true},
      {tex:String.raw`\begin{aligned}T_m&=\sum_{k=1}^{\infty}\frac1k\\&=\frac1m\sum_{j=0}^{m-1}H_j\end{aligned}`,display:true},
    ].map(({tex,display})=>({tex,math:latexMath(tex,display)}));
    copyLatexMathAssets(output);
    // TeX uses 72.27 pt/in; PDF/SVG viewports use 72 points/in.
    const emToPdfPoints=10*72/72.27;
    for(const {tex,math} of formulas){
      const svg=await readFile(path.join(output,math.id+'.svg'),'utf8');
      const viewBox=svg.match(/\bviewBox="([^"]+)"/);
      assert.ok(viewBox,`Missing SVG viewBox: ${tex}`);
      const [x,y,width,height]=viewBox[1].split(/\s+/).map(Number);
      assert.equal(x,0);assert.equal(y,0);
      assert.ok(Math.abs(width-math.width*emToPdfPoints)<0.03,`Unexpected horizontal space would shrink ${tex}: SVG ${width}, TeX ${math.width*emToPdfPoints}`);
      assert.ok(Math.abs(height-(math.height+math.depth)*emToPdfPoints)<0.03,`Unexpected vertical space would shrink ${tex}`);
    }
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
