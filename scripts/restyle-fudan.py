#!/usr/bin/env python3
"""Recover existing solutions for XeLaTeX without guessing any mathematics.

Prose is reflowed in Fandol Song. Formula glyphs and fraction rules are recovered
from their original TeX geometry, mapped to Computer Modern/AMS, and emitted as
searchable TeX boxes. This preserves scripts, matrix entries, and every symbol
when semantic .tex sources are unavailable. No PDF page or old font is embedded.
Requires PyMuPDF and fontTools. Run with an inventory JSON and an output folder.
"""
from __future__ import annotations
import collections, io, json, math, pathlib, re, subprocess, sys, unicodedata
import fitz
from fontTools.cffLib import CFFFontSet
from fontTools.t1Lib import T1Font
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.agl import toUnicode

BODY=10.90909
def kpse(name):
    return subprocess.check_output(['kpsewhich',name],text=True).strip()
FAMILIES={
    'mi':('cmmi10.pfb','OML','cmm','m','it'),
    'sy':('cmsy10.pfb','OMS','cmsy','m','n'),
    'ex':('cmex10.pfb','OMX','cmex','m','n'),
    'rm':('cmr10.pfb','OT1','cmr','m','n'),
    'bf':('cmbx10.pfb','OT1','cmr','bx','n'),
    'am':('msam10.pfb','U','msa','m','n'),
    'bb':('msbm10.pfb','U','msb','m','n'),
}
CM={};LOOKUP={}
for key,(filename,*_) in FAMILIES.items():
    font=T1Font(kpse(filename));glyphs=font.getGlyphSet()
    CM[key]=(font,glyphs)
    LOOKUP[key]={}
    for i,name in enumerate(font['Encoding'][:128]):
        if name!='.notdef':LOOKUP[key].setdefault(name,i)
LM=TTFont(kpse('latinmodern-math.otf'))
LM_ORDER=LM.getGlyphOrder();LM_GLYPHS=LM.getGlyphSet()

def ink(glyphs,name):
    pen=BoundsPen(glyphs);glyphs[name].draw(pen)
    return pen.bounds or (0,0,0,0)

def escape(s):
    s=s.replace('\u00a0',' ').replace('\u200b','')
    return ''.join({'\\':r'\textbackslash{}','{':r'\{','}':r'\}','$':r'\$','&':r'\&',
                    '#':r'\#','_':r'\_','%':r'\%','^':r'\textasciicircum{}','~':r'\textasciitilde{}'}.get(c,c) for c in s)

ALIASES={
 'theta1':'theta1',
 'uni210E':'h','uni2113':'lscript','ratio':'colon',
 'minute':'prime','divides':'bar','uni22C5':'periodcentered',
 'uni0394':'Delta','uni21A6':'mapsto','uni21A6.endl':'mapsto',
 'uni2216':'backslash','uni27C2':'perpendicular','uni27F5':'arrowleft',
 'uni239B':'parenlefttp','uni239C':'parenleftex','uni239D':'parenleftbt',
 'uni239E':'parenrighttp','uni239F':'parenrightex','uni23A0':'parenrightbt',
 'uni23A7':'bracelefttp','uni23A8':'braceleftmid','uni23A9':'braceleftbt',
 'braceleft.ex':'braceex','divides.bt':'vextendsingle','divides.ex':'vextendsingle',
 'divides.tp':'vextendsingle','barex':'vextendsingle','bardblex':'vextenddouble',
 'bardbl':'bardbl','angbracketleft':'angbracketleft','angbracketright':'angbracketright',
 'summation':'summationtext','summation.v1':'summationdisplay',
 'product':'producttext','product.v1':'productdisplay','uni22C3.v1':'uniondisplay',
 'bracketleft.v1':'bracketleftbig','bracketright.v1':'bracketrightbig',
 'bracketleft.v7':'bracketleftBigg','bracketright.v7':'bracketrightBigg',
 'parenleft.v1':'parenleftbig','parenright.v1':'parenrightbig',
 'parenleft.v6':'parenleftBigg','parenright.v6':'parenrightBigg',
 'parenleft.v7':'parenleftBigg','parenright.v7':'parenrightBigg',
 'divides.v6':'vextendsingle','tildecomb':'tilde',
 'bracehext':'minus',
}
COMPOSITES={'notequal':r'\ne','uni2260':r'\ne','uni2224':r'\nmid','uni228A':r'\subsetneq',
            'ellipsis':r'\ldots','uni22EE':r'\vdots','uni22EF':r'\cdots','uni22F1':r'\ddots'}

def target(name,font):
    original=name
    name=re.sub(r'\.(sts|st)$','',name)
    name=re.sub(r'\.1$','',name)
    if re.search(r'(tp|bt|ex)A$',name):name=name[:-1]
    preferred='rm'
    if any(k in font for k in ['MathItalic','CMMI','NewTXMI','txmia']):preferred='mi'
    elif any(k in font for k in ['MathSymbols','CMSY','txsys']):preferred='sy'
    elif any(k in font for k in ['MathExtension','CMEX','txex']):preferred='ex'
    elif 'MSAM' in font:preferred='am'
    elif 'MSBM' in font:preferred='bb'
    elif font=='txsym':preferred='bb'
    if 'Bold' in font:preferred='bf'
    if name.startswith(('u1D','uni')):
        m=re.fullmatch(r'(?:u|uni)([0-9A-F]{4,6})',name)
        if m:
            c=chr(int(m[1],16));u=unicodedata.name(c,'');base=unicodedata.normalize('NFKD',c)
            if 'MATHEMATICAL' in u:
                if 'DOUBLE-STRUCK' in u:preferred='bb'
                elif 'SCRIPT' in u:preferred='sy'
                elif 'BOLD' in u and 'ITALIC' not in u:preferred='bf'
                else:preferred='mi'
                if len(base)==1 and base.isascii():name=base
                elif len(base)==1:
                    g=unicodedata.name(base,'').split()[-1].lower()
                    name={'lamda':'lambda','final':'sigma1','symbol':'phi1'}.get(g,g)
            elif c in 'ℚℝℤ':preferred='bb';name={'ℚ':'Q','ℝ':'R','ℤ':'Z'}[c]
            elif c=='ℬ':preferred='sy';name='B'
            elif c=='ℎ':preferred='mi';name='h'
    name=ALIASES.get(name,name)
    if name in COMPOSITES:return ('tex',COMPOSITES[name],None,original)
    candidates=[preferred]+[x for x in ['rm','mi','sy','ex','am','bb'] if x!=preferred]
    for family in candidates:
        if name in LOOKUP[family]:return (family,LOOKUP[family][name],name,original)
    raise ValueError(f'Unmapped mathematical glyph {original!r} ({font}); normalized {name!r}')

def fontsize(size,base):
    if size>=base*.88:return BODY
    if size>=base*.55:return 7.9701
    return 5.9776

class Recovery:
    def __init__(self,filename):
        self.doc=fitz.open(filename);self.fonts={};self.count=0;self.glyphs=0
        for page in self.doc:
            for f in page.get_fonts():
                name=f[3].split('+')[-1].replace('-Identity-H','')
                if name in self.fonts:continue
                if f[1]=='cid':self.fonts[name]=None;continue
                try:
                    cff=CFFFontSet();cff.decompile(io.BytesIO(self.doc.extract_font(f[0])[3]),None)
                    top=cff[cff.fontNames[0]];self.fonts[name]=(top.charset,top.CharStrings)
                except Exception:self.fonts[name]=None
        sizes=collections.Counter()
        for page in self.doc:
            for tr in page.get_texttrace():
                if any(k in tr['font'] for k in ['FandolSong-Regular','NotoSerif']):
                    if 9<=tr['size']<=12.2:sizes[round(tr['size'],3)]+=len(tr['chars'])
        self.base=sizes.most_common(1)[0][0]
        self.scale=BODY/self.base

    def pagechars(self,page):
        self.pagefonts(page)
        chars=[]
        for tr in page.get_texttrace():
            if tr['type']==3:continue
            font=tr['font'];text=self.is_text(tr)
            sourcefont=self.pickfont(tr) if not text and font!='LatinModernMath-Regular' else None
            for uni,gid,origin,rect in tr['chars']:
                if uni==32:continue
                x,y=origin
                if y<58 or y>789:continue
                char=chr(uni)
                if text:
                    glyph=None;bounds=rect
                else:
                    if font=='LatinModernMath-Regular':name=LM_ORDER[gid];gs=LM_GLYPHS
                    else:
                        names,gs=sourcefont;name=names[gid]
                    glyph=target(name,font)
                    v=ink(gs,name);units=1000
                    if font=='LatinModernMath-Regular':units=LM['head'].unitsPerEm
                    bounds=(x+v[0]/units*tr['size'],y-v[3]/units*tr['size'],x+v[2]/units*tr['size'],y-v[1]/units*tr['size'])
                chars.append(dict(c=char,font=font,size=tr['size'],x=x,y=y,bbox=bounds,text=text,glyph=glyph))
        return chars

    def pagefonts(self,page):
        self.fonts={};self.cidfonts=set()
        for f in page.get_fonts():
            name=f[3].split('+')[-1].replace('-Identity-H','')
            if f[1]=='cid':self.cidfonts.add(name);continue
            cff=CFFFontSet();cff.decompile(io.BytesIO(self.doc.extract_font(f[0])[3]),None)
            top=cff[cff.fontNames[0]];self.fonts.setdefault(name,[]).append((top.charset,top.CharStrings))
            if len(name)>24:self.fonts[name[:24]]=self.fonts[name]

    def pickfont(self,tr):
        candidates=self.fonts.get(tr['font'],[])
        if len(candidates)==1 and tr['font'] not in self.cidfonts:return candidates[0]
        valid=[]
        for names,gs in candidates:
            if all(uni==32 or gid<len(names) and unicodedata.normalize('NFKC',toUnicode(names[gid]))==unicodedata.normalize('NFKC',chr(uni)) for uni,gid,*_ in tr['chars']):valid.append((names,gs))
        if valid:return valid[0]
        if tr['font'] in self.cidfonts:return None
        raise ValueError('Cannot disambiguate font '+tr['font'])

    def is_text(self,tr):
        font=tr['font']
        if font=='LatinModernMath-Regular':return False
        if font not in self.fonts:return True
        return self.pickfont(tr) is None

    def mathbox(self,chars,rules=(),baseline=None):
        if not chars:return ''
        scale=self.scale
        x0=min(c['x'] for c in chars)
        if baseline is None:baseline=collections.Counter(round(c['y'],2) for c in chars).most_common(1)[0][0]
        x1=max(c['bbox'][2] for c in chars)
        top=min(c['bbox'][1] for c in chars);bottom=max(c['bbox'][3] for c in chars)
        width=(x1-x0)*scale+0.5
        ht=max(0,(baseline-top)*scale)+.5;dp=max(0,(bottom-baseline)*scale)+.5
        tokens=[]
        for c in chars:
            size=fontsize(c['size'],self.base)
            x=(c['x']-x0)*scale;y=(baseline-c['y'])*scale
            if c['text']:
                tokens.append(f'\\RT{{{x:.3f}}}{{{y:.3f}}}{{{size:.4f}}}{{{escape(c["c"])}}}')
            else:
                family,slot,name,old=c['glyph']
                if family=='tex':
                    tokens.append(f'\\RS{{{x:.3f}}}{{{y:.3f}}}{{{size:.4f}}}{{{slot}}}')
                else:
                    if family=='ex':
                        # Extension fonts use a top-anchored TeX baseline; OpenType
                        # variants do not. Align actual ink, including matrix pieces.
                        tb=ink(CM[family][1],name)
                        desired=(c['bbox'][3]-c['bbox'][1])*scale
                        if tb[3]>tb[1]:size=desired*1000/(tb[3]-tb[1])
                        y=(baseline-c['bbox'][1])*scale-tb[3]*size/1000
                    tokens.append(f'\\RG{{{x:.3f}}}{{{y:.3f}}}{{{size:.4f}}}{{{family}}}{{{slot}}}')
                self.glyphs+=1
        for x,y,w,h in rules:
            tokens.append(f'\\RR{{{(x-x0)*scale:.3f}}}{{{(baseline-y)*scale:.3f}}}{{{w*scale:.3f}}}{{{max(.35,h*scale):.3f}}}')
        return f'\\RB{{{width:.3f}}}{{{ht:.3f}}}{{{dp:.3f}}}{{%\n'+''.join(tokens)+'%\n}'

    def prose(self,chars,rules=()):
        # Restore the original prose line baselines, attaching scripts to the
        # nearest baseline. XeLaTeX then reflows the resulting paragraph.
        anchors=collections.Counter(round(c['y'],2) for c in chars if c['text'] and c['size']>=self.base*.85)
        if not anchors:return '\\[\n'+self.mathbox(chars)+'\n\\]\n'
        buckets=[]
        for value in sorted(anchors):
            if buckets and value-buckets[-1][-1]<1.0:buckets[-1].append(value)
            else:buckets.append([value])
        ys=[sum(value*anchors[value] for value in bucket)/sum(anchors[value] for value in bucket) for bucket in buckets]
        lines={y:[] for y in ys}
        for c in chars:lines[min(ys,key=lambda y:abs(y-c['y']))].append(c)
        out=[]
        for y,line in lines.items():
            line.sort(key=lambda c:c['x']);parts=[];maths=[];last=None
            raw=''.join(c['c'] for c in line)
            for label in ['证明','解答','小结','解']:
                if not raw.startswith(label):continue
                following=raw[len(label):len(label)+1]
                if following in '与的':break
                if label=='解答':
                    line[0]=dict(line[0],c='解',text=True);line[1]=dict(line[1],c='：',text=True)
                elif following in '.。':line[len(label)]=dict(line[len(label)],c='：',text=True)
                elif following not in ':：':line.insert(len(label),dict(line[len(label)-1],c='：',text=True,x=line[len(label)-1]['x']+.01))
                break
            def flush():
                nonlocal maths
                if maths:
                    left=min(c['x'] for c in maths);right=max(c['bbox'][2] for c in maths)
                    rr=[r for r in rules if left-.6<=r[0] and r[0]+r[2]<=right+.6]
                    parts.append('\\allowbreak{}\\hskip.1em '+self.mathbox(maths,rr,baseline=y)+'\\hskip.1em\\allowbreak{} ');maths=[]
            for c in line:
                if c['text']:
                    flush()
                    if last and last['text']:
                        gap=c['x']-last['bbox'][2]
                        if gap>self.base*.18 and c['c'].isascii() and last['c'].isascii():parts.append(' ')
                    parts.append(escape(c['c']))
                else:maths.append(c)
                last=c
            flush();out.append(''.join(parts))
        s=''.join(out)
        s=re.sub(r'(证明|解|小结|总结)([.。])',r'\1：',s)
        self.count+=sum(1 for c in chars if c['text'])
        return s+'\n\n'

    def recover(self):
        output=[];seen_heading=False;pending=[];previous=None
        def flush():
            nonlocal pending
            if pending:output.append(''.join(pending)+'\n\n');pending=[]
        for page_index,page in enumerate(self.doc):
            chars=self.pagechars(page);n=len(chars);parents=list(range(n))
            def find(i):
                while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
                return i
            def union(i,j):
                a,b=find(i),find(j)
                if a!=b:parents[b]=a
            # Join complete horizontal bands using actual glyph ink. Tall matrix
            # delimiters connect their rows; fraction bars connect numerator and
            # denominator explicitly. This avoids splitting large operators from
            # their limits when a PDF reader reports separate text blocks.
            ordered=sorted(range(n),key=lambda i:chars[i]['bbox'][1]);active=[]
            for i in ordered:
                top=chars[i]['bbox'][1]
                active=[j for j in active if chars[j]['bbox'][3]+.7>=top]
                for j in active:union(i,j)
                active.append(i)
            for i,c in enumerate(chars):
                if not c['glyph'] or c['glyph'][0]!='ex' or not c['glyph'][2].startswith(('summation','product','union','intersection')):continue
                x0,y0,x1,y1=c['bbox']
                for j,other in enumerate(chars):
                    if not other['text'] and x0-5<=other['x']<=x1+5 and y0-self.base<=other['y']<=y1+self.base:union(i,j)
            vertical=[]
            for drawing in page.get_drawings():
                for item in drawing['items']:
                    if item[0]=='l':
                        a,b=item[1:3]
                        if abs(a.x-b.x)<.2:vertical.append((a.x,min(a.y,b.y),max(a.y,b.y)))
            rules=[]
            for drawing in page.get_drawings():
                r=drawing['rect']
                if r.width>page.rect.width*.8 or r.y0<58 or r.y1>789:continue
                for item in drawing['items']:
                    if item[0]!='l':continue
                    a,b=item[1:3]
                    if abs(a.y-b.y)>.2:continue
                    x,y,w,h=min(a.x,b.x),a.y,abs(a.x-b.x),drawing['width'] or .4
                    # Omit decorative boxed-answer borders, as in the approved
                    # reference. Keep the actual fraction/radical rules.
                    left=any(abs(vx-x)<.6 and min(abs(y-v0),abs(y-v1))<.6 for vx,v0,v1 in vertical)
                    right=any(abs(vx-x-w)<.6 and min(abs(y-v0),abs(y-v1))<.6 for vx,v0,v1 in vertical)
                    if left and right:continue
                    near=[i for i,c in enumerate(chars) if c['x']>=x-.5 and c['x']<=x+w+.5 and abs(c['y']-y)<self.base*1.3]
                    if near:
                        for j in near[1:]:union(near[0],j)
                        rules.append((near[0],(x,y,w,h)))
            groups={}
            for i,c in enumerate(chars):groups.setdefault(find(i),dict(chars=[],rules=[]))['chars'].append(c)
            for i,rule in rules:groups[find(i)]['rules'].append(rule)
            separated=[]
            for g in groups.values():
                cs=g['chars'];cjk=[c['y'] for c in cs if c['text'] and '\u3400'<=c['c']<='\u9fff']
                delimiter=any(c['glyph'] and c['glyph'][0]=='ex' and c['glyph'][2].startswith(('paren','brace','bracket','floor','ceiling')) for c in cs)
                if not cjk or max(cjk)-min(cjk)>1 or g['rules'] or delimiter:
                    separated.append(g);continue
                baseline=sum(cjk)/len(cjk);extra=collections.Counter(round(c['y']) for c in cs if not c['text'] and c['size']>=self.base*.88 and c['glyph'][0]!='ex' and abs(c['y']-baseline)>self.base*.85)
                extra=[float(y) for y,count in extra.items() if count>=3]
                if not extra:separated.append(g);continue
                anchors=[baseline]+extra;parts=[[] for _ in anchors]
                for c in cs:parts[min(range(len(anchors)),key=lambda i:abs(c['y']-anchors[i]))].append(c)
                separated.extend(dict(chars=part,rules=[]) for part in parts if part)
            bands=[]
            for g in separated:
                cs=g['chars'];cs.sort(key=lambda c:(round(c['y'],1),c['x']))
                raw=''.join(c['c'] for c in cs)
                ys=collections.Counter(round(c['y'],1) for c in cs if c['text'] and '\u3400'<=c['c']<='\u9fff' and c['size']>=self.base*.85)
                g.update(raw=raw,y0=min(c['bbox'][1] for c in cs),y1=max(c['bbox'][3] for c in cs),anchors=len(ys))
                if re.search(r'20\d{2}[AS]\d{2}',raw) and len(raw)<100 and all(('Bold' in c['font'] or 'Hei' in c['font'] or c['size']>=self.base*1.08) for c in cs):g['kind']='heading'
                elif any(c['size']>self.base*1.3 for c in cs):g['kind']='title'
                elif ys:
                    delimiter=any(c['glyph'] and c['glyph'][0]=='ex' and c['glyph'][2].startswith(('paren','brace','bracket','floor','ceiling')) for c in cs)
                    baseline=next(iter(ys))
                    displaced=any(not c['text'] and c['size']>=self.base*.88 and c['glyph'][0]!='ex' and abs(c['y']-baseline)>self.base*.85 for c in cs)
                    g['kind']='prose' if len(ys)==1 and not (delimiter and displaced) else 'mixed'
                else:g['kind']='formula'
                bands.append(g)
            bands.sort(key=lambda g:g['y0'])
            merged=[]
            for g in bands:
                if merged and g['kind']=='formula' and merged[-1]['kind']=='formula' and g['y0']-merged[-1]['y1']<self.base*1.2:
                    merged[-1]['chars']+=g['chars'];merged[-1]['rules']+=g['rules'];merged[-1]['y1']=g['y1']
                else:merged.append(g)
            flush();output.append(f'% Original page {page_index+1}.\n');previous=None
            for g in merged:
                kind=g['kind'];cs=g['chars']
                if kind=='title':continue
                if kind=='prose':
                    # Only single-baseline prose is reflowed. Multi-line inline
                    # matrices stay intact as one TeX box.
                    if previous and (g['y0']-previous['y1']>self.base*.75 or min(c['x'] for c in cs)-min(c['x'] for c in previous['chars'])>self.base*1.4 or re.match(r'^(证明|解|小结|记号)',g['raw'])):flush()
                    text=self.prose(cs,g['rules']).strip()
                    # A proof label followed by an extracted ASCII period is
                    # restored before TeX fragments are emitted below.
                    pending.append(text);previous=g
                    continue
                flush();previous=None
                if kind=='heading':
                    seen_heading=True;output.append('\\section*{'+escape(g['raw'].replace('问题',''))+'}\n')
                else:
                    box=self.mathbox(cs,g['rules'])
                    output.append(('\\noindent ' if kind=='mixed' else '\\[\n')+box+('\n\n' if kind=='mixed' else '\n\\]\n'))
            flush()
        return ''.join(output)

PREAMBLE=r'''% Recovered from the previously completed PDF; no new mathematical content.
% Prose is editable; formula boxes retain original symbol positions.
% Build from repository root: xelatex -no-shell-escape -halt-on-error -output-directory=... print/fudan/NAME.tex
\documentclass[11pt,a4paper]{article}
\usepackage[margin=23mm,headheight=14pt,headsep=8.5mm,footskip=10mm]{geometry}
\usepackage{amsmath,amssymb}
\DeclareMathAlphabet{\mathsf}{OT1}{cmss}{m}{n}
\usepackage[no-math]{fontspec}
\usepackage{xeCJK}
\setmainfont{Latin Modern Roman}
\setCJKmainfont{FandolSong-Regular.otf}[Path=assets/fonts/fandol/,BoldFont=FandolSong-Bold.otf,ItalicFont=FandolSong-Regular.otf,Script=CustomDefault]
\xeCJKsetup{PunctStyle=quanjiao,CheckSingle=true}
\usepackage{setspace}\setstretch{1.12}
\setlength{\parindent}{2em}\setlength{\parskip}{3pt}
\emergencystretch=6em
\hfuzz=9pt
\usepackage{titlesec}
\titleformat{\section}{\centering\normalfont\Large\bfseries}{}{0pt}{}
\titlespacing*{\section}{0pt}{1.8\baselineskip}{1.0\baselineskip}
\usepackage{fancyhdr}\pagestyle{fancy}\fancyhf{}
\fancyhead[L]{\small 数学手记·高等代数}\fancyhead[R]{\small BATCHLABEL}
\fancyfoot[C]{\thepage}\renewcommand{\headrulewidth}{0.4pt}
\usepackage[hidelinks,unicode]{hyperref}
\hypersetup{pdftitle={BATCHLABEL：题目、解答与小结},pdfauthor={Vincent Arqain}}
\newcommand{\RB}[4]{\raisebox{0pt}[#2bp][#3bp]{\hbox to #1bp{#4\hss}}}
\newcommand{\RG}[5]{\hbox to 0pt{\kern#1bp\raisebox{#2bp}[0pt][0pt]{\fontsize{#3bp}{#3bp}\csname font#4\endcsname\char#5}\hss}}
\newcommand{\RT}[4]{\hbox to 0pt{\kern#1bp\raisebox{#2bp}[0pt][0pt]{\fontsize{#3bp}{#3bp}\selectfont#4}\hss}}
\newcommand{\RS}[4]{\hbox to 0pt{\kern#1bp\raisebox{#2bp}[0pt][0pt]{\fontsize{#3bp}{#3bp}\selectfont\ensuremath{#4}}\hss}}
\newcommand{\RR}[4]{\hbox to 0pt{\kern#1bp\raisebox{#2bp}[0pt][0pt]{\rule{#3bp}{#4bp}}\hss}}
FONTDEFINITIONS
\widowpenalty=10000\clubpenalty=10000\raggedbottom
\begin{document}
\begin{center}{\LARGE\bfseries BATCHLABEL\par}\vspace{8pt}复旦大学高等代数习题集·题目与解答\end{center}
'''

def main():
    inventory=json.loads(pathlib.Path(sys.argv[1]).read_text());out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
    defs='\n'.join('\\newcommand{\\font'+k+'}{\\usefont{'+enc+'}{'+family+'}{'+series+'}{'+shape+'}}' for k,(_,enc,family,series,shape) in FAMILIES.items())
    report=[]
    for item in inventory:
        if not item['restyled']:continue
        r=Recovery(item['source']);body=r.recover()
        preamble=PREAMBLE.replace('BATCHLABEL',escape(item['label'])).replace('FONTDEFINITIONS',defs)
        if item.get('texSource'):
            original=pathlib.Path(item['texSource']).read_text()
            body=original.split('\\begin{document}',1)[1].split('\\end{document}',1)[0]
            body=re.sub(r'\\textbf\{([^{}]*)\}',r'{\1}',body)
            body=body.replace('\\boxed','')
            body=body.replace('当 $n=1$ 时结论显然成立。','当 $n=1$ 时，$X$ 是一阶矩阵，因而对称。')
            operators='\n'.join(re.findall(r'^\\DeclareMathOperator[^\n]+',original,re.M))
            commands=r'''\newcounter{fudanquestion}
\newcommand{\question}[1]{\stepcounter{fudanquestion}\section*{#1}}
\newcommand{\sol}{\par\noindent 解：\ }
\newcommand{\method}{\par\noindent 方法提炼：\ }
\newcommand{\sourcepage}[1]{\par\noindent{\small 题目来源：谢启鸿《复旦大学高等代数习题集（2023 版）》，第 #1 页。}}
\newcommand{\proofend}{\hfill$\square$\par}
\newcommand{\id}{I_n}
'''
            preamble=preamble.replace('\\begin{document}',operators+'\n'+commands+'\n\\begin{document}')
        tex=preamble+body+'\n\\end{document}\n'
        targetpath=out/(item['slug']+'.tex');targetpath.write_text(tex)
        report.append(dict(name=item['originalName'],sourcePages=len(r.doc),bodySize=r.base,textCharacters=r.count,mathGlyphs=r.glyphs,tex=str(targetpath)))
        print(item['slug'],r.count,r.glyphs,flush=True)
    (out/'recovery-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
