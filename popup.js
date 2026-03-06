(function () {
    var api = typeof browser !== 'undefined' ? browser : chrome;

    function sendMessageToContentScript(message, callback) {
        api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            api.tabs.sendMessage(tabs[0].id, message, function (response) {
                if (callback) callback(response);
            });
        });
    }

    function downloadFile(url, filename) {
        if (api.downloads && api.downloads.download) {
            api.downloads.download({ url: url, filename: filename });
        } else {
            api.tabs.create({ url: url });
        }
    }

    sendMessageToContentScript({ cmd: 'test', value: 'test' }, function (videoType) {
        if (videoType == null) return;

        var boxEl = document.getElementsByTagName('ul')[0];
        var videoStr = '';
        videoType.forEach(function (item) {
            videoStr += '<li> <label>清晰度：<span> ' + item.key + ' </span> </label> <button class="button down">下载</button> <button class="button copy">复制</button></li>';
        });
        boxEl.innerHTML = videoStr;

        var dialog = document.getElementsByTagName('dialog')[0];
        var dialog1 = document.getElementsByTagName('dialog')[1];

        var downList = document.querySelectorAll('.down');
        downList.forEach(function (item, index) {
            item.onclick = function () {
                var reg = /[~.:/*?"|\\\<>]/g;
                downloadFile(
                    videoType[index].val,
                    videoType[index].video_title.replace(reg, '') + '.mp4'
                );
                dialog1.showModal();
                setTimeout(function () { dialog1.close(); }, 2000);
            };
        });

        var copyList = document.querySelectorAll('.copy');
        copyList.forEach(function (item, index) {
            item.onclick = function () {
                var url = videoType[index].val;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(function () {
                        dialog.showModal();
                        setTimeout(function () { dialog.close(); }, 1500);
                    });
                } else {
                    var oInput = document.createElement('input');
                    oInput.value = url;
                    document.body.appendChild(oInput);
                    oInput.select();
                    document.execCommand('Copy');
                    oInput.style.display = 'none';
                    dialog.showModal();
                    setTimeout(function () { dialog.close(); }, 1500);
                }
            };
        });
    });
})();
