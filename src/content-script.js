async function call_IPQUALITY(url) {
    const response = await fetch(`https://www.ipqualityscore.com/api/json/url/6GrtlrYBx9VquoaQZWd37HyjGvpXOImx/${url}`);
    const data = await response.json();

    console.log("AccUsS Denied: ", data);
    console.log("Sending to background service");

    browser.runtime.sendMessage(data);

    if (data.unsafe == true) {
        alert(`The website you are trying to visit (${data.domain}) is known to be unsafe. It is recommended you close it.`)
    } else {
        console.log(`${data.domain} appears safe.`)
    }

    // console.log(data.root_domain);
}

call_IPQUALITY(window.location.hostname);