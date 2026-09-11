$ErrorActionPreference = 'SilentlyContinue'
foreach ($d in @('lib','app','components','hooks','store','prisma','server')) {
  if (Test-Path $d) {
    Get-ChildItem $d -Recurse -Include *.ts,*.tsx -File | Select-String -Pattern 'ProductStatus\.ACTIVE|ProductStatus\.OUT_OF_STOCK|"ACTIVE"|\x27ACTIVE\x27' | ForEach-Object {
      Write-Output ("{0}:{1}:{2}" -f $_.Path, $_.LineNumber, $_.Line.Trim())
    }
  }
}
