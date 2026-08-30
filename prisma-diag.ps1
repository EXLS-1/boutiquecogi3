$out = "prisma-diag-out.txt"
Remove-Item $out -ErrorAction SilentlyContinue

"=== versions ===" | Out-File $out
try { node -p "require('./node_modules/prisma/package.json').version" 2>&1 | Out-File $out -Append } catch { "prisma version read failed" | Out-File $out -Append }
try { node -p "require('./node_modules/@prisma/client/package.json').version" 2>&1 | Out-File $out -Append } catch { "client version read failed" | Out-File $out -Append }
try { node -p "require('./node_modules/@prisma/config/package.json').version" 2>&1 | Out-File $out -Append } catch { "no @prisma/config installed" | Out-File $out -Append }
try { node -p "require('./node_modules/prisma/package.json').bin" 2>&1 | Out-File $out -Append } catch { "no bin" | Out-File $out -Append }

"=== prisma --help ===" | Out-File $out -Append
npx prisma --help 2>&1 | Out-File $out -Append

"=== prisma/config exports ===" | Out-File $out -Append
node --input-type=module -e "import('prisma/config').then(m => console.log(Object.keys(m).join(', '))).catch(e => console.log('ERR: ' + e.message))" 2>&1 | Out-File $out -Append

"=== @prisma/config exports ===" | Out-File $out -Append
node --input-type=module -e "import('@prisma/config').then(m => console.log(Object.keys(m).join(', '))).catch(e => console.log('ERR: ' + e.message))" 2>&1 | Out-File $out -Append

"=== bundled docs ===" | Out-File $out -Append
if (Test-Path node_modules/prisma/dist/docs) { Get-ChildItem node_modules/prisma/dist/docs -Recurse -Name | Select-Object -First 60 | Out-File $out -Append } else { "no node_modules/prisma/dist/docs" | Out-File $out -Append }
if (Test-Path node_modules/prisma/docs) { Get-ChildItem node_modules/prisma/docs -Recurse -Name | Select-Object -First 60 | Out-File $out -Append } else { "no node_modules/prisma/docs" | Out-File $out -Append }

"=== .agents/skills ===" | Out-File $out -Append
if (Test-Path .agents/skills) { Get-ChildItem .agents/skills -Name | Out-File $out -Append } else { "no .agents/skills" | Out-File $out -Append }

"DIAG_DONE" | Out-File $out -Append
