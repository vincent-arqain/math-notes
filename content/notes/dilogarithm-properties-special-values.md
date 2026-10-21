---
title: "二对数函数 Li₂：性质、特殊值与级数求和"
description: "从幂级数到负实轴积分延拓，证明四个函数方程，计算半点与黄金分割特殊值，并以调和数级数、对数积分和严格余项界串联计算方法。"
attachment: "notes/dilogarithm-properties-special-values.pdf"
subject: "数学分析"
tags: [二对数函数, Li2, dilogarithm, 特殊函数, 特殊值, Euler型级数, 调和数, 无穷级数, 积分表示, 渐近分析]
created_at: "2026-10-21"
updated_at: "2026-10-21"
---

本文由《Li2_性质与特殊值汇总》校订整理，保留原有特殊值计算与方法总结，补全实轴延拓、函数方程的证明和渐近余项说明。所有变量均为实数，所有对数均为自然对数。本文讨论的函数定义在 $(-\infty,1]$ 上，不涉及 $x>1$ 或复平面上的分支选择。

与本文配套的 [Euler 型级数讲义](/notes/890e1516e64e21a2fb2248b4/) 系统讨论换序、调和数生成函数与多重 Zeta 值；本文把其中最常用的二对数函数单独展开。网页与所附校订 PDF 使用相同的公式编号。

目录：

1. [定义与基本性质](#定义与基本性质)
2. [四个基本函数方程](#四个基本函数方程)
3. [特殊值及其计算方法](#特殊值及其计算方法)
4. [Euler 型级数与对数积分](#euler-型级数与对数积分)
5. [数值计算与渐近展开](#数值计算与渐近展开)
6. [方法总结与参考](#方法总结与参考)

## 定义与基本性质

### 幂级数的收敛范围

对 $|x|\leqslant1$，定义

$$
\operatorname{Li}_2(x)=\sum_{n=1}^{\infty}\frac{x^n}{n^2}.
$$

因为 $|x^n/n^2|\leqslant1/n^2$，该级数在 $[-1,1]$ 上一致绝对收敛，故其和函数连续。若 $|x|>1$，通项不趋于零，级数发散；特别是不能用这个级数直接定义 $x<-1$ 时的值。

在 $|x|<1$ 内，对 $-\log(1-x)=\sum_{n\geqslant1}x^n/n$ 除以 $x$，再在从 $0$ 到 $x$ 的紧区间上逐项积分，得到积分表示。这里的一致收敛只用在收敛区间内部。

### 积分延拓与端点

对任意 $x<1$，用下式将函数延拓到整个负实轴：

$$
\operatorname{Li}_2(x)=-\int_0^x\frac{\log(1-t)}t\,\mathrm dt.
$$

积分核 $-\log(1-t)/t$ 在 $t=0$ 处的连续延拓值为 $1$，所以跨过零点没有奇性；当 $x<0$ 时，积分按通常的有向积分理解。该定义与幂级数在 $(-1,1)$ 内一致，在 $x=-1$ 处由连续性一致。对于 $x=-a<0$，也可写成

$$
\operatorname{Li}_2(-a)=-\int_0^a\frac{\log(1+u)}u\,\mathrm du,
\qquad a>0.
$$

当 $x\uparrow1$ 时，积分中的对数奇性可积：在 $[1/2,1)$ 上，$1/t\leqslant2$，而 $-\log(1-t)$ 可积。因此积分定义连续延伸到 $x=1$，并与一致收敛的级数定义相同。于是

$$
\operatorname{Li}_2(0)=0,\qquad
\operatorname{Li}_2(1)=\zeta(2)=\frac{\pi^2}{6},\qquad
\operatorname{Li}_2(-1)=-\frac{\pi^2}{12}.
$$

最后一个等式由绝对收敛级数的奇偶分组得到：$\sum(-1)^n/n^2=2\sum(2n)^{-2}-\zeta(2)=-\zeta(2)/2$。所用的 Basel 求和值 $\zeta(2)=\pi^2/6$，可见 [Euler 讲义的附录证明](/notes/890e1516e64e21a2fb2248b4/#计算二次特殊值)。

### 导数、单调性与凸性

由微积分基本定理，对 $x<1$、$x\ne0$，

$$
\operatorname{Li}_2'(x)=-\frac{\log(1-x)}x,
\qquad
\operatorname{Li}_2''(x)=\frac{x/(1-x)+\log(1-x)}{x^2}.
$$

在零点由幂级数得到 $\operatorname{Li}_2'(0)=1$、$\operatorname{Li}_2''(0)=1/2$。更统一的表达式是

$$
\operatorname{Li}_2'(x)=\int_0^1\frac{\mathrm du}{1-xu}>0,
\qquad
\operatorname{Li}_2''(x)=\int_0^1\frac{u\,\mathrm du}{(1-xu)^2}>0,
\qquad x<1.
$$

第一个积分可直接计算；第二个由对第一个积分求导得到。在任一固定的 $x<1$ 的小闭邻域内，分母一致远离零，因而该求导合法。故函数在 $(-\infty,1)$ 上严格递增、严格凸。导数公式不包含端点 $x=1$；事实上 $\operatorname{Li}_2'(x)\to+\infty$，差商的平均值表达式也说明 $x=1$ 处没有有限左导数。

## 四个基本函数方程

### Euler 反射公式

对 $0<x<1$，有

$$
\operatorname{Li}_2(x)+\operatorname{Li}_2(1-x)
=\frac{\pi^2}{6}-\log x\log(1-x).
\qquad\text{(1)}
$$

证明：令 $F(x)=\operatorname{Li}_2(x)+\operatorname{Li}_2(1-x)+\log x\log(1-x)$，则

$$
F'(x)=-\frac{\log(1-x)}x+\frac{\log x}{1-x}
+\frac{\log(1-x)}x-\frac{\log x}{1-x}=0.
$$

由端点连续性及 $\log x\log(1-x)=O(x|\log x|)\to0$，令 $x\downarrow0$ 即知常数为 $\pi^2/6$。式 (1) 在端点只按极限解释，不能把 $\log0$ 当作实数代入。

### Landen 变换公式

对所有 $x<1$，有

$$
\operatorname{Li}_2(x)+\operatorname{Li}_2\!\left(\frac{x}{x-1}\right)
=-\frac12\log^2(1-x).
\qquad\text{(2)}
$$

证明：记 $y=x/(x-1)$。因为 $1-y=1/(1-x)>0$，所以 $y<1$，两个函数值均在积分定义域内。令左端加上 $\tfrac12\log^2(1-x)$ 为 $G(x)$。对 $x\ne0$，链式法则给出

$$
G'(x)=-\frac{\log(1-x)}x
+\frac{\log(1-x)}{x(1-x)}
-\frac{\log(1-x)}{1-x}=0.
$$

因此 $G$ 在 $(-\infty,0)$ 和 $(0,1)$ 上分别为常数。它在零点连续，且 $G(0)=0$，故两个常数均为零。式 (2) 包含 $x=0$。

### 倍角公式

对 $|x|\leqslant1$，有

$$
\operatorname{Li}_2(x)+\operatorname{Li}_2(-x)
=\frac12\operatorname{Li}_2(x^2).
\qquad\text{(3)}
$$

证明：绝对收敛允许逐项相加并取偶数项，故

$$
\sum_{n=1}^{\infty}\frac{x^n+(-x)^n}{n^2}
=2\sum_{k=1}^{\infty}\frac{x^{2k}}{(2k)^2}
=\frac12\operatorname{Li}_2(x^2).
$$

这个证明包含 $x=\pm1$。本文不把式 (3) 延伸到 $|x|>1$，因为那时 $x^2>1$ 已超出本文的实值定义域。

### 负实轴反演公式

对 $a>0$，有

$$
\operatorname{Li}_2(-a)+\operatorname{Li}_2(-1/a)
=-\frac{\pi^2}{6}-\frac12\log^2a.
\qquad\text{(4)}
$$

证明：令左端加上 $\tfrac12\log^2a$ 为 $J(a)$，则

$$
J'(a)=\frac{-\log(1+a)+\log(1+1/a)+\log a}{a}=0,
$$

其中使用 $1+1/a=(1+a)/a$ 和实对数的乘法公式。取 $a=1$，得到 $J(1)=2\operatorname{Li}_2(-1)=-\pi^2/6$。这里两个自变量始终为负数，任意大小的 $a>0$ 均可使用积分延拓。

## 特殊值及其计算方法

### 半点的特殊值

在式 (1) 中取 $x=1/2$，即得

$$
\operatorname{Li}_2\!\left(\frac12\right)
=\frac{\pi^2}{12}-\frac12\log^22.
\qquad\text{(5)}
$$

这一步的关键是反射后自变量不变，从而原来的两个函数值合并为一个未知量。

### 黄金分割比对应的特殊值

令 $\varphi=(1+\sqrt5)/2$、$t=\varphi^{-1}$、$L=\log\varphi$。有 $1-t=t^2$、$\log t=-L$。记

$$
A=\operatorname{Li}_2(t),\quad B=\operatorname{Li}_2(t^2),\quad
C=\operatorname{Li}_2(-t),\quad D=\operatorname{Li}_2(-\varphi).
$$

由于 $0<t<1$，式 (1)、(3)、(2)、(4) 分别给出

$$
\begin{aligned}
A+B&=\frac{\pi^2}{6}-2L^2,\\
A+C&=\frac12B,\\
A+D&=-2L^2,\\
C+D&=-\frac{\pi^2}{6}-\frac12L^2.
\end{aligned}
$$

第三式使用 $t/(t-1)=-1/t=-\varphi$；第四式取 $a=\varphi$。消去 $C,D$ 得 $4A-B=\pi^2/3-3L^2$。与第一式联立，得到

$$
\begin{aligned}
\operatorname{Li}_2\!\left(\frac{\sqrt5-1}{2}\right)
&=\frac{\pi^2}{10}-\log^2\varphi,\\
\operatorname{Li}_2\!\left(\frac{3-\sqrt5}{2}\right)
&=\frac{\pi^2}{15}-\log^2\varphi.
\end{aligned}
$$

再由 $C=B/2-A$、$D=-2L^2-A$，得

$$
\operatorname{Li}_2(-\varphi^{-1})=-\frac{\pi^2}{15}+\frac12\log^2\varphi,
\qquad
\operatorname{Li}_2(-\varphi)=-\frac{\pi^2}{10}-\log^2\varphi.
$$

这里并没有把 $-\varphi<-1$ 代入发散的幂级数；该值来自积分延拓和已经证明的函数方程。

### 有理自变量之间的关系

对一般有理自变量，本讲义不保证其值能单独化成 $\pi^2$ 与对数的简单组合。但可以证明多个值之间的恒等式，例如

$$
\operatorname{Li}_2\!\left(\frac14\right)
+2\operatorname{Li}_2\!\left(\frac13\right)
=\frac{\pi^2}{6}-\log^22-\log^2\!\frac32.
\qquad\text{(6)}
$$

证明：式 (3) 取 $x=1/2$，式 (2) 取 $x=-1/2$，分别得到

$$
\begin{aligned}
\operatorname{Li}_2(1/2)+\operatorname{Li}_2(-1/2)
&=\frac12\operatorname{Li}_2(1/4),\\
\operatorname{Li}_2(-1/2)+\operatorname{Li}_2(1/3)
&=-\frac12\log^2\!\frac32.
\end{aligned}
$$

消去 $\operatorname{Li}_2(-1/2)$ 并代入式 (5)，即得式 (6)。同时保留有用的关系

$$
\operatorname{Li}_2(-1/2)=-\operatorname{Li}_2(1/3)-\frac12\log^2\!\frac32.
$$

这条具体恒等式只需倍角与 Landen 公式，无需引入 Abel 五项关系。

## Euler 型级数与对数积分

### 调和数生成函数与求和

记 $H_n=\sum_{k=1}^n1/k$。对 $|x|<1$，双重级数绝对收敛，因为令 $r=|x|$ 有

$$
\sum_{n=1}^{\infty}\sum_{k=1}^n\frac{r^n}{k}
=\frac1{1-r}\sum_{k=1}^{\infty}\frac{r^k}{k}<\infty.
$$

右端可先由非负项换序得到，再据其有限性判断绝对收敛。因此对一般实数 $|x|<1$，换序合法，且

$$
\sum_{n=1}^{\infty}H_nx^n=-\frac{\log(1-x)}{1-x}.
$$

在收敛区间内部，除以 $x$ 后的级数在零点也连续，并可逐项积分。利用 $1/[x(1-x)]=1/x+1/(1-x)$，得到

$$
\sum_{n=1}^{\infty}\frac{H_n}{n}x^n
=\operatorname{Li}_2(x)+\frac12\log^2(1-x),
\qquad |x|<1.
\qquad\text{(7)}
$$

在式 (7) 中取 $x=1/2$，再用式 (5)，两个对数平方项抵消，故

$$
\sum_{n=1}^{\infty}\frac{H_n}{n\,2^n}=\frac{\pi^2}{12}.
$$

注意分母是 $n\,2^n$，并非 $n^2$。若在式 (7) 两边再除以 $x$，并在 $(0,1)$ 上积分，非负项逐项积分给出

$$
\sum_{n=1}^{\infty}\frac{H_n}{n^2}
=\zeta(3)+\frac12\int_0^1\frac{\log^2(1-x)}x\,\mathrm dx
=2\zeta(3).
$$

第一项由 $\operatorname{Li}_2(x)/x$ 的非负幂级数积分得到。对第二项作 $u=1-x$，再以非负几何级数展开 $1/(1-u)$，使用

$$
\int_0^1u^j\log^2u\,\mathrm du=\frac{2}{(j+1)^3}
$$

即可得到积分等于 $2\zeta(3)$；此矩积分由 $u=e^{-v}$ 和两次分部积分得出。上述步骤同时证明积分有限。更系统的推导与例题见 [Euler 讲义的生成函数章节](/notes/890e1516e64e21a2fb2248b4/#生成函数与除以指标) 及 [三次权基本 Euler 和](/notes/890e1516e64e21a2fb2248b4/#例-4严格计算三次权的基本-euler-和)。式 (7) 的端点不能不经收敛性分析就直接代入。

### 两个典型对数积分

解：由积分定义和已求出的特殊值，

$$
\begin{aligned}
\int_0^1\frac{\log(1+x)}x\,\mathrm dx
&=-\operatorname{Li}_2(-1)=\frac{\pi^2}{12},\\
\int_0^{1/2}\frac{\log(1-x)}x\,\mathrm dx
&=-\operatorname{Li}_2(1/2)=-\frac{\pi^2}{12}+\frac12\log^22.
\end{aligned}
$$

零点处两个被积函数的极限分别为 $1$ 和 $-1$，故不存在不可积奇性。遇到“对数除以自变量”的积分，先检查是否可以直接识别为二对数函数的差值。

## 数值计算与渐近展开

### 截断误差与自变量约化

对 $0\leqslant r<1$ 及整数 $N\geqslant0$，有

$$
0\leqslant\operatorname{Li}_2(r)-\sum_{n=1}^N\frac{r^n}{n^2}
\leqslant\frac{r^{N+1}}{(N+1)^2(1-r)}.
\qquad\text{(8)}
$$

证明：余项的每个分母均不小于 $(N+1)^2$，再求几何尾和即可。对 $|x|<1$，绝对误差也被式 (8) 中取 $r=|x|$ 的右端控制；端点 $r=1$ 不使用这个界。

实际计算可按以下步骤将级数参数约化到 $[0,1/2]$。

1. $0\leqslant x\leqslant1/2$：直接用级数和式 (8)。
2. $1/2<x<1$：用式 (1) 化为 $1-x$。
3. $-1\leqslant x<0$：用式 (2) 化为 $x/(x-1)\in(0,1/2]$。
4. $x<-1$：令 $a=-x>1$，先用式 (4) 化为 $-1/a\in(-1,0)$，再用上一步。
5. $x=1$：直接使用 $\pi^2/6$。

这个余项界控制的是截断误差；用浮点数计算对数、平方和相减时，还应保留足够精度，不能将截断界误当作全部舍入误差的界。

### 零点附近

原级数直接给出

$$
\operatorname{Li}_2(x)=x+\frac{x^2}{4}+\frac{x^3}{9}+O(x^4),
\qquad x\to0.
$$

由式 (8) 的绝对值版本，对 $|x|\leqslant1/2$，前三项之后的余项绝对值不超过 $|x|^4/[16(1-|x|)]\leqslant|x|^4/8$，故这里的大 $O$ 是双侧且一致的。

### 正端点附近

对 $\varepsilon\downarrow0$，式 (1) 给出

$$
\operatorname{Li}_2(1-\varepsilon)
=\frac{\pi^2}{6}+\varepsilon\log\varepsilon-\varepsilon
+O\!\left(\varepsilon^2|\log\varepsilon|\right).
$$

证明：在 $0<\varepsilon\leqslant1/2$ 上，

$$
|\operatorname{Li}_2(\varepsilon)-\varepsilon|\leqslant\frac{\varepsilon^2}{2},
\qquad
|\log(1-\varepsilon)+\varepsilon|\leqslant\varepsilon^2.
$$

第一式来自式 (8)，第二式来自对数幂级数的尾和估计。代入反射公式，所得余项 $R(\varepsilon)$ 满足

$$
|R(\varepsilon)|\leqslant\varepsilon^2\left(|\log\varepsilon|+\frac12\right).
$$

这既证明原来的渐近式，也解释了为什么主修正项含 $\varepsilon\log\varepsilon$，不能假设函数在 $x=1$ 处有通常的 Taylor 展开。

### 负实轴无穷远处

由式 (4) 与零点展开，当 $a\to+\infty$ 时，

$$
\operatorname{Li}_2(-a)
=-\frac12\log^2a-\frac{\pi^2}{6}
+\frac1a-\frac1{4a^2}+O(a^{-3}).
$$

具体地，$a\geqslant2$ 时，最后余项的绝对值不超过 $1/[9a^3(1-1/a)]$。因此原讲义的较粗形式

$$
\operatorname{Li}_2(-a)=-\frac12\log^2a-\frac{\pi^2}{6}+O(1/a)
$$

同样成立。这里是在小参数 $-1/a$ 处使用收敛级数，再借反演公式返回 $-a$，并非在收敛区间外形式地展开。

## 方法总结与参考

特殊值计算的基本路径是：先寻找自变量之间的代数关系，再通过反射、Landen、倍角与反演公式建立方程组。求和时，分母中的 $n$ 对应对生成函数作一次“除以自变量再积分”；带调和数的级数因此自然联系到二对数函数。

计算前先核对定义域，换序前先证明绝对收敛或非负性，取端点前先给出极限依据。若不能得到简单闭式，就把自变量约化到较小区间，并用式 (8) 控制截断误差。数值核对可以发现错误，但不能替代这些证明。

公式按本次文章的引用顺序统一编号。本次校订补全了实轴定义与所有上述推导，核心特殊值未改变。

参考：[NIST DLMF §25.12(i)](https://dlmf.nist.gov/25.12#i) 的式 25.12.1—25.12.6 可用于核对二对数的标准定义与连接公式。本文仅使用其对应的实轴情形，并在文内给出证明；进一步的级数方法见 [Euler 型级数讲义](/notes/890e1516e64e21a2fb2248b4/)。
