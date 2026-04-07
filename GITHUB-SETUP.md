# GitHub Connection Guide for VSCode

## Status: Git Not Installed (Terminal error: 'git' not recognized)

## Step-by-Step Fix

### 1. Install Git (Must - Takes 2 min)
1. Go to https://git-scm.com/download/win
2. Download **64-bit Git for Windows Setup**
3. **Run as Administrator**
4. **Important selections:**
   - 'Git from the command line and also from 3rd-party software' (adds to PATH)
   - Default for others (Use OpenSSL, MinTTY)
5. Finish → **Restart PC** → Open new VSCode terminal

### 2. Verify
```
git --version
```
Expected: `git version 2.48.x.windows.1`

### 3. VSCode GitHub Sign-in
1. `Ctrl+Shift+P`
2. 'GitHub: Sign in'
3. Authorize in browser

### 4. Connect this Project to GitHub
1. Create new repo on GitHub.com (e.g. 'smartnote')
2. In VSCode terminal:
```
git init
git add .
git commit -m \"Initial commit\"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smartnote.git
git push -u origin main
```

## Troubleshooting
- Still 'git not recognized'? Reinstall, select PATH option, restart PC.
- Copy `git --version` output here after.
