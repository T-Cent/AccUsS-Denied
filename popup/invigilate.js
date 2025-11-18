const observatory_button = document.getElementById("observatory");
const unsafe_button = document.getElementById("unsafe");

browser.tabs.query({ active: true, currentWindow: true })
  .then((tabs) => {
    const currentTab = tabs[0];
    console.log("Current URL (from popup):", currentTab.url);
  })
  .catch((error) => {
    console.error(error);
  });

unsafe_button.onclick = e => {
    const mail = 'mailto:nobody@iiitd.ac.in?subject=Report%20unsafe%20site&body=I%20found%20an%20unsafe%20site%20at%20' + encodeURIComponent(location.href || '');
    window.open(mail, '_blank');
}