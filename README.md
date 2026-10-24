# 一言 · Hitokoto
本README由AI完成
小米手环 / 小米手表（VelaOS 快应用）上的一言阅读器。

> 数据来源：[一言开放句子库](https://github.com/hitokoto-osc/sentences-bundle)（AGPL-3.0），已清洗、去重、审核后打包进本地数据文件，**离线可用，不依赖网络**。

## 功能

- **随机一言**：每句附出处，支持"换一句"
- **出处搜索**：输入关键词，只搜"出处"（作品 / 作者 / 歌曲），命中后上一句 / 下一句翻看，上限 200 条
- **长句自适应**：正文按字数自动缩字号，保证任意一句完整显示在一屏内
- **屏幕形状自适应**：方屏（rect）/ 药丸屏（pill-shaped）/ 圆屏（circle）自动匹配键盘布局
- **关于页**：显示句子总数与出处总数
- **界面**：按「无源流沙」小米手环 9 Pro 设计规范实现（画布 336×480、
  背景 `#000000`、卡片与圆钮 `#262626`、强调色 `#0D6EFF`、圆钮 72×72、圆角 20、页面边距 6；
  文字 标题 32 / 正文次级 28（白 60% ≈ `#999999`））。改界面前建议先对照规范，
  设计稿见 `F:\小米手环9Pro.sketch`（或 `.jsd`）。

## 下载安装（不需要自己编译）

到 **[懒得发包了_如果你需要rpk看这](./懒得发包了_如果你需要rpk看这)** 文件夹拿现成的 rpk 包：

| 文件 | 句子数 | 体积 | 说明 |
|---|---|---|---|
| `io.github.micasiliconneko.hikoto.v1.6.8.rpk` | 7000 | 759 KB | 数据分 8 个文件加载，自签正式证书签名 |

安装：点下面的徽标直接用 AstroBox 打开，或在 AstroBox 里搜索「一言」。

<p>
  <a href="https://astrobox.online/open?source=res&amp;res=io.github.micasiliconneko.hikoto&amp;provider=official" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://astrobox.online/goab/en/black.svg">
      <img src="https://astrobox.online/goab/en/white.svg" alt="Get it on AstroBox" height="46">
    </picture>
  </a>
</p>

## 数据规模与出处覆盖

- **7000 条句子，覆盖全部 4382 个出处**——搜索按出处进行，任何出处都能搜到
- 数据结构为三张表：`SRC`（去重出处）/ `SRC_S`（前缀偏移，句子按出处聚簇）/ `TXT`（正文），
  每条句子打包成本从 147B 压到 90B
- 清洗规则：去重、去零宽字符、去除纯日文 / 颜文字等手环无法渲染的内容、
  关键词审核（词表见 `tools/moderation.py`，可自行调整后重新生成）

## 目录结构

```
src/
├── manifest.json              # 应用配置（designWidth=device-width）
├── app.ux                     # 全局：屏幕形状探测
├── pages/
│   ├── index/index.ux         # 主页：随机一言
│   ├── search/search.ux       # 搜索页：按出处搜索
│   └── about/about.ux         # 关于页
├── components/InputMethod/    # 官方键盘组件（自带拼音词库）
└── common/scripts/
    ├── data.js                # 句子数据（生成，勿手改）
    ├── logic.js               # 数据访问门面
    └── meta.js                # 计数常量（供关于页使用）
sign/                          # release 构建签名证书（工具链默认证书）
```

## 自己构建

环境：node ≥ 22，`npm install` 后：

```bash
# 生成数据（7000 句，分 8 片）后构建正式包
python tools/gen_data.py 100 7000 200 --split 8
node node_modules/aiot-toolkit/lib/bin.js release
```

- 修改句子数量 / 审核尺度：改 `tools/gen_data.py` 参数与 `tools/moderation.py`，
  句子数下限为 4382（保证出处全覆盖），上限受手环 JS 堆限制（单文件数据约 5000~6000）

## 实现上的几个坑（改代码前建议先看）

- **应用图标是 `src/common/logo.png`**（平台按约定读取这个文件），manifest 里的
  `icon` 也指向它。换图标**只改 logo.png 就够了**——只改 `common/images/icon.png`
  不会生效，而且会白占一份体积。
- **正文不要放进 `<scroll>`**：真机上 scroll 内部拿不到 `width:100%`，内部盒子会退化成
  按内容宽度收缩，整块文字贴向一边。正文用普通 `<div>`，由卡片容器自己居中。
- **不要用「动态绑定的 style」**（如 `style="font-size: {{x}}px"`）：实测它会显著增加运行时开销，
  7000 条数据下直接 OOM。字号写死在 CSS 里最稳。
- **长文本完整显示的做法**：把字号做成几档**静态 CSS 类**（`.sz26`/`.sz23`/…），
  模板里放同样数量的 `<text>`，用 `if="{{textSize == 26}}"` 这类条件只显示一个；
  JS 按「字数 × 字号 ≤ 可用面积」从大到小挑档位。这样既有自动缩字号的效果，
  又完全不碰动态 style（`if` 切换在 7000 条下实测稳定）。
- 句子库为离线打包，更新句子需重新生成数据并重新构建。

## 已知限制

- 手环 JS 堆很小：单文件数据约 5000 条是安全线，7000 条需要分片加载（`--split`）
- 极端窄屏（约 192px 宽）下仍有极少数超长句会触发省略号
- 更新句子需重新生成数据并构建

## 许可证

本项目以 **[GNU Affero 通用公共许可证 v3.0](./LICENSE)（AGPL-3.0）** 授权。
Copyright (c) 2026 CatechinCode

**为什么是 AGPL**：本应用把一言官方句子库
（[sentences-bundle](https://github.com/hitokoto-osc/sentences-bundle)，
数据来自 [hitokoto.cn](https://hitokoto.cn)）**打包进了应用**。该句子库以 AGPL 授权，
要求分发衍生作品（包括打包进应用）时同样以 AGPL 开源并提供对应源码；
句子数据已以源码形式放在本仓库（`src/common/scripts/data.js` 或分片 `data/p*.js`），
完整代码即本仓库。

- 若仅通过接口（超链接方式）调用一言，不受 AGPL 的传染性影响。
- 句子著作权并不全部由一言网持有；句子原作者如需移除自己的句子，可联系 `i@loli.online`。
