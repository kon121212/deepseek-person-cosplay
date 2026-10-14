# dsh-whale-persona 安装/修复脚本（幂等）
# 用法：$c = Get-Content -Raw 'install.ps1'; Invoke-Expression $c
$ErrorActionPreference = "Stop"
$Src  = "E:\ai\work\dsh-whale-persona"
$Prof = Join-Path $env:USERPROFILE ".dsh\profiles\desktop"
$Link = Join-Path $Prof "node_modules\dsh-whale-persona"
if (-not (Test-Path $Src)) { throw "找不到插件源码：$Src" }

# 1) 插件本体：目录联接（改源码即时生效，不必复制）
if (Test-Path $Link) { (Get-Item $Link).Delete() }
New-Item -ItemType Junction -Path $Link -Target $Src | Out-Null
Write-Host "[1/4] 插件联接：$Link -> $Src"

# 2) 反向依赖联接：Node 按真实路径解析 ESM 依赖时需要
$DepSrc = Join-Path $Prof "node_modules\@deepseek-ai"
$DepDst = Join-Path $Src "node_modules\@deepseek-ai"
New-Item -ItemType Directory -Force -Path $DepDst | Out-Null
foreach ($n in @("schemastery","cosmokit")) {
  $from = Join-Path $DepSrc $n
  $to   = Join-Path $DepDst $n
  if (Test-Path $to) { (Get-Item $to).Delete() }
  if (Test-Path $from) { New-Item -ItemType Junction -Path $to -Target $from | Out-Null; Write-Host "[2/4] 依赖联接：$to -> $from" }
  else { Write-Host "[2/4] 警告：缺少 $from，插件将使用内置降级实现（功能不受影响）" }
}

# 3) 登记到 profile（无 BOM 写入，避免严格 JSON.parse 出错）
$pkgPath = Join-Path $Prof "package.json"
$pkg = Get-Content -Raw -Encoding UTF8 $pkgPath | ConvertFrom-Json
$pkg.dependencies | Add-Member -NotePropertyName "dsh-whale-persona" -NotePropertyValue "link:$Src" -Force
if ($pkg.dsh.profile.bundles -notcontains "dsh-whale-persona") { $pkg.dsh.profile.bundles += "dsh-whale-persona" }
[System.IO.File]::WriteAllText($pkgPath, ($pkg | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[3/4] 已登记 dependencies 与 dsh.profile.bundles"

# 4) 参数覆盖块（已存在则跳过）
$patchPath = Join-Path $Prof "cordis.patch.yml"
$text = [System.IO.File]::ReadAllText($patchPath)
if ($text.IndexOf("- id: dsh-whale-persona") -lt 0) {
  $block = [char]10 + "# dsh-whale-persona —— 人设插件参数（改这里即可，改完重启 DSH）" + [char]10 +
           "- id: dsh-whale-persona" + [char]10 +
           "  name: dsh-whale-persona" + [char]10 +
           "  config:" + [char]10 +
           "    enabled: true" + [char]10 +
           "    tsundere: light" + [char]10 +
           "    care: high" + [char]10 +
           "    selfName: 本鲸" + [char]10 +
           "    userTitle: 你" + [char]10
  [System.IO.File]::WriteAllText($patchPath, $text + $block, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[4/4] 已写入参数覆盖块"
} else { Write-Host "[4/4] 参数覆盖块已存在，跳过" }
Write-Host "完成。重启 DeepSeek Harness 后生效。"
