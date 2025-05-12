import fs from 'fs'; 

function copycss() {
  const source = "./app/chrome/core/engine.css";
  const dest = "./app/chrome/content/xhtml/notes.css";
  const data = fs.readFileSync(source);
  fs.writeFileSync(dest, data);
}

copycss();