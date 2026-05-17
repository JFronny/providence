const l = window.location;
const basePath = import.meta.env.BASE_URL;
let path = l.pathname;
if (path.startsWith(basePath)) {
  path = path.slice(basePath.length);
}
path = path.replace(/\/$/, ""); // Remove trailing slash

const search = new URLSearchParams(l.search);
if (path) {
  search.set("page", path);
}

l.replace(l.protocol + "//" + l.host + basePath + "?" + search.toString() + l.hash);
