(function () {
    var api = typeof browser !== 'undefined' ? browser : chrome;

    function extractPornhubData() {
        return new Promise(function (resolve) {
            var handler = function (event) {
                if (event.source !== window || !event.data || event.data.type !== '__PXD_DATA__') return;
                window.removeEventListener('message', handler);
                resolve(event.data.payload);
            };
            window.addEventListener('message', handler);

            // Inject into page context to access flashvars_* variables directly,
            // avoiding eval() which Safari's extension CSP may block.
            var s = document.createElement('script');
            s.textContent = '(' + function () {
                try {
                    var keys = Object.keys(window).filter(function (k) { return /^flashvars_\d+$/.test(k); });
                    if (keys.length) {
                        var fv = window[keys[0]];
                        window.postMessage({
                            type: '__PXD_DATA__',
                            payload: {
                                video_title: fv.video_title || '',
                                mediaDefinitions: (fv.mediaDefinitions || []).map(function (d) {
                                    return { quality: d.quality, format: d.format, videoUrl: d.videoUrl };
                                })
                            }
                        }, '*');
                    } else {
                        window.postMessage({ type: '__PXD_DATA__', payload: null }, '*');
                    }
                } catch (e) {
                    window.postMessage({ type: '__PXD_DATA__', payload: null }, '*');
                }
            } + ')();';
            document.documentElement.appendChild(s);
            s.remove();
        });
    }

    function getMp4Url(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = function () {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(xhr.statusText);
                }
            };
            xhr.onerror = function () { reject('Network error'); };
            xhr.send();
        });
    }

    function extractXvideosData() {
        var el = document.querySelector('#video-player-bg > script:nth-child(6)');
        if (!el) return null;
        var text = el.innerHTML;
        var videoType = [];
        var titleMatch = text.match(/setVideoTitle\('(.*?)'\);/);
        if (!titleMatch) return null;
        var title = titleMatch[1];

        var lowMatch = text.match(/setVideoUrlLow\('(.*?)'\);/);
        if (lowMatch && lowMatch[1]) {
            videoType.push({ key: 'Low', val: lowMatch[1], video_title: title });
        }
        var highMatch = text.match(/setVideoUrlHigh\('(.*?)'\);/);
        if (highMatch && highMatch[1]) {
            videoType.push({ key: 'High', val: highMatch[1], video_title: title });
        }
        return videoType.length > 0 ? videoType : null;
    }

    function registerListener(videoType) {
        api.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.cmd === 'test') sendResponse(videoType);
        });
    }

    var currentUrl = window.location.href;

    if (currentUrl.includes('xvideos.com')) {
        var data = extractXvideosData();
        if (data) registerListener(data);
    } else {
        extractPornhubData().then(function (res) {
            if (!res || !res.mediaDefinitions) return;

            var videoType = [];
            var promises = [];

            res.mediaDefinitions.forEach(function (item) {
                if (item.format === 'mp4' && item.videoUrl) {
                    promises.push(
                        getMp4Url(item.videoUrl)
                            .then(function (mp4List) {
                                mp4List.forEach(function (mp4) {
                                    videoType.push({
                                        key: mp4.quality,
                                        val: mp4.videoUrl,
                                        video_title: res.video_title
                                    });
                                });
                            })
                            .catch(function () { })
                    );
                }
            });

            Promise.all(promises).then(function () {
                registerListener(videoType);
            });
        });
    }
})();
