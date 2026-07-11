const v = require("validator");
const emails = [
  "[email protected]",
  "[email protected]",
  "[email protected]",
  "[email protected]",
];
emails.forEach((e) => console.log(JSON.stringify(e), "=>", v.isEmail(e)));
