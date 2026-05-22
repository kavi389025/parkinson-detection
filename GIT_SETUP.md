# Fix: `git is not recognized` in PowerShell

Git **is installed** at `C:\Program Files\Git\` but Windows PATH may not include it.

## Fix PATH permanently

1. Press **Win + S**, search **Environment Variables**
2. Open **Edit the system environment variables** → **Environment Variables**
3. Under **User variables** → select **Path** → **Edit** → **New**
4. Add: `C:\Program Files\Git\cmd`
5. Click **OK** on all dialogs
6. **Close and reopen** Cursor / PowerShell
7. Test: `git --version`

## Push to GitHub (after PATH fix OR use script)

Your repo is already committed locally. To upload:

```powershell
cd d:\Parkinson
.\git-push.ps1
```

Or manually:

```powershell
& "C:\Program Files\Git\cmd\git.exe" push -u origin main
```

Sign in when prompted (browser or GitHub token).

**Repo URL:** https://github.com/kavi389025/parkinson-detection
