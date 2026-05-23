# Run this script to push to GitHub (Git is installed but may not be in PATH)
$git = "C:\Program Files\Git\cmd\git.exe"
Set-Location $PSScriptRoot

& $git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host "`nSuccess! View at: https://github.com/kavi389025/parkinson-detection" -ForegroundColor Green
} else {
  Write-Host "`nPush failed. Sign in via Git Credential Manager or use a Personal Access Token." -ForegroundColor Yellow
  Write-Host "GitHub token: Settings -> Developer settings -> Personal access tokens -> repo scope"
}
