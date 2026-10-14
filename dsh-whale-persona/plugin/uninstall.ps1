# dsh-whale-persona 卸载脚本
# 用法：$c = Get-Content -Raw 'uninstall.ps1'; Invoke-Expression $c
$ErrorActionPreference = "Stop"
$Prof = Join-Path $env:USERPROFILE ".dsh\profiles\desktop"
$Link = Join-Path $Prof "node_modules\dsh-whale-persona"
if (Test-Path $Link) { (Get-Item $Link).Delete(); Write-Host "[1/3] 已删除插件联接" } else { Write-Host "[1/3] 联接不存在，跳过" }
$pkgPath = Join-Path $Prof "package.json"
$pkg = Get-Content -Raw -Encoding UTF8 $pkgPath | ConvertFrom-Json
$pkg.dependencies.PSObject.Properties.Remove("dsh-whale-persona")
$pkg.dsh.profile.bundles = @($pkg.dsh.profile.bundles | Where-Object { $_ -ne "dsh-whale-persona" })
[System.IO.File]::WriteAllText($pkgPath, ($pkg | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[2/3] 已从 package.json 移除登记"
$patchPath = Join-Path $Prof "cordis.patch.yml"
$text = [System.IO.File]::ReadAllText($patchPath)
$idx = $text.IndexOf("- id: dsh-whale-persona")
if ($idx -ge 0) {
  $cut = $text.LastIndexOf([char]10, $idx)
  $rest = $text.Substring($idx)
  $next = $rest.IndexOf([char]10 + "- id:", 1)
  if ($next -lt 0) { $text = $text.Substring(0, $cut) } else { $text = $text.Substring(0, $cut) + $rest.Substring($next) }
  [System.IO.File]::WriteAllText($patchPath, $text, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[3/3] 已移除参数覆盖块"
} else { Write-Host "[3/3] cordis.patch.yml 中没有本插件条目，跳过" }
Write-Host "完成。重启 DeepSeek Harness 后不再注入人设。源码目录 E:\ai\work\dsh-whale-persona 未删除。"
