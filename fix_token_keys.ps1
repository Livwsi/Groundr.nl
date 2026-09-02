# fix_token_keys.ps1
# Replaces old localStorage token key 'token' with 'groundr_token'
# across all old dashboard pages

$base  = "C:\Users\ibaka\groundr\frontend"
$files = @(
    "app\(dashboard)\dashboard\page.tsx",
    "app\(dashboard)\analytics\page.tsx",
    "app\(dashboard)\listings\page.tsx",
    "app\(dashboard)\viewings\page.tsx",
    "app\(dashboard)\bids\page.tsx",
    "app\(dashboard)\approvals\page.tsx",
    "app\(dashboard)\meldingen\page.tsx",
    "app\dossier\dashboard\page.tsx"
)

foreach ($f in $files) {
    $path = Join-Path $base $f
    if (!(Test-Path $path)) { Write-Host "SKIP (not found): $f"; continue }

    $content = Get-Content $path -Raw

    # Replace localStorage.getItem('token') → getItem('groundr_token')
    $new = $content `
        -replace "localStorage\.getItem\('token'\)",       "localStorage.getItem('groundr_token')" `
        -replace 'localStorage\.getItem\("token"\)',       'localStorage.getItem("groundr_token")' `
        -replace "localStorage\.setItem\('token',",        "localStorage.setItem('groundr_token'," `
        -replace 'localStorage\.setItem\("token",',        'localStorage.setItem("groundr_token",' `
        -replace "localStorage\.removeItem\('token'\)",    "localStorage.removeItem('groundr_token')" `
        -replace 'localStorage\.removeItem\("token"\)',    'localStorage.removeItem("groundr_token")'

    if ($new -ne $content) {
        Set-Content $path $new -NoNewline
        Write-Host "FIXED: $f"
    } else {
        Write-Host "NO CHANGE: $f"
    }
}

Write-Host "`nDone."
