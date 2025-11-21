# AccSsS Denied

A browser extension focusing on ad blocking and privacy. Comes directly shipped with this executable, which is a modified Firefox browser.

## Using

Access setting via the extensions panel on the top right. A dashboard is presented with various settings, primary is the ad blocking. This button sends a signal to the background script handling the ad blocking and tracking.

The HTTP Observatory is Mozilla's API to check the security of a website, because it is rate-limited, as the user if they wish to explicitly use this API. There is another background API which automatically determines the validity of the website the user is currently trying to visit.

## How tu run

You may load the extension temporarily by going to `about:debugging`, `This Nightly` or `This Firefox` and select load temporary addon. This will prompt an explorer window, select any file form the extension to load. The extension is now active.

## Run locally

If you'd like to modify the Firefox source code, like I did, follow [this guide](https://firefox-source-docs.mozilla.org/contributing/contribution_quickref.html) to get Mozilla Firefox ready to build locally. Clone this repository in the `browser/extension` folder and also include it in the `moz.build` file. Running `mach run` will now run the browser with our extension.

## Notes

The `dist` folder contains transpiled javascript from the `node_modules` and the `src` folder, with the actual (simple/readable) Javascript.

Run

```sh
npm install
```

to get all dependencies and

```sh
npm run build
```

to transpile the code. (In case you've made changes to the `src` folder.)