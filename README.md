# 🏯 Ryzen Ronin CTF

A community Capture The Flag. Every challenge was made by a member of the Ryzen Ronin crew,
is labeled by category (OSINT, Cryptography, Web, Forensics, …), and credits its author.

Flag format:

```
RyzenRonin{...}
```

## ▶️ Play

### 👉 **https://wanmuadz22.github.io/RyzenRonin-CTF/**

1. Open the link above and filter the board by category.
2. Open a challenge, then read the description and download any files.
3. Find the flag, paste it into the challenge's flag box, and hit **Submit**.
4. Your solves and score are saved in your browser.

## 📜 Rules

- Hints are free. Use them when stuck.
- Don't attack GitHub or any infrastructure that isn't explicitly part of a challenge.
- Don't post flags publicly. Share the link instead.
- The flag checker only stores SHA-256 hashes, so reading this repo's source won't hand you the answers.

## 📁 Structure

```
index.html            ← challenge board (category filters, score)
challenge.html        ← challenge page (challenge.html?id=<id>)
assets/challenges.js  ← challenge list: category, author, points, hash
assets/ctf.js         ← board + flag checker logic
files/<id>/           ← downloadable files for each challenge
```
