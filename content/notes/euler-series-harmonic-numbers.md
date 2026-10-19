---
title: "Euler 型级数：调和数、积分表示与求和技巧"
description: "从一个望远镜恒等式出发，严格建立 Euler 和的收敛判据、生成函数与积分表示，推导线性 Euler 和的降阶公式，并以移位、交错及非线性例题说明方法选择。"
subject: "数学分析"
tags: [Euler型级数, 调和数, 无穷级数, 交换求和, 生成函数, 积分表示, 多重Zeta值, 渐近分析]
created_at: "2026-10-19"
updated_at: "2026-10-19"
---

调和数把有限求和嵌入无穷级数，使一个看似单重的级数具有多重求和结构。计算这类级数的关键，是选择合适的表示，并说明表示之间的转换为何成立。本文通过典型恒等式与完整例题，建立这些表示之间的联系。

预备知识为数项级数、幂级数、反常积分，以及非负函数的单调收敛定理和可积控制下的控制收敛定理。文中所有对数均为自然对数；实变量上的多重对数只在明确指定的实区间使用。

目录：

1. [定义与收敛性](#定义与收敛性)
2. [交换运算的依据](#交换运算的依据)
3. [交换求和与望远镜结构](#交换求和与望远镜结构)
4. [生成函数与除以指标](#生成函数与除以指标)
5. [积分表示与分部积分](#积分表示与分部积分)
6. [端点与交错级数](#端点与交错级数)
7. [多重求和与线性降阶公式](#多重求和与线性降阶公式)
8. [非线性例题与离散分部求和](#非线性例题与离散分部求和)
9. [余项估计与渐近联系](#余项估计与渐近联系)
10. [方法选择与易错点](#方法选择与易错点)
11. [附录：两个偶数特殊值](#附录两个偶数特殊值)

## 定义与收敛性

### 调和数与 Euler 和

对整数 $n,p\geqslant1$，定义

$$
H_n^{(p)}=\sum_{k=1}^{n}\frac1{k^p},
\qquad H_n=H_n^{(1)},
\qquad H_0^{(p)}=0.
$$

对实数 $s>1$，记

$$
\zeta(s)=\sum_{n=1}^{\infty}\frac1{n^s}.
$$

本文所说的 Euler 型级数，主要包括

$$
S_{p_1,\ldots,p_r;q}
=\sum_{n=1}^{\infty}
\frac{H_n^{(p_1)}\cdots H_n^{(p_r)}}{n^q},
$$

以及含交错符号、几何因子或移位分母的变体。这里 $r\geqslant1$，各 $p_j$ 为正整数，$q$ 在讨论收敛性时可为实数。$r=1$ 时称为线性 Euler 和，简记为 $S_{p,q}$；$r\geqslant2$ 时称为非线性 Euler 和。当 $q$ 也为正整数时，称 $p_1+\cdots+p_r+q$ 为权。权是整理恒等式的线索，本身不保证存在某种特定闭式。

这与 Euler–Maclaurin 公式是不同的概念：前者是一类级数，后者是比较求和与积分、提取渐近项的工具。

### 正项 Euler 和的收敛判据

命题 1：上述正项级数 $S_{p_1,\ldots,p_r;q}$ 收敛，当且仅当 $q>1$。

证明：积分比较给出

$$
\log(n+1)\leqslant H_n\leqslant1+\log n.
$$

若 $p>1$，则

$$
1\leqslant H_n^{(p)}\leqslant\zeta(p)<\infty.
$$

设 $p_1,\ldots,p_r$ 中恰有 $m$ 个等于 $1$。存在不依赖于 $n$ 的常数 $C>0$，使

$$
1\leqslant H_n^{(p_1)}\cdots H_n^{(p_r)}
\leqslant C(1+\log n)^m.
$$

当 $q>1$ 时，令 $t=\log x$，可得

$$
\int_1^\infty\frac{(1+\log x)^m}{x^q}\,\mathrm dx
=\int_0^\infty(1+t)^m e^{-(q-1)t}\,\mathrm dt<\infty.
$$

被积函数在充分大的 $x$ 上单调下降，积分判别法与比较判别法说明原级数收敛。当 $q\leqslant1$ 时，每项不小于 $n^{-q}$，故发散。证明完毕。

因此，后文含 $H_n/n^2$、$H_n/n^3$ 的级数均绝对收敛；而交错级数 $\sum(-1)^{n-1}H_n/n$ 必须另行判断，不能套用绝对收敛的换序规则。

## 交换运算的依据

本文反复使用下列事实，每次使用时还会核对具体条件。

1. 非负项换序：若 $a_{n,k}\geqslant0$，则两个迭代和相等，允许共同取值 $+\infty$。有限性要另外证明。这是计数测度下的 Tonelli 定理，也可由有限矩形部分和的上确界证明。
2. 绝对收敛换序：若 $\sum_{n,k}|a_{n,k}|<\infty$，则任意迭代求和、重排和分组均保持和值。
3. 非负项逐项积分：若 $f_n\geqslant0$ 可测，则 $\int\sum f_n=\sum\int f_n$，仍允许为 $+\infty$。若 $\sum\int|f_n|<\infty$，也可对有符号项逐项积分。
4. 幂级数内部运算：在收敛圆内的每个紧子区间上，幂级数一致绝对收敛，可以逐项积分；逐项求导须在收敛圆内部进行。
5. 端点与反常积分：先在截断区间上运算，再用单调收敛、控制收敛或明确的余项估计取极限。分部积分必须同时检查两端的边界项和所产生积分的收敛性。

前两条的区别尤其重要：非负性允许先换序再判断是否有限；有正负号时，条件收敛通常不足以支持任意换序。

## 交换求和与望远镜结构

### 例 1：一个可推广的入门恒等式

对任意整数 $p\geqslant1$，证明

$$
\sum_{n=1}^{\infty}\frac{H_n^{(p)}}{n(n+1)}
=\zeta(p+1).
$$

证明：各项非负，故可交换求和顺序。利用

$$
\frac1{n(n+1)}=\frac1n-\frac1{n+1},
$$

有

$$
\begin{aligned}
\sum_{n=1}^{\infty}\frac{H_n^{(p)}}{n(n+1)}
&=\sum_{k=1}^{\infty}\frac1{k^p}
  \sum_{n=k}^{\infty}\left(\frac1n-\frac1{n+1}\right)\\
&=\sum_{k=1}^{\infty}\frac1{k^{p+1}}
=\zeta(p+1)<\infty.
\end{aligned}
$$

这也同时证明了原级数的收敛性。证明完毕。

有限和版本更精确：直接在三角形区域 $1\leqslant k\leqslant n\leqslant N$ 上换序，得到

$$
\sum_{n=1}^{N}\frac{H_n^{(p)}}{n(n+1)}
=H_N^{(p+1)}-\frac{H_N^{(p)}}{N+1}.
$$

由于 $H_N^{(p)}\leqslant1+\log N$，最后一项趋于零。特别地，

$$
\sum_{n=1}^{\infty}\frac{H_n}{n(n+1)}
=\zeta(2)=\frac{\pi^2}{6},
$$

其中 $\zeta(2)$ 的特殊值在附录中证明。

本例的关键是先把 $H_n^{(p)}$ 展开，再让外层分母的尾和产生一个新的 $1/k$。

### 例 2：移位分母不必逐项做复杂分式分解

设 $m$ 为正整数，计算

$$
T_m=\sum_{n=1}^{\infty}\frac{H_n}{n(n+m)}.
$$

解：正项换序及望远镜求和给出

$$
\begin{aligned}
T_m
&=\sum_{k=1}^{\infty}\frac1k
  \sum_{n=k}^{\infty}\frac1{n(n+m)}\\
&=\frac1m\sum_{j=0}^{m-1}
  \sum_{k=1}^{\infty}\frac1{k(k+j)}.
\end{aligned}
$$

当 $j=0$ 时，内和为 $\zeta(2)$；当 $j\geqslant1$ 时，

$$
\sum_{k=1}^{\infty}\frac1{k(k+j)}
=\frac1j\sum_{k=1}^{\infty}
\left(\frac1k-\frac1{k+j}\right)
=\frac{H_j}{j}.
$$

因而

$$
T_m=\frac1m\left(\zeta(2)+\sum_{j=1}^{m-1}\frac{H_j}{j}\right)
=\frac1m\left(\zeta(2)+\frac{H_{m-1}^2+H_{m-1}^{(2)}}2\right).
$$

最后一步来自有限恒等式

$$
\sum_{j=1}^{M}\frac{H_j}{j}
=\sum_{1\leqslant k\leqslant j\leqslant M}\frac1{jk}
=\frac12\left(H_M^2+H_M^{(2)}\right),
$$

因为正方形求和区域可分为两个严格三角形和一条对角线。这里 $M=0$ 时两边均为零。

例如，$m=2$ 时

$$
\sum_{n=1}^{\infty}\frac{H_n}{n(n+2)}
=\frac{\pi^2}{12}+\frac12.
$$

## 生成函数与除以指标

### 调和数的普通生成函数

对整数 $p\geqslant1$ 和实数 $|x|<1$，定义多重对数函数

$$
\operatorname{Li}_p(x)=\sum_{n=1}^{\infty}\frac{x^n}{n^p}.
$$

这里 $\operatorname{Li}_p$ 是单指标多重对数函数，与后文的多重 Zeta 值并非同一记号。由几何级数逐项积分，

$$
\operatorname{Li}_1(x)=-\log(1-x).
$$

命题 2：对 $|x|<1$，有

$$
\sum_{n=1}^{\infty}H_n^{(p)}x^n
=\frac{\operatorname{Li}_p(x)}{1-x}.
$$

证明：固定 $0<r<1$。当 $|x|\leqslant r$ 时，

$$
\sum_{n=1}^{\infty}\sum_{k=1}^{n}\frac{|x|^n}{k^p}
\leqslant\sum_{n=1}^{\infty}(1+\log n)r^n<\infty.
$$

故可绝对收敛换序，得到

$$
\sum_{n=1}^{\infty}H_n^{(p)}x^n
=\sum_{k=1}^{\infty}\frac1{k^p}\sum_{n=k}^{\infty}x^n
=\frac{\operatorname{Li}_p(x)}{1-x}.
$$

同一上界还给出紧子区间上的一致收敛。证明完毕。

### 积分算子如何产生一个分母

若 $A(x)=\sum_{n\geqslant1}a_nx^n$ 是收敛幂级数，则在其收敛区间内部，

$$
\int_0^x\frac{A(t)}t\,\mathrm dt
=\sum_{n=1}^{\infty}\frac{a_n}{n}x^n.
$$

这里 $A(t)/t$ 在 $t=0$ 的奇点可去，逐项积分由紧子区间上的一致收敛保证。因此，“除以指标 $n$”与“对生成函数除以变量再积分”相对应。

对 $p=1$ 使用这一操作，得到

$$
\begin{aligned}
F(x):=\sum_{n=1}^{\infty}\frac{H_n}{n}x^n
&=\int_0^x\frac{-\log(1-t)}{t(1-t)}\,\mathrm dt\\
&=\operatorname{Li}_2(x)+\frac12\log^2(1-x),
\qquad -1<x<1.
\end{aligned}
$$

最后一步由 $1/[t(1-t)]=1/t+1/(1-t)$ 得出，两项在 $x=0$ 均为零。

### 例 3：几何衰减与二重对数反射公式

计算

$$
\sum_{n=1}^{\infty}\frac{H_n}{n2^n}.
$$

解：先证明对 $0<x<1$，有

$$
\operatorname{Li}_2(x)+\operatorname{Li}_2(1-x)
=\zeta(2)-\log x\log(1-x).
$$

由幂级数内部逐项求导，

$$
\operatorname{Li}_2'(x)=-\frac{\log(1-x)}x.
$$

所以

$$
\frac{\mathrm d}{\mathrm dx}
\left(\operatorname{Li}_2(x)+\operatorname{Li}_2(1-x)
+\log x\log(1-x)\right)=0.
$$

令 $x\downarrow0$，由 $0\leqslant(1-x)^n/n^2\leqslant1/n^2$ 及控制收敛，$\operatorname{Li}_2(1-x)\to\zeta(2)$；其余两项趋于零。这证明了反射公式。

取 $x=1/2$，得到

$$
\operatorname{Li}_2(1/2)=\frac12\zeta(2)-\frac12\log^2 2.
$$

代入 $F(1/2)$，即得

$$
\sum_{n=1}^{\infty}\frac{H_n}{n2^n}
=\frac12\zeta(2)=\frac{\pi^2}{12}.
$$

几何因子使计算保持在收敛区间内部，因此本例无需处理条件收敛的端点问题。

## 积分表示与分部积分

### 三个基本积分核

对整数 $q\geqslant1$ 及实数 $a>0$，有

$$
\int_0^1x^{a-1}(-\log x)^{q-1}\,\mathrm dx
=\frac{(q-1)!}{a^q}.
$$

证明：令 $x=e^{-t}$，再令 $u=at$，左端成为

$$
\frac1{a^q}\int_0^\infty e^{-u}u^{q-1}\,\mathrm du
=\frac{(q-1)!}{a^q}.
$$

最后一步对整数 $q-1$ 反复分部积分；每次无穷远处的边界项因指数衰减而消失，零点处除 $q=1$ 的初始积分外也均消失。证明完毕。

因此，对正整数 $n,p,q$，

$$
\begin{aligned}
\frac1{n^q}
&=\frac1{(q-1)!}\int_0^1x^{n-1}(-\log x)^{q-1}\,\mathrm dx,\\
H_n
&=\int_0^1\frac{1-t^n}{1-t}\,\mathrm dt,\\
H_n^{(p)}
&=\frac1{(p-1)!}\int_0^1
\frac{1-t^n}{1-t}(-\log t)^{p-1}\,\mathrm dt.
\end{aligned}
$$

后两式由有限几何和 $(1-t^n)/(1-t)=\sum_{k=1}^{n}t^{k-1}$ 与第一式得到，不涉及无穷换序。

### 线性 Euler 和的两种积分表示

对整数 $p\geqslant1$、$q\geqslant2$，非负项逐项积分与命题 2 给出

$$
S_{p,q}
=\frac1{(q-1)!}\int_0^1
\frac{\operatorname{Li}_p(x)}{x(1-x)}
(-\log x)^{q-1}\,\mathrm dx.
$$

该积分有限，因为它等于命题 1 中已证明收敛的正项级数。也可直接检查：在 $x\downarrow0$ 时，$\operatorname{Li}_p(x)=O(x)$；在 $x\uparrow1$ 时，$-\log x=O(1-x)$，而 $\operatorname{Li}_1(x)=-\log(1-x)$，$p>1$ 时 $\operatorname{Li}_p(x)$ 有界。于是两端均可积。

把 $H_n^{(p)}$ 换成积分核，则得到另一种表示：

$$
S_{p,q}
=\frac1{(p-1)!}\int_0^1
\frac{\zeta(q)-\operatorname{Li}_q(t)}{1-t}
(-\log t)^{p-1}\,\mathrm dt.
$$

此处也只交换非负项。虽然分子写成差，但在 $0<t<1$ 上，它等于非负级数 $\sum_{n\geqslant1}(1-t^n)/n^q$。第一种表示消去外层的 $n^{-q}$；第二种表示消去内层调和数。选择哪一种，取决于哪一个积分核更容易化简。

### 例 4：严格计算三次权的基本 Euler 和

证明

$$
\sum_{n=1}^{\infty}\frac{H_n}{n^2}=2\zeta(3).
$$

证明：由第一种积分表示，

$$
S_{1,2}=\int_0^1\frac{\log x\log(1-x)}{x(1-x)}\,\mathrm dx.
$$

两对数在 $(0,1)$ 内均为负，乘积非负。分解分母，并对其中一项作代换 $x\mapsto1-x$，得到

$$
S_{1,2}=2A,
\qquad
A=\int_0^1\frac{\log x\log(1-x)}{1-x}\,\mathrm dx.
$$

在 $[\varepsilon,1-\varepsilon]$ 上分部积分，取

$$
u=\log x,
\qquad
\mathrm dv=\frac{\log(1-x)}{1-x}\,\mathrm dx,
\qquad
v=-\frac12\log^2(1-x).
$$

当 $x\downarrow0$ 时，$\log x\log^2(1-x)=O(x^2\log x)\to0$；当 $x\uparrow1$ 时，该表达式为 $O((1-x)\log^2(1-x))\to0$。同时 $\log^2(1-x)/x$ 在两端均可积。因此可以令 $\varepsilon\downarrow0$，得到

$$
A=\frac12\int_0^1\frac{\log^2(1-x)}x\,\mathrm dx.
$$

令 $t=1-x$，再用非负几何级数和基本积分核，得

$$
\begin{aligned}
\int_0^1\frac{\log^2(1-x)}x\,\mathrm dx
&=\int_0^1\frac{\log^2t}{1-t}\,\mathrm dt\\
&=\sum_{j=0}^{\infty}\int_0^1t^j\log^2t\,\mathrm dt\\
&=2\sum_{j=0}^{\infty}\frac1{(j+1)^3}
=2\zeta(3).
\end{aligned}
$$

故 $A=\zeta(3)$，从而 $S_{1,2}=2\zeta(3)$。证明完毕。

与生成函数的联系：对 $F(x)/x$ 在 $(0,1)$ 上积分，非负项逐项积分给出

$$
S_{1,2}=\int_0^1\frac{\operatorname{Li}_2(x)}x\,\mathrm dx
+\frac12\int_0^1\frac{\log^2(1-x)}x\,\mathrm dx
=\zeta(3)+\zeta(3).
$$

第一项等于 $\zeta(3)$，也是由其非负幂级数逐项积分得到的。两种路线最终到达同一个对数平方积分，说明生成函数与积分表示是相互衔接的工具。

## 端点与交错级数

### Abel 端点定理的一个证明

若数项级数 $\sum_{n=1}^{\infty}a_n=L$ 收敛，则

$$
\lim_{r\uparrow1}\sum_{n=1}^{\infty}a_nr^n=L.
$$

证明：设 $s_n=\sum_{k=1}^{n}a_k$。收敛序列 $(s_n)$ 有界，因而对 $0<r<1$，分部求和可得

$$
\sum_{n=1}^{\infty}a_nr^n
=(1-r)\sum_{n=1}^{\infty}s_nr^n.
$$

这里可先写有限恒等式，余项 $s_Nr^{N+1}$ 因 $s_N$ 有界而趋于零。于是

$$
\sum_{n=1}^{\infty}a_nr^n-L
=(1-r)\sum_{n=1}^{\infty}(s_n-L)r^n-L(1-r).
$$

给定 $\eta>0$，选取 $N$ 使 $n>N$ 时 $|s_n-L|<\eta$。前 $N$ 项乘以 $1-r$ 后趋于零，尾部绝对值不超过 $\eta(1-r)\sum_{n>N}r^n\leqslant\eta$。令 $r\uparrow1$，再令 $\eta\downarrow0$，结论成立。证明完毕。

该定理的前提是原级数已经收敛。仅知道带因子 $r^n$ 的表达式有极限，不能反过来认定原级数收敛。

### 例 5：一个条件收敛的交错 Euler 和

计算

$$
A_1=\sum_{n=1}^{\infty}(-1)^{n-1}\frac{H_n}{n}.
$$

解：令 $b_n=H_n/n$，则 $b_n\to0$，并且

$$
b_n-b_{n+1}
=\frac{(n+1)H_n-n}{n(n+1)^2}>0.
$$

所以交错级数判别法保证 $A_1$ 收敛；绝对值级数则由命题 1 发散。对 $0<r<1$，生成函数公式给出

$$
\sum_{n=1}^{\infty}(-1)^{n-1}\frac{H_n}{n}r^n
=-\operatorname{Li}_2(-r)-\frac12\log^2(1+r).
$$

左端由刚证明的 Abel 定理趋于 $A_1$。右端的多重对数级数由 $1/n^2$ 控制，故可取 $r\uparrow1$；又由绝对收敛分组，

$$
\operatorname{Li}_2(-1)
=\sum_{n=1}^{\infty}\frac{(-1)^n}{n^2}
=2\sum_{k=1}^{\infty}\frac1{(2k)^2}-\zeta(2)
=-\frac12\zeta(2).
$$

因此

$$
A_1=\frac12\zeta(2)-\frac12\log^2 2
=\frac{\pi^2}{12}-\frac12\log^2 2.
$$

这里没有对条件收敛的原级数任意换序：所有生成函数运算都先在 $0<r<1$ 内进行，最后才取端点极限。

## 多重求和与线性降阶公式

### 严格三角形与对角线

对整数 $a\geqslant2$、$b\geqslant1$，定义深度为二的多重 Zeta 值

$$
\zeta(a,b)=\sum_{n>k\geqslant1}\frac1{n^ak^b}.
$$

其收敛性由 $\zeta(a,b)\leqslant S_{b,a}<\infty$ 得到。对 $p\geqslant1$、$q\geqslant2$，把 $k\leqslant n$ 分为 $k<n$ 和 $k=n$，即有

$$
S_{p,q}=\zeta(q,p)+\zeta(p+q).
$$

注意两个指标的次序：调和数的指标 $p$ 进入第二个位置，外层分母的指标 $q$ 进入第一个位置。

若 $p,q\geqslant2$，把正整数格点分为 $n>k$、$k>n$ 和 $n=k$，便得到乘积恒等式

$$
\zeta(p)\zeta(q)
=\zeta(p,q)+\zeta(q,p)+\zeta(p+q).
$$

所有项非负且总和有限，故区域拆分合法。于是

$$
S_{p,q}+S_{q,p}
=\zeta(p)\zeta(q)+\zeta(p+q),
\qquad p,q\geqslant2.
$$

条件 $p,q\geqslant2$ 不可省略，否则右端可能含发散的 $\zeta(1)$。

### 深度二求和公式的初等证明

命题 3：对每个整数 $w\geqslant3$，有

$$
\sum_{a=2}^{w-1}\zeta(a,w-a)=\zeta(w).
$$

证明：对整数 $n>m\geqslant1$，有限几何求和给出

$$
\sum_{a=2}^{w-1}\frac1{n^am^{w-a}}
=\frac1{n-m}
\left(\frac1{n m^{w-2}}-\frac1{n^{w-1}}\right).
$$

令 $n=m+k$。为避免把两个发散量相减，先分别证明下列两和有限：

$$
\begin{aligned}
C_w&=\sum_{m,k\geqslant1}\frac1{k(m+k)m^{w-2}},\\
D_w&=\sum_{m,k\geqslant1}\frac1{k(m+k)^{w-1}}.
\end{aligned}
$$

对 $C_w$ 用非负换序及例 2 中的望远镜恒等式，得到

$$
C_w=\sum_{m=1}^{\infty}\frac1{m^{w-2}}
\sum_{k=1}^{\infty}\frac1{k(m+k)}
=\sum_{m=1}^{\infty}\frac{H_m}{m^{w-1}}<\infty.
$$

对 $D_w$ 按 $n=m+k$ 分组，则

$$
D_w=\sum_{n=1}^{\infty}\frac{H_{n-1}}{n^{w-1}}
\leqslant C_w<\infty.
$$

因此可以对上面的有限几何恒等式求和、拆成两个有限量，并计算

$$
\begin{aligned}
\sum_{a=2}^{w-1}\zeta(a,w-a)
&=C_w-D_w\\
&=\sum_{n=1}^{\infty}\frac{H_n-H_{n-1}}{n^{w-1}}
=\zeta(w).
\end{aligned}
$$

证明完毕。特别地，$w=3$ 时给出 $\zeta(2,1)=\zeta(3)$，与例 4 的积分计算一致。

### Euler 线性和的一般降阶公式

定理 4：对整数 $q\geqslant2$，有

$$
\boxed{
S_{1,q}
=\frac{q+2}{2}\zeta(q+1)
-\frac12\sum_{j=2}^{q-1}\zeta(j)\zeta(q+1-j).
}.
$$

当 $q=2$ 时，有限求和为空，按零处理。

证明：对乘积恒等式求和，由指标对称性，

$$
\begin{aligned}
\sum_{j=2}^{q-1}\zeta(j)\zeta(q+1-j)
&=2\sum_{j=2}^{q-1}\zeta(j,q+1-j)
 +(q-2)\zeta(q+1)\\
&=2\bigl(\zeta(q+1)-\zeta(q,1)\bigr)
 +(q-2)\zeta(q+1)\\
&=q\zeta(q+1)-2\zeta(q,1).
\end{aligned}
$$

第二步使用命题 3，其中权为 $q+1$。当 $q=2$ 时，等式同样成立，因为命题 3 此时正是 $\zeta(2,1)=\zeta(3)$。再结合 $S_{1,q}=\zeta(q,1)+\zeta(q+1)$，即得结论。证明完毕。

该公式说明：分子只有一个普通调和数时，可以把所有整数 $q\geqslant2$ 的线性 Euler 和化为单重 Zeta 值及其乘积。但这并不推出所有高深度、非线性或交错 Euler 和都有同样形式的表达式。

### 例 6：同为四次权，结构仍有区别

计算

$$
S_{1,3}=\sum_{n=1}^{\infty}\frac{H_n}{n^3},
\qquad
S_{2,2}=\sum_{n=1}^{\infty}\frac{H_n^{(2)}}{n^2}.
$$

解：由定理 4，

$$
S_{1,3}=\frac52\zeta(4)-\frac12\zeta(2)^2.
$$

由乘积恒等式或 $S_{p,q}+S_{q,p}$ 的对称式，

$$
S_{2,2}=\frac12\bigl(\zeta(2)^2+\zeta(4)\bigr).
$$

附录证明 $\zeta(2)=\pi^2/6$、$\zeta(4)=\pi^4/90$，故

$$
\begin{aligned}
S_{1,3}&=\frac54\zeta(4)=\frac{\pi^4}{72},\\
S_{2,2}&=\frac74\zeta(4)=\frac{7\pi^4}{360}.
\end{aligned}
$$

前者依赖跨指标的求和公式，后者仅需交换两个指标的对称性；同权并不意味着同一计算难度。

## 非线性例题与离散分部求和

### 先求差分，再处理高次调和数

对任意数列 $(a_n)$，若 $a_0=0$，则有限分部求和恒等式为

$$
\sum_{n=1}^{N}\frac{a_n}{n(n+1)}
=\sum_{n=1}^{N}\frac{a_n-a_{n-1}}n
-\frac{a_N}{N+1}.
$$

证明：把左端写成 $\sum_{n=1}^{N}a_n(1/n-1/(n+1))$，第二个有限和移位后逐项合并，即得右端。证明完毕。

若 $a_N/(N+1)\to0$ 且右端级数收敛，便可取 $N\to\infty$。这一公式是连续分部积分的离散对应：差分取代导数，移位的倒数取代原函数。

### 例 7：平方调和数的三重和可以降为线性和

计算

$$
Q=\sum_{n=1}^{\infty}\frac{H_n^2}{n(n+1)}.
$$

解：因 $H_n=O(\log n)$，原级数收敛，且 $H_N^2/(N+1)\to0$。利用

$$
H_n^2-H_{n-1}^2
=\frac{2H_n}{n}-\frac1{n^2},
$$

有限分部求和给出

$$
\sum_{n=1}^{N}\frac{H_n^2}{n(n+1)}
=2\sum_{n=1}^{N}\frac{H_n}{n^2}
-H_N^{(3)}-\frac{H_N^2}{N+1}.
$$

各项的极限均存在。令 $N\to\infty$，由例 4 得

$$
Q=2S_{1,2}-\zeta(3)=3\zeta(3).
$$

若直接展开 $H_n^2$，会出现三个指标；先做差分则立即把调和数的次数降一。这与连续问题中先分部积分、降低对数幂次的选择相对应。

## 余项估计与渐近联系

闭式计算与数值核对承担不同任务：闭式需要证明，数值近似需要可控的余项。以 $S_{1,2}=2\zeta(3)$ 为例，令

$$
R_N=\sum_{n>N}\frac{H_n}{n^2}.
$$

因为 $H_n\leqslant1+\log n$，且 $(1+\log x)/x^2$ 在 $[1,\infty)$ 上递减，故对所有 $N\geqslant1$，

$$
0<R_N\leqslant\int_N^\infty\frac{1+\log x}{x^2}\,\mathrm dx
=\frac{\log N+2}{N}.
$$

因此，有限部分和为下界，加上 $(\log N+2)/N$ 后为上界；这比单纯展示小数相近更能说明误差范围。

还可严格得到尾项的首阶渐近式：

$$
R_N=\frac{\log N+\gamma+1}{N}
+O\!\left(\frac{\log N}{N^2}\right),
\qquad N\to\infty,
$$

其中 $\gamma=\lim_{n\to\infty}(H_n-\log n)$。

证明：令 $d_n=H_n-\log n$。由积分比较，$d_n>0$，且

$$
d_n-d_{n+1}
=\int_n^{n+1}\frac{\mathrm dt}{t}-\frac1{n+1}>0.
$$

所以 $d_n$ 有非负极限 $\gamma$。同时

$$
\begin{aligned}
0\leqslant d_n-\gamma
&=\sum_{k=n}^{\infty}
\left(\int_k^{k+1}\frac{\mathrm dt}{t}-\frac1{k+1}\right)\\
&\leqslant\sum_{k=n}^{\infty}
\left(\frac1k-\frac1{k+1}\right)=\frac1n.
\end{aligned}
$$

这里等号先对有限尾段使用，再由 $d_n$ 的收敛取极限。于是 $H_n=\log n+\gamma+O(1/n)$，其中误差界对所有 $n$ 一致，故

$$
R_N=\sum_{n>N}\frac{\log n+\gamma}{n^2}+O(N^{-2}).
$$

函数 $f(x)=(\log x+\gamma)/x^2$ 在 $x\geqslant2$ 时非负递减。因此

$$
\int_{N+1}^\infty f(x)\,\mathrm dx
\leqslant\sum_{n>N}f(n)
\leqslant\int_N^\infty f(x)\,\mathrm dx,
\qquad N\geqslant2.
$$

两积分之差不超过 $f(N)=O(\log N/N^2)$，而

$$
\int_N^\infty f(x)\,\mathrm dx
=\frac{\log N+\gamma+1}{N}.
$$

合并即得结论。证明完毕。

这条证明只需积分比较，已能解释尾项为何含 $\log N/N$。若要继续提取更低阶项，可以进一步使用 Euler–Maclaurin 公式；那时必须对展开余项给出足以求和的统一估计，不能只把逐点渐近式形式地代入无穷和。

## 方法选择与易错点

遇到新的调和数级数，可按以下顺序判断。

1. 先判收敛。正项问题用 $H_n\leqslant1+\log n$；交错问题额外检查趋零与单调性。收敛性决定哪些交换操作可用。
2. 分母含 $n(n+m)$ 时，先检查倒数差和尾和。例 1、例 2 表明，有限移位常把无限问题化为有限调和数表达式。
3. 含 $x^n$ 时，先写生成函数。分母多一个 $n$，对应一次 $\int_0^x A(t)/t\,\mathrm dt$；端点是否能代入，要重新证明。
4. 分母含 $n^q$ 时，尝试对数矩积分核。若出现 $\log x\log(1-x)$，优先检查代换 $x\mapsto1-x$ 与分部积分。
5. 含两个广义调和数指标时，先分开严格三角形与对角线。乘积恒等式提供对称关系，深度二求和公式补充跨指标关系。
6. 含 $H_n$ 的高次幂且分母可望远镜时，先考察 $a_n-a_{n-1}$。例 7 展示了差分降低调和数次数的效果。
7. 需要近似时，最后给出截断误差。数值核对可以发现符号或系数错误，但不能代替收敛、换序和求值证明。

有四类常见错误需要特别避免：把 $H_n$ 误当成有界数列；把收敛圆内部公式直接延伸到端点；在反常积分的分部积分中省略边界项；把一个收敛的差拆成两个发散积分或级数分别计算。本文在命题 3 中先证明 $C_w,D_w$ 均有限，正是为了避开最后一种问题。

## 附录：两个偶数特殊值

本附录证明正文使用的 $\zeta(2)$ 和 $\zeta(4)$ 数值，不把它们作为未说明的计算前提。$\zeta(3)$ 在本文中始终按其收敛级数定义保留。

### 从有衰减因子的正弦级数得到平方余弦展开

对 $0<r<1$，定义

$$
A_r(t)=\sum_{n=1}^{\infty}\frac{r^n\sin(nt)}n.
$$

固定 $r<1$ 时，该级数关于 $t$ 一致绝对收敛。对 $r$ 在紧子区间内逐项求导，并对几何级数取虚部，得到

$$
\frac{\partial A_r(t)}{\partial r}
=\sum_{n=1}^{\infty}r^{n-1}\sin(nt)
=\frac{\sin t}{1-2r\cos t+r^2}.
$$

函数

$$
\arctan\!\left(\frac{r\sin t}{1-r\cos t}\right)
$$

对 $r$ 的导数与之相同，且在 $r=0$ 时同为零。由于 $1-r\cos t>0$，可取通常的 $(-\pi/2,\pi/2)$ 值域，从而

$$
A_r(t)=\arctan\!\left(\frac{r\sin t}{1-r\cos t}\right),
\qquad |A_r(t)|\leqslant\frac\pi2.
$$

对 $0<t<2\pi$，令 $r\uparrow1$，得到

$$
A_r(t)\longrightarrow\frac{\pi-t}{2}.
$$

固定 $0\leqslant y\leqslant2\pi$。先对 $t\in[0,y]$ 逐项积分，再取 $r\uparrow1$：积分端由常数 $\pi/2$ 控制，级数端由可求和的 $2/n^2$ 控制。因此

$$
\begin{aligned}
\sum_{n=1}^{\infty}\frac{1-\cos(ny)}{n^2}
&=\lim_{r\uparrow1}\int_0^y A_r(t)\,\mathrm dt\\
&=\int_0^y\frac{\pi-t}{2}\,\mathrm dt
=\frac{\pi y}{2}-\frac{y^2}{4}.
\end{aligned}
$$

端点 $t=0,2\pi$ 上的点态极限可能不同，但有限个点不影响积分。

### 计算二次特殊值

在上式中取 $y=\pi$。偶数项为零，奇数项的分子为 $2$，所以

$$
\frac{\pi^2}{4}
=2\sum_{\substack{n\geqslant1\\n\ \text{为奇数}}}\frac1{n^2}
=2\left(1-\frac14\right)\zeta(2)
=\frac32\zeta(2).
$$

因此 $\zeta(2)=\pi^2/6$。

### 计算四次特殊值

在同一恒等式中令 $y=x+\pi$，其中 $-\pi\leqslant x\leqslant\pi$，使用 $\cos(n(x+\pi))=(-1)^n\cos(nx)$，整理得

$$
x^2=\frac{\pi^2}{3}
+4\sum_{n=1}^{\infty}\frac{(-1)^n\cos(nx)}{n^2}.
$$

右端级数一致绝对收敛。其有限部分和一致收敛于 $x^2$，故平方也一致收敛，可以对有限部分和的平方积分后取极限。由直接积分得到的正交关系，

$$
\frac1{2\pi}\int_{-\pi}^{\pi}\cos(nx)\,\mathrm dx=0,
$$

以及对 $m,n\geqslant1$，

$$
\frac1{2\pi}\int_{-\pi}^{\pi}\cos(mx)\cos(nx)\,\mathrm dx
=\begin{cases}
0,&m\ne n,\\
\tfrac12,&m=n,
\end{cases},
$$

得到

$$
\frac1{2\pi}\int_{-\pi}^{\pi}x^4\,\mathrm dx
=\frac{\pi^4}{9}+8\sum_{n=1}^{\infty}\frac1{n^4}.
$$

左端等于 $\pi^4/5$，因此

$$
\zeta(4)=\frac18\left(\frac{\pi^4}{5}-\frac{\pi^4}{9}\right)
=\frac{\pi^4}{90}.
$$

这也完成了例 6 中所有特殊值代入的证明。
