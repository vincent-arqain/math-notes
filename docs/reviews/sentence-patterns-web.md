# 句式学习网页版复核记录

日期：2026-10-24。底稿为已完成的《考研英语一句式学习材料.pdf》（6页，2026-10-23）。逐页读取完整文本后改编；原PDF留在个人文件库，不复制到仓库、不添加公开附件。公开版只给出通用适用词汇量，删除个人成绩及目标信息。本记录也不保存私人文件标识或私人数据。

## 范围与组织

共14篇Markdown：1篇总导读、12篇阅读短课、1篇写作专题。阅读保留R01—R12的原顺序，以“识别标志—找主干—拆解结构—中文直译—易错点—练习”组织，每课含参考答案。complex收录R01、R02、R04、R05、R09、R10、R12；common收录R03、R06、R07、R08、R11；writing收录W01—W10。总导读位于父分类，保留四步法及含结构、障碍、标志、拆法的速查表。

保留原讲义全部英文例句与10个模板。新增内容限于辨析、原句练习与答案、必要的还原句和导航；不另起一套讲义，不转载真题全文。Sentence-v1仅新增目录回链，74条解析文件不改动。所有练习均以原讲义原创例句为基础。

## 12类阅读句式逐项复核

| 课号 | 复核结论与必要澄清 |
| --- | --- |
| R01 | 两层关系从句与主句边界正确。将“that在need后充当宾语”明确为宾语功能，不误导为实际词序；强调主语who不能直接省略。 |
| R02 | using修饰Students，designed修饰apps，to think修饰time，from teachers修饰advice，need后两宾语并列，均保留。限定主动、被动解释适用于本例，不泛化所有-ing/-ed。 |
| R03 | 同位语a useful supplement和评论性插入语in my view区分正确。完整谓语是cannot replace；补回态度与观点归属。 |
| R04 | effect/remains主谓一致正确，of/on分别说明影响的来源与对象，with修饰students。改掉可能误导为“谓语一定在句末”的启发式措辞。 |
| R05 | never引出部分倒装，位置成分引出完全倒装，保留时态和否定。补充否定成分自身作主语等情况下不能机械倒装。 |
| R06 | 原强调句与还原句正确。把“删框架”说明为本例实用检验，须同时核对原意和被强调成分的位置；不作为万能充分条件。 |
| R07 | 原形式主语、形式宾语分析按常见教学术语保留；difficult为表语，hard为宾补。区分形式it与有具体指代的it。 |
| R08 | when后补technology is正确，保留被动。比较句的do承接read，明确为替代，避免与主语、be的省略混为一谈；比较阅读量而非人数。 |
| R09 | 保留原句The lesson finished，解释finished在独立主格中按分词理解、表示完成状态，不能误读为逗号拼接两个主句；增加After the lesson had finished的释义展开。逻辑主语分别为students、lesson。 |
| R10 | What matters作主语，whether从句作表语，内层what从句作know的宾语，均正确。补充两处what分别作内部主语、宾语及陈述语序。 |
| R11 | 保留否定转移的通常读法，同时说明它不是逻辑等价变形；not without cost只推出有成本，not all不推出全部不，保留范围和语气。 |
| R12 | although让步从句、who定语从句与两个并列that宾语从句层次正确。分开家长担忧、教师主张、作者立场，并保留can的范围。 |

## 10个写作模板逐项复核

| 模板 | 复核结论 |
| --- | --- |
| W01 | 保留As is shown in the picture及原例句；主句is helping完整，help sb. do sth.正确；图画与书信用途分开。 |
| W02 | plays an important role in结构正确；单复数随主语变化，in后为名词或动名词短语。 |
| W03 | although从句配完整主句；模板不叠用but；补充not every的部分否定含义。 |
| W04 | 保留句号加However的稳妥形式，区分连接副词和并列连词；第一处it是形式主语，第二处指technology。 |
| W05 | because后为完整从句；不叠用so；enjoy reading与can enjoy形式正确，提醒例句不能替代真实事实核验。 |
| W06 | lead to中的to是介词，保留can表达可能，后接名词或动名词短语。 |
| W07 | For example引出完整例句，by visiting表示方式；例子应支持前文，不虚构统计。 |
| W08 | In addition表达同向补充；reading作主语，helps与help sb. do结构正确。 |
| W09 | for schools说明不定式主体；important是表语，it是形式主语；“强调重要性”不等于语法上的It-cleft。 |
| W10 | should后动词原形，read与think共用to；行动结尾回应前文，保留原模板。 |

## 语法参照

原材料为主要内容来源，外部资料仅用于核对术语与判断边界，不复制其例句：

- [Cambridge English Grammar Today：Cleft sentences](https://dictionary.cambridge.org/grammar/british-grammar/cleft-sentences-it-was-in-june-we-got-married)：强调焦点与两部分的关系。
- [Cambridge English Grammar Today：Comparison clauses](https://dictionary.cambridge.org/grammar/british-grammar/comparison-clauses-bigger-than-we-had-imagined)：比较从句可使用省略或替代动词do。

## 实现边界

沿用现有分类、内容加载器、ID规则、标签、全文搜索及管理入口。仅调整三个分类展示顺序，给栏目增加总导读入口与障碍搜索示例。引入固定版本remark-gfm以正确显示两张Markdown速查表，表格置于可键盘聚焦的局部滚动区域；保留skipHtml与链接协议过滤，不开放原始HTML。在浏览器实测中发现字体切换会改变初次章节深链接的落点，补充一次字体就绪后的定位；若读者已经滚动、触摸、按键、点击或改变锚点，则不打断其操作。新增回归测试覆盖这些情况。无CMS数据模型、后台或上传流程变更，保留既定字体与正文排版。

## 验证记录

- `npm run check`通过；全量61项测试全部通过，无跳过。
- 本地环境限制tsx CLI的Unix socket，采用与仓库CI一致的`node --import tsx --test scripts/*.test.ts`运行完整测试；构建采用等效入口`node --import tsx scripts/build.tsx`，未修改仓库命令。
- 全站构建成功：261页、191份公开资料；`npm run verify`验证16,493个站内链接与资源（含页内锚点）。
- Chromium实测14篇专题页在320、390、768、1440像素宽度均无整页横向溢出；目视检查390像素的阅读、写作及速查表截图，以及1440像素速查表截图。
- 实测三分类为7／5／1篇，父分类14篇；类别切换、浏览器后退/前进、无结果状态、形式宾语与W09查询、全站英文例句查询均通过。
- 表格可局部横滑，聚焦后方向键可横向滚动；浏览器无脚本错误或资源请求失败。
- 再次检查新增公开内容不含个人成绩、私人文件ID或PDF附件；与原有74条解析无重复发布。

验证针对本PR的提交内容；合并后的正式部署结果以PR和Actions记录为准。
