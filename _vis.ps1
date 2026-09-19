$path = 'C:\boutiquecogi3\app\admin\settings\page.tsx'
$lines = Get-Content $path
$ranges = @(@(73,86), @(100,107), @(150,160))
foreach ($r in $ranges) {
  "=== lines $($r[0])..$($r[1]) ==="
  for ($i = $r[0]-1; $i -le $r[1]-1; $i++) {
    $l = $lines[$i]
    $vis = $l -replace ' ', '·'
    "$($i+1): $vis"
  }
}
