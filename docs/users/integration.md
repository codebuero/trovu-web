# Use Trovu on your device

## Desktop web browser

### Firefox

![Screenshot](img/firefox.png)

1.  Open [trovu.net](https://trovu.net/), either [with your GitHub username](advanced.md) or without:
    -   `https://trovu.net/?#github=YOUR_GITHUB_USERNAME`, or
    -   `https://trovu.net/?#country=gb&language=en`. (adjust to your country & language)
1.  In the **browser address bar**, right-click.
1.  Select **Add "Trovu"**. It is the last item.
1.  Open a [new tab](about:blank) with the URL:

        about:preferences#search

1.  Under **Default Search Engine**, select _Trovu_.

### Chrome

1.  Open [trovu.net](https://trovu.net/), either [with your GitHub username](advanced.md) or without:
    -   `https://trovu.net/?#github=YOUR_GITHUB_USERNAME`, or
    -   `https://trovu.net/?#country=gb&language=en`. (adjust to your country & language)
1.  Open a [new tab](about:blank) with the URL:

        chrome://settings/searchEngines

1.  There, right to **Manage search engines** is a search field. Search for _Trovu_.
1.  When found, click the 3 dots right to it.
1.  Select **Make default**.

### Other

Use one of these URL templates and add it where your browser allows to set custom browser search engines:

    https://trovu.net/process/?#country=gb&language=en&query=%s
    https://trovu.net/process/?#github=YOUR_GITHUB_USERNAME&query=%s

(Note the `process/` part in the URL! You may need to adjust your `country`, `language` or `github` parameter.)

## Android

### SearchBar Ex - Search Widget

This a free, generic app to search any search engine that supports URL with a `%s` placeholder.

1. With your Android device, [visit the app in the Play store](https://play.google.com/store/apps/details?id=com.devhomc.search)
1. Install it on your device.
1. Open the app.
1. Left to the search input, click on the icon.
1. At the botton, click **+ Add**
1. Select **Search**
1. Select **Custom Search**
1. For _name_, enter "Trovu"
1. For _URL_, enter a URL template like in [Browser / other](#other).
1. Click the back button of the app in the upper left corner

Now, you can enter Trovu queries which will be redirected to your browser.

### Firefox for Android

Firefox allows adding custom search engines: Any URL with a `%s` placeholder works.

1. Tap on the address bar
1. Tap on _🔍 Search engine_
1. Tap on _⚙️ Search engine settings_
1. Tap on _➕ Add search engine_
1. Tap on Other
1. Enter a name, e.g. `Trovu`
1. Enter the template URL, like for [Other](#other)
1. Tap on ✔ (in the upper right corner)

Here is an example setting for the user `georgjaehnig`:

![Screenshot](img/chrome.png)
