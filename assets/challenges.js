// Ryzen Ronin CTF — challenge list.
// Flags are stored only as SHA-256 hashes. Challenge files live in files/<id>/.
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
//   hash: "sha256 of the full flag",
// }

const CHALLENGES = [
];
