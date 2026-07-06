---
version: alpha
name: LifeEvent
description: 人生の出来事を時系列で記録・振り返るWebサービスのビジュアルアイデンティティ
colors:
  primary: "#2563eb"
  on-primary: "#ffffff"
  background: "#f8fafc"
  surface: "#ffffff"
  text: "#111827"
  muted: "#6b7280"
  border: "#d1d5db"
typography:
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  heading-1:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.25
  heading-3:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: Inter
    fontSize: 0.95rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: 0.5rem
  lg: 1rem
  full: 9999px
spacing:
  xs: 0.5rem
  sm: 0.75rem
  md: 1rem
  lg: 1.25rem
  xl: 1.5rem
  xxl: 2rem
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm} {spacing.lg}"
  timeline-item:
    textColor: "{colors.text}"
    padding: "0 0 0 {spacing.md}"
---

# LifeEvent DESIGN.md

LifeEvent のビジュアルアイデンティティを、コーディングエージェントが解釈できる形で記述する。
上部の YAML フロントマターがデザイントークン（機械可読）、以下の本文が意図の説明（人間可読）。

## Overview

穏やかで信頼感のある、明るいライトテーマ。人生の記録を落ち着いて振り返れるよう、
余白を広く取り、影は淡く、角丸を大きめにして柔らかい印象にする。
アクセントは1色（ブルー）に絞り、情報を詰め込みすぎないミニマルな構成を基本とする。

## Colors

- **Primary** (#2563eb): 主要なアクション（ボタン）とタイムラインの強調に使う唯一のアクセント色
- **On-primary** (#ffffff): primary 面上のテキスト・アイコン
- **Background** (#f8fafc): ページ全体の下地。ほぼ白に近い淡いグレーで目に優しくする
- **Surface** (#ffffff): カードなど前面に浮かぶ面。background との明度差で階層を出す
- **Text** (#111827): 本文テキスト。純黒を避けた濃いグレーでコントラストを保ちつつ和らげる
- **Muted** (#6b7280): 日付やキャプションなど補助情報。本文より弱く見せる
- **Border** (#d1d5db): カードや区切りの境界線。控えめに面を分ける

## Typography

- フォントは Inter を第一候補にシステムフォントへフォールバック
- 本文（body-md）は行間 1.6 で読みやすさを優先
- 見出し heading-1 は太字で大きく、heading-3（タイムライン各項目のタイトル）は中太字
- 日付などの補助情報は caption を使い、muted 色と組み合わせて弱める

## Layout

- コンテンツ幅は最大 1080px、中央寄せ。左右に spacing.xxl（2rem）のパディング
- 余白スケールは 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2rem の6段階
- カード内部は spacing.xl（1.5rem）を基準に余白を取る
- タイムラインは縦積みで、各項目の間隔は spacing.xl（1.5rem）

## Elevation & Depth

- 階層は主に「淡い影」と「面の色差」で表現する
- カードの影は `0 18px 60px rgba(15, 23, 42, 0.08)`。大きくぼかし不透明度を低くして軽やかに浮かせる
- 濃い影や多重の影は使わない。深さは控えめに保つ

## Shapes

- 角丸スケール: md=0.5rem / lg=1rem / full=9999px
- カードなど面の要素は lg（1rem）で大きめに丸める
- ボタンは full（ピル形状）で親しみやすくする
- 角のある直線的なフォルムは避け、全体を柔らかくまとめる

## Components

- **card**: 白い面 + border の境界線 + lg の角丸 + 淡い影。情報のまとまりを表す基本コンテナ
- **button**: primary 背景・白文字のピル型。アイコンと label は spacing.xs（0.5rem）間隔で中央揃え。主要アクションに使う
- **timeline-item**: 左に primary 色の 3px ボーダーを引き、spacing.md（1rem）左パディング。タイトルは heading-3、日付は caption + muted。項目下に spacing.xl の間隔

## Do's and Don'ts

- Do: アクセントは primary のブルー1色に統一する
- Do: 余白を広く取り、要素を詰め込みすぎない
- Do: 階層は面の色差と淡い影で表現する
- Don't: 純黒（#000）や濃く強い影を使わない
- Don't: 複数のアクセント色を混在させない
- Don't: 角のある硬いフォルムでカードやボタンを作らない
