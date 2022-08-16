Neutralino.init();

async function autoUpdate() {
  try {
    let url = "https://p2r3.com/spplice/app/manifest.json?r=" + Math.floor(Math.random() * 1000);
    let manifest = await Neutralino.updater.checkForUpdates(url);

    if(manifest.version != NL_APPVERSION) {
      await Neutralino.updater.install();
      setStatusText("Update installed, please restart Spplice");
      // await Neutralino.app.restartProcess();
    }
  } catch(e) {
    console.log("Error while checking for updates: " + e);
  }
}
autoUpdate();

function arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function forceRemoveDirectory(path) {

  if(path[path.length - 1] !== '/' || path[path.length - 1] !== '\\') path += "/";
  const dir = await Neutralino.filesystem.readDirectory(path);

  for(let i = 0; i < dir.length; i++) {
    if(dir[i].type === "FILE") await Neutralino.filesystem.removeFile(path + dir[i].entry);
    else if(dir[i].entry !== "." && dir[i].entry !== "..") {
      await forceRemoveDirectory(path + "/" + dir[i].entry);
    }
  }

  await Neutralino.filesystem.removeDirectory(path);

}

var index, activePackage = -1;
async function loadCards() {

  const r = Math.floor(Math.random() * 1000); // Prevent caching
  let response = await fetch("https://p2r3.com/spplice/packages/index.php?r=" + r);

  if(response.ok) {
    index = await response.json();
  } else {
    document.getElementById("cardlist").innerHTML = `
      <h1 class="center-text">Failed to connect to Spplice server</h1>
      <p class="center-text"><i>Response status: ${response.status}</i></p>
    `;
  }

  // Check for local packages
  try { await Neutralino.filesystem.readDirectory(`${NL_PATH}/custom`) }
  catch (e) { await Neutralino.filesystem.createDirectory(`${NL_PATH}/custom`) }
  var customDir = await Neutralino.filesystem.readDirectory(`${NL_PATH}/custom`);

  // Unarchive packages
  for(let i = 0; i < customDir.length; i++) {
    const curr = customDir[i];
    if(curr.entry === "." || curr.entry === "..") continue;
    if(curr.type === "FILE" && curr.entry.endsWith(".tar.gz")) {
      await Neutralino.os.execCommand(`tar -xzf "${NL_PATH}/custom/${curr.entry}" -C "${NL_PATH}/custom/"`);
      await Neutralino.filesystem.removeFile(`${NL_PATH}/custom/${curr.entry}`);
    }
  }

  // Add to package index
  customDir = await Neutralino.filesystem.readDirectory(`${NL_PATH}/custom`);
  for(let i = 0; i < customDir.length; i++) {
    const curr = customDir[i];
    if(curr.entry === "." || curr.entry === "..") continue;
    if(curr.type === "DIRECTORY") {
      const manifest = JSON.parse(await Neutralino.filesystem.readFile(`${NL_PATH}/custom/${curr.entry}/manifest.json`));
      manifest.local = true;
      index.packages[index.packages.length] = manifest;
    }
  }

  for(let i = 0; i < index.packages.length; i++) {

    const curr = index.packages[i];
    let name = curr.name;
    let title = curr.title;

    var image;
    if(("local" in curr) && curr.local) {
      const base64 = arrayBufferToBase64(await Neutralino.filesystem.readBinaryFile(`${NL_PATH}/custom/${curr.name}/${curr.icon}`));
      image = `data:image/png;base64,${base64}`;
    } else {
      image = `https://p2r3.com/spplice/packages/${name}/${curr.icon}?r=${r}`;
    }

    document.getElementById("cardlist").innerHTML += `
      <div class="card" style="background-image: url('${image}')" onclick="showInfo(${i})">
        <p class="card-title">${title}</p>
      </div>
    `;

  }

}

function showInfo(packageID) {

  const div = document.getElementById("modinfo");
  const title = document.getElementById("modinfo-title");
  const description = document.getElementById("modinfo-description");
  const button = document.getElementById("modinfo-button");

  title.innerHTML = index.packages[packageID].title;
  description.innerHTML = index.packages[packageID].description.replace(/\n/g, "<br>");
  button.onclick = function() { launchMod(packageID) };

  if(packageID === activePackage) {
    button.innerHTML = "Installed";
    button.style.pointerEvents = "none";
    button.style.color = "#424242";
  } else {
    button.innerHTML = "Install and launch";
    button.style.pointerEvents = "auto";
    button.style.color = "#faa81a";
  }

  div.style.opacity = 1;
  div.style.transform = "translateY(0)";
  div.style.setProperty("backdrop-filter", "blur(5px)");
  div.style.setProperty("-webkit-backdrop-filter", "blur(5px)");
  div.style.pointerEvents = "auto";

}

function hideInfo() {

  const div = document.getElementById("modinfo");
  const button = document.getElementById("modinfo-button");

  button.onclick = function() { };
  button.style.pointerEvents = "none";

  div.style.opacity = 0;
  div.style.transform = "translateY(5vh)";
  div.style.setProperty("backdrop-filter", "blur(0px)");
  div.style.setProperty("-webkit-backdrop-filter", "blur(0px)");
  div.style.pointerEvents = "none";

}

function setActivePackage(packageID) {

  if(activePackage >= 0) {
    const title = document.getElementsByClassName("card-title")[activePackage];
    title.style.color = "#fff";
  }

  if(packageID >= 0) {
    const title = document.getElementsByClassName("card-title")[packageID];
    title.style.color = "#faa81a";

    const clear = document.getElementById("spplice-clear");
    clear.style.pointerEvents = "auto";
    clear.style.opacity = 1;
  } else {
    const clear = document.getElementById("spplice-clear");
    clear.style.pointerEvents = "none";
    clear.style.opacity = 0;
  }

  activePackage = packageID;

}

var statusTextTimeout = null;
function setStatusText(text, hide) {

  if(typeof hide === "undefined") hide = false;

  console.log(text);
  let element = document.getElementById("pplaunch-status");
  element.style.opacity = 1;
  element.innerHTML = text;

  if(hide) {
    clearTimeout(statusTextTimeout);
    statusTextTimeout = setTimeout(function() {
      element.style.opacity = 0;
    }, 5000);
  }

}