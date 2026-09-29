// Ryzen Ronin CTF — challenge list.
// Flags are stored only as salted PBKDF2-SHA256 hashes (see assets/ctf.js). Challenge files live in files/<id>/.
//
// Entry shape:
// {
//   id: "short-slug",                 // used in the URL: challenge.html?id=short-slug
//   title: "Challenge Title",
//   category: "OSINT",                // shown as the colored label
//   author: "Name",                   // credit
//   points: 100,
//   difficulty: "Easy",               // Easy / Medium / Hard
//   description: `<p>HTML allowed</p>`,
//   files: [{ name: "image.jpg", path: "files/short-slug/image.jpg" }],
//   links: [{ name: "Open the site", url: "https://..." }],
//   hints: ["hint 1", "hint 2"],
//   hash: "PBKDF2-SHA256(flag, salt=\"RyzenRonin|<id>\", 300000 rounds)",
// }

const CHALLENGES = [
];
