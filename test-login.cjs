const emails = [
  "[email protected]",
  "[email protected]",
  "[email protected]",
  "[email protected]",
];

(async () => {
  for (const email of emails) {
    try {
      const r = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      const t = await r.text();
      console.log(email, "->", r.status, t.slice(0, 160));
    } catch (e) {
      console.log(email, "-> ERROR", e.message);
    }
  }
})();
