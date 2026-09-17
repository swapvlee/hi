[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Message,

    [string]$Version,

    [string]$Notes = ""
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Invoke-CommandChecked {
    param(
        [string]$Command,
        [string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

try {
    $repoRoot = (git rev-parse --show-toplevel 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
        throw "The current directory is not a Git repository."
    }
    Set-Location $repoRoot

    $branch = (git branch --show-current).Trim()
    if ([string]::IsNullOrWhiteSpace($branch)) {
        throw "The repository is in detached HEAD state."
    }

    $remote = (git remote get-url origin 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remote)) {
        throw "The origin remote was not found."
    }

    Write-Host "Repository: $repoRoot" -ForegroundColor DarkGray
    Write-Host "Branch: $branch" -ForegroundColor DarkGray
    Write-Host "Remote: $remote" -ForegroundColor DarkGray

    $isRelease = -not [string]::IsNullOrWhiteSpace($Version)
    if ($isRelease) {
        if ($Version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$') {
            throw "Version must use semantic versioning, for example 0.1.0 or 1.0.0-beta.1."
        }

        $tag = "v$Version"
        $tagExists = git tag --list $tag
        if (-not [string]::IsNullOrWhiteSpace(($tagExists -join ""))) {
            throw "The tag $tag already exists."
        }

        Write-Host "Updating package version to $Version..." -ForegroundColor Cyan
        Invoke-CommandChecked "npm" @("version", $Version, "--no-git-tag-version")

        $date = Get-Date -Format "yyyy-MM-dd"
        $changelogPath = Join-Path $repoRoot "CHANGELOG.md"
        if ([string]::IsNullOrWhiteSpace($Notes)) {
            $Notes = "- Release $tag"
        } else {
            $Notes = ($Notes -split "`r?`n" | ForEach-Object {
                if ($_.TrimStart().StartsWith("-")) { $_ } else { "- $_" }
            }) -join "`n"
        }

        $entry = "## [$Version] - $date`n`n$Notes`n`n"
        if (Test-Path $changelogPath) {
            $existingLog = Get-Content -Raw -Path $changelogPath
            if ($existingLog -match "(?m)^# ") {
                $headerEnd = $existingLog.IndexOf("`n") + 1
                $content = $existingLog.Substring($headerEnd).TrimStart()
                Set-Content -Path $changelogPath -Value ("$($existingLog.Substring(0, $headerEnd))`n$entry$content") -Encoding utf8
            } else {
                Set-Content -Path $changelogPath -Value ("# 更新日志`n`n$entry$existingLog") -Encoding utf8
            }
        } else {
            Set-Content -Path $changelogPath -Value ("# 更新日志`n`n$entry") -Encoding utf8
        }

        if ([string]::IsNullOrWhiteSpace($Message)) {
            $Message = "release: $tag"
        }
    } elseif ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = "sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }

    $status = @(git status --porcelain)
    if ($status.Count -gt 0) {
        Write-Host "Committing local changes..." -ForegroundColor Cyan
        Invoke-Git @("add", "--all")
        Invoke-Git @("commit", "-m", $Message)
    } else {
        Write-Host "No local changes." -ForegroundColor DarkGray
    }

    Write-Host "Pulling remote changes with rebase..." -ForegroundColor Cyan
    Invoke-Git @("pull", "--rebase", "origin", $branch)

    if ($isRelease) {
        Write-Host "Creating tag v$Version..." -ForegroundColor Cyan
        Invoke-Git @("tag", "-a", "v$Version", "-m", "Release v$Version")
    }

    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    if ($isRelease) {
        Invoke-Git @("push", "origin", $branch, "--follow-tags")
    } else {
        Invoke-Git @("push", "origin", $branch)
    }

    if ($isRelease) {
        Write-Host "Release v$Version synchronized." -ForegroundColor Green
    } else {
        Write-Host "Sync completed." -ForegroundColor Green
    }
}
catch {
    Write-Host "Sync failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Your local commit is preserved. Check the network or GitHub authentication, then run the script again." -ForegroundColor Yellow
    exit 1
}
